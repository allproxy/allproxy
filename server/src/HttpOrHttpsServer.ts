import url, { UrlWithStringQuery } from 'url';
import http, { IncomingMessage } from 'http';
import https from 'https';
import Global from './Global';
import ProxyConfig, { ConfigProtocol } from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import querystring from 'querystring';
import listen from './Listen';
import { AddressInfo } from 'net';
import generateCertKey from './GenerateCertKey';
import { compressResponse, decompressResponse } from './Zlib';
import InterceptJsonResponse from '../../intercept';
import AllProxyApp from './AllProxyApp';
import ConsoleLog from './ConsoleLog';

// Hop-by-hop headers. These are removed when sent to the backend.
// As of RFC 7230, hop-by-hop headers are required to appear in the
// Connection header field. These are the headers defined by the
// obsoleted RFC 2616 (section 13.5.1) and are used for backward
// compatibility.
var hopHeaders = [
  "connection",
  "proxy-connection", // non-standard but still sent by libcurl and rejected by e.g. google
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",      // canonicalized version of "TE"
  "trailer", // not Trailers per URL above; https://www.rfc-editor.org/errata_search.php?eid=4522
  "transfer-encoding",
  "upgrade",
];


type ProxyType = 'forward' | 'reverse';

export default class HttpOrHttpsServer {
  private proxyType: ProxyType = 'forward';
  private reverseProxyHostname: string | null = null;
  private reverseProxyPort: number | null = null;
  private ephemeralPort = 0;
  private server: https.Server | http.Server | null = null;
  private protocol: 'http:' | 'https:';

  private resolvePromise: (result: number) => void = () => 1;
  private promise: Promise<number> = new Promise((resolve) => {
    this.resolvePromise = resolve;
  });

  constructor(proxyType: ProxyType, protocol: 'http:' | 'https:', reverseProxyHostname: string | null = null, reverseProxyPort: number | null = null) {
    this.proxyType = proxyType;
    this.protocol = protocol;
    if (reverseProxyHostname) {
      this.reverseProxyHostname = reverseProxyHostname;
    }
    if (reverseProxyPort) {
      this.reverseProxyPort = reverseProxyPort;
    }
  }

  destructor() {
    this.server && this.server.close();
  }

  public async start(listenPort: number) {
    if (this.protocol === 'https:') {
      const certKey = await generateCertKey(this.reverseProxyHostname!);
      this.server = https.createServer(
        certKey,
        this.onRequest.bind(this)
      );
      Global.socketIoManager.addHttpServer(this.server);
    } else {
      this.server = http.createServer(this.onRequest.bind(this));
      this.server.keepAliveTimeout = 0;

      Global.socketIoManager.addHttpServer(this.server);
    }

    await listen('HttpOrHttpsServer', this.server, listenPort); // assign port number
    this.ephemeralPort = (this.server.address() as AddressInfo).port;
    this.resolvePromise(0);
  }

  public async waitForServerToStart() {
    await this.promise;
  }

  public getEphemeralPort() {
    return this.ephemeralPort;
  }

