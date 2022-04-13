import url, { UrlWithStringQuery } from 'url';
import http, { IncomingMessage } from 'http';
import https from 'https';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import querystring from 'querystring';
import listen from './Listen';
import { AddressInfo } from 'net';
import generateCertKey from './GenerateCertKey';
import decompressResponse from './DecompressResponse';
import replaceResponse from './ReplaceResponse';

type ProxyType = 'forward' | 'reverse';

export default class Https1Server {
  private proxyType: ProxyType = 'forward';
  private hostname: string;
  private port = 443;
  private ephemeralPort = 0;
  private server: https.Server | null = null;

  private resolvePromise: (result: number) => void = () => 1;
  private promise: Promise<number> = new Promise((resolve) => {
    this.resolvePromise = resolve;
  });

  constructor (hostname: string, port: number, proxyType: ProxyType) {
    this.proxyType = proxyType;
    this.hostname = hostname;
    this.port = port;
  }

  destructor () {
    this.server && this.server.close();
  }

  public async start () {
    const certKey = await generateCertKey(this.hostname);
    this.server = https.createServer(
      certKey,
      this.onRequest.bind(this)
    );

    await listen('Https1Server', this.server, 0); // assign port number
    this.ephemeralPort = (this.server.address() as AddressInfo).port;
    this.resolvePromise(0);
  }

  public async waitForServerToStart () {
    await this.promise;
  }

  public getEphemeralPort () {
    return this.ephemeralPort;
  }

  private async onRequest (clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    clientReq.on('error', function (error) {
      console.error(sequenceNumber, 'Https1Server clientReq error', JSON.stringify(error, null, 2));
    });

    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

    console.log('Https1Server onRequest', reqUrl.path);

    const clientHostName = await Global.resolveIp(clientReq.socket.remoteAddress);
    const sequenceNumber = ++Global.nextSequenceNumber;
    const remoteAddress = clientReq.socket.remoteAddress;
    let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl, this.proxyType);
    // Always proxy forward proxy requests
    if (proxyConfig === undefined && this.proxyType === 'forward') {
      proxyConfig = new ProxyConfig();
      proxyConfig.path = reqUrl.pathname!;
      proxyConfig.protocol = 'https:';
      proxyConfig.hostname = this.hostname;
      proxyConfig.port = this.port;
      proxyConfig.isSecure = true;
    };

    // URLs for requests proxied from terminal (e.g., https_proxy=localhost:8888) do not include schema and hostname
    let urlWithHostname = clientReq.url!;
    if (this.proxyType === 'forward' && urlWithHostname.startsWith('/')) {
      urlWithHostname = "https://" + this.hostname + urlWithHostname;
    }

    const httpMessage = new HttpMessage(
      'https:',
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

    function getReqBody (clientReq: IncomingMessage): Promise<string | {}> {
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

  private async proxyRequest (
    reqUrl: UrlWithStringQuery,
    clientReq: IncomingMessage,
    clientRes: http.ServerResponse,
    httpMessage: HttpMessage,
    proxyConfig: ProxyConfig,
    requestBodyPromise: Promise<string | {}>
  ) {
    const headers = clientReq.headers;
    const options = {
      protocol: 'https:',
      hostname: this.proxyType === 'forward' ? this.hostname : proxyConfig.hostname,
      port: this.port,
      path: clientReq.url,
      method: clientReq.method,
      headers
    };

    let replaceRes: Buffer | null = null;
    if (reqUrl.pathname) {
      replaceRes = replaceResponse(reqUrl.pathname);
    }

    Global.log('Https1Server https.request', options);
    let retryCount = 0;
    const MAX_RETRIES = 5;
    proxyRequest();

    function proxyRequest () {
      const proxyReq = https.request(options, handleResponse);

      proxyReq.on('error', async function (error: {[key:string]: string}) {
        proxyReq.destroy();
        if (error.code === 'EAI_AGAIN' && retryCount++ < MAX_RETRIES) {
          console.log(`Retry ${retryCount} for ${options.hostname}`);
          setTimeout(proxyRequest, retryCount * 1000);
        } else {
          console.error('Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig);
          const requestBody = await requestBodyPromise;
          httpMessage.emitMessageToBrowser(requestBody, 404, {}, { error, 'allproxy-config': proxyConfig });
        }
      });

      clientReq.pipe(proxyReq, {
        end: true
      });
    }

    async function handleResponse (proxyRes: http.IncomingMessage) {
      
      clientRes.writeHead((proxyRes as any).statusCode, proxyRes.headers);

      const chunks: Buffer[] = [];

      /**
       * Forward the response back to the client
       */
      proxyRes.on('data', function (chunk: Buffer) {
        if (!replaceRes) {
          clientRes.write(chunk);
          chunks.push(chunk);
        }
      });

      proxyRes.on('end', async () => {
        if (replaceRes) {
          clientRes.write(replaceRes);
        }

        clientRes.end();

        const requestBody = await requestBodyPromise;

        let resBody;
        if (replaceRes) {
          proxyRes.headers['allproxy-replaced-response'] = 'yes';
          resBody = replaceRes.toString();
        } else {
          resBody = getResBody(proxyRes.headers, chunks);
        }
        httpMessage.emitMessageToBrowser(requestBody, proxyRes.statusCode, proxyRes.headers, resBody);
      });
    }
  }
}

function getResBody (headers: {}, chunks: Buffer[]): object | string {
  if (chunks.length === 0) return '';
  let resBuffer = chunks.reduce(
    (prevChunk, chunk) => Buffer.concat([prevChunk, chunk], prevChunk.length + chunk.length)
  );
  resBuffer = decompressResponse(headers, resBuffer);
  const resString = resBuffer.toString();
  let resBody = '';
  try {
    resBody = JSON.parse(resString); // assume JSON
  } catch (e) {
    resBody = resString;
  }

  return resBody;
}