  private async onRequest(clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    clientReq.on('error', function (error) {
      console.error('HttpOrHttpsServer clientReq error', JSON.stringify(error, null, 2));
    });

    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

    // Request is from AllProxy app?
    if (AllProxyApp(clientReq, clientRes, reqUrl)) {
      return;
    }

    // Proxy is blocked when a public hostname is specified
    if (Global.proxyIsBlocked) {
      console.log('Discarding HTTP request from ' + clientReq.socket?.remoteAddress + ' ' + clientReq.url);
      return;
    }

    ConsoleLog.info('HttpOrHttpsServer onRequest', reqUrl.path);

    const clientHostName = await Global.resolveIp(clientReq.socket.remoteAddress);
    const sequenceNumber = Global.nextSequenceNumber();
    const remoteAddress = clientReq.socket.remoteAddress;
    let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL(this.protocol, clientHostName, reqUrl, this.proxyType);

    // Always proxy forward proxy requests
    if (proxyConfig === undefined) {
      // Forward proxy?
      if (reqUrl.protocol !== null) {
        proxyConfig = new ProxyConfig();
        proxyConfig.path = reqUrl.pathname!;
        proxyConfig.protocol = reqUrl.protocol as ConfigProtocol;
        proxyConfig.hostname = reqUrl.hostname!;
        proxyConfig.port = reqUrl.port === null
          ? reqUrl.protocol === 'http:' ? 80 : 443
          : +reqUrl.port;
      } else if (this.protocol === 'https:' && this.reverseProxyHostname != null) {
        proxyConfig = new ProxyConfig();
        proxyConfig.path = reqUrl.pathname!;
        proxyConfig.protocol = this.protocol;
        proxyConfig.hostname = this.reverseProxyHostname;
        proxyConfig.port = this.reverseProxyPort!;
        proxyConfig.isSecure = true;
      }
    }

    ConsoleLog.debug('HttpOrHttpsServer - ProxyConfig:', proxyConfig);

    // URLs for requests proxied from terminal (e.g., https_proxy=localhost:8888) do not include schema and hostname
    let urlWithHostname = clientReq.url!;
    if (this.proxyType === 'forward' && urlWithHostname.startsWith('/')) {
      urlWithHostname = this.protocol + "//" + this.reverseProxyHostname + urlWithHostname;
    }

    const httpMessage = new HttpMessage(
      this.protocol,
      proxyConfig,
      sequenceNumber,
      remoteAddress!,
      clientReq.method!,
      urlWithHostname,
      clientReq.headers
    );

    if (proxyConfig === undefined) {
      const msg = 'No matching proxy configuration found for ' + reqUrl.pathname;
      clientRes.writeHead(404, msg);
      clientRes.end();
      httpMessage.emitMessageToBrowser(msg);
    } else {
      const requestBodyPromise = getReqBody(clientReq);

      httpMessage.emitMessageToBrowser(''); // No request body received yet

      this.proxyRequest(
        reqUrl,
        clientReq,
        clientRes,
        httpMessage,
        proxyConfig!,
        requestBodyPromise
      );
    }

    function getReqBody(clientReq: IncomingMessage): Promise<string | {}> {
      return new Promise<string | {}>(resolve => {
        // eslint-disable-next-line no-unreachable
        let requestBody: string | {} = '';
        let rawData = '';
        clientReq.on('data', function (chunk) {
          rawData += chunk;
        });
        // eslint-disable-next-line no-unreachable
        clientReq.on('end', async function () {
          try {
            requestBody = JSON.parse(rawData);
          } catch (e) {
            const contentType = clientReq.headers['content-type'];
            if (contentType && contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
              requestBody = querystring.parse(rawData);
            } else {
              requestBody = rawData;
            }
          }
          resolve(requestBody);
        });
      });
    }
  }

  private async proxyRequest(
    reqUrl: UrlWithStringQuery,
    clientReq: IncomingMessage,
    clientRes: http.ServerResponse,
    httpMessage: HttpMessage,
    proxyConfig: ProxyConfig,
    requestBodyPromise: Promise<string | {}>
  ) {
    const headers = clientReq.headers;
    let { hostname, port } = reqUrl.protocol !== null
      ? reqUrl
      : proxyConfig;

    // Override hostname and port?
    if (this.reverseProxyHostname !== null) {
      hostname = this.reverseProxyHostname;
      port = this.reverseProxyPort;
    }

    if (!port) {
      port = this.protocol === 'https:' ? 443 : 80;
    }

    headers.host = hostname! + ':' + port;

    const options = {
      protocol: this.protocol,
      hostname,
      port,
      path: clientReq.url,
      method: clientReq.method,
      headers
    };

    ConsoleLog.debug('HttpOrHttpsServer proxy request options', options);
    let retryCount = 0;
    const MAX_RETRIES = 5;
    doProxy(this.protocol);

    function doProxy(protocol: 'http:' | 'https:') {
      const proxyReq = protocol === 'https:' ? https.request(options, handleResponse) : http.request(options, handleResponse);

      proxyReq.on('error', async function (error: { [key: string]: string }) {
        proxyReq.destroy();
        if (error.code === 'EAI_AGAIN' && retryCount++ < MAX_RETRIES) {
          ConsoleLog.info(`Retry ${retryCount} for ${options.hostname}`);
          setTimeout(doProxy, retryCount * 1000, protocol);
        } else {
          console.error('Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig);
          const requestBody = await requestBodyPromise;
          httpMessage.emitMessageToBrowser(requestBody, 503, {}, { error, 'allproxy-config': proxyConfig });
          clientRes.writeHead(503)
          clientRes.write(JSON.stringify(error))
          clientRes.end()
        }
      });

      clientReq.pipe(proxyReq, {
        end: true
      });
    }

    async function handleResponse(proxyRes: http.IncomingMessage) {
      /**
         * Forward the response back to the client
         */
      for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
        const key = proxyRes.rawHeaders[i];
        if (hopHeaders.indexOf(key) !== -1) continue;
        const value = proxyRes.rawHeaders[i + 1];
        clientRes.setHeader(key, value);
      }
      if ((clientReq.method === 'DELETE' || clientReq.method === 'PUT') && proxyRes.statusCode && proxyRes.statusCode < 400) {
        clientRes.removeHeader('Connection'); // Don't send keepalive
      }
      clientRes.writeHead((proxyRes as any).statusCode, proxyRes.statusMessage);

      const chunks: Buffer[] = [];

      /**
       * Forward the response back to the client
       */
      proxyRes.on('data', function (chunk: Buffer) {
        chunks.push(chunk);
      });

      proxyRes.on('end', async () => {
        const resBody = getResBody(proxyRes.headers, chunks);
        const requestBody = await requestBodyPromise;
        let message = await httpMessage.buildMessage(requestBody, proxyRes.statusCode, proxyRes.headers, resBody);

        if (isApplicationJson(proxyRes.headers)) {

          let modified = false;
          if (Global.socketIoManager.isBreakpointEnabled()) {
            message = await Global.socketIoManager.handleBreakpoint(message);
            modified = message.modified;
          }

          if (typeof message.responseBody === 'object') {
            const newJson = InterceptJsonResponse(clientReq, message.responseBody);
            if (newJson) {
              message.responseBody = newJson;
              modified = true;
            }
          }

          if (modified) {
            ConsoleLog.info('InterceptJsonResponse changed the JSON body');
            let buffer = Buffer.from(JSON.stringify(message.responseBody));
            buffer = compressResponse(proxyRes.headers, buffer);
            chunks.splice(0, chunks.length);
            clientRes.write(buffer);
          }
        }

        // If the response was not modified above, write chunks hear
        for (const chunk of chunks) {
          clientRes.write(chunk);
        }

        clientRes.end();

        httpMessage.emitMessageToBrowser2(message);
      });
    }
  }
}

function isApplicationJson(headers: http.IncomingHttpHeaders): boolean {
  const ct = headers['content-type'];
  if (ct && ct.indexOf('application/json') !== -1) {
    return true;
  }
  return false;
}

function getResBody(headers: http.IncomingHttpHeaders, chunks: Buffer[]): object | string {
  if (chunks.length === 0) return '';
  let resBuffer = Buffer.concat(chunks);
  resBuffer = decompressResponse(headers, resBuffer);
  const resString = resBuffer.toString();
  let resBody: string | object = resString;
  if (isApplicationJson(headers)) {
    try {
      resBody = JSON.parse(resString); // assume JSON
    } catch (e) { }
  }

  return resBody;
}
