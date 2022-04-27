import url from 'url';
import http, { IncomingMessage } from 'http';
import https from 'https';
import Global from './Global';
import ProxyConfig, { ConfigProtocol } from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import querystring from 'querystring';
import AllProxyApp from './AllProxyApp';
import listen from './Listen';
const decompressResponse = require('decompress-response');

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

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class Http1Server {
  public static async start (port: number, host?: string): Promise<number> {
    const server = http.createServer((clientReq, clientRes) => Http1Server.onRequest(clientReq, clientRes));
    server.keepAliveTimeout = 0;

    const listenPort = await listen('Http1Server', server, port, host);
    Global.socketIoManager.addHttpServer(server);
    return listenPort;
  }

  static async onRequest (clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

    // Request is from AllProxy app?
    if (AllProxyApp(clientReq, clientRes, reqUrl)) {
      return;
    }

    const sequenceNumber = Global.nextSequenceNumber();
    const remoteAddress = clientReq.socket.remoteAddress;

    Global.log(sequenceNumber, clientReq.url)

    // Find matching proxy configuration
    const clientHostName = await Global.resolveIp(clientReq.socket.remoteAddress);
    const proxyType = reqUrl.protocol ? 'forward' : 'reverse';
    let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('http:', clientHostName, reqUrl, proxyType);
    // Always proxy forward proxy requests
    if (proxyConfig === undefined && reqUrl.protocol !== null) {
      proxyConfig = new ProxyConfig();
      proxyConfig.path = reqUrl.pathname!;
      proxyConfig.protocol = reqUrl.protocol as ConfigProtocol;
      proxyConfig.hostname = reqUrl.hostname!;
      proxyConfig.port = reqUrl.port === null
        ? reqUrl.protocol === 'http:' ? 80 : 443
        : +reqUrl.port;
    }

    const httpMessage = new HttpMessage(
      'http:',
      proxyConfig,
      sequenceNumber,
        remoteAddress!,
        clientReq.method!,
        clientReq.url!,
        clientReq.headers
    );

    const requestBodyPromise = getReqBody(clientReq);

    if (proxyConfig === undefined) {
      const requestBody = await requestBodyPromise;
      const error = 'No matching proxy configuration found for ' + reqUrl.pathname;
      if (reqUrl.pathname === '/') {
        clientRes.writeHead(302, { Location: reqUrl.href + 'allproxy' });
        clientRes.end();
      } else {
        httpMessage.emitMessageToBrowser(requestBody, 404, {}, { error });
      }
    } else {
      httpMessage.emitMessageToBrowser(''); // No request body received yet
      proxyRequest(proxyConfig, requestBodyPromise);
    }

    function proxyRequest (proxyConfig: ProxyConfig, requestBodyPromise: Promise<string | {}>) {
      clientReq.on('close', function () {
        // sendErrorResponse(499, "Client closed connection", undefined, proxyConfig.path);
      });

      clientReq.on('error', function (error) {
        console.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2));
      });

      let method = clientReq.method;

      const headers = clientReq.headers;
      if (proxyConfig.port) headers.host += ':' + proxyConfig.port;

      let { protocol, hostname, port } = proxyConfig.protocol === 'browser:'
        ? reqUrl
        : proxyConfig;
      if (port === undefined) {
        port = proxyConfig.protocol === 'https:' ? 443 : 80;
      }

      headers.host = hostname! + ':' + port;

      const options = {
        protocol,
        hostname,
        port,
        path: clientReq.url,
        method,
        headers,
        agent: new http.Agent({ keepAlive: false }),
      };

      let proxy;
      if (options.protocol === 'https:') {
        proxy = https.request(options, handleResponse);
      } else {
        proxy = http.request(options, handleResponse);
      }

      async function handleResponse (proxyRes: http.IncomingMessage) {
        const requestBody = await requestBodyPromise;

        /**
         * Forward the response back to the client
         */
        for(let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
          const key = proxyRes.rawHeaders[i];
          if(hopHeaders.indexOf(key) !== -1) continue;
          const value = proxyRes.rawHeaders[i+1];
          clientRes.setHeader(key, value);
        }
        if ((clientReq.method === 'DELETE' || clientReq.method === 'PUT') && proxyRes.statusCode && proxyRes.statusCode < 400) {
          clientRes.removeHeader('Connection'); // Don't send keepalive
        }

        clientRes.writeHead((proxyRes as any).statusCode, proxyRes.statusMessage);
        proxyRes.pipe(clientRes, {
          end: true
        });

        const resBody = await getResBody(proxyRes);
        httpMessage.emitMessageToBrowser(requestBody, proxyRes.statusCode, clientRes.getHeaders(), resBody);
      }

      proxy.on('error', async function (error) {
        console.error(sequenceNumber, 'Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig);
        const requestBody = await requestBodyPromise;
        httpMessage.emitMessageToBrowser(requestBody, 404, {}, { error, 'allproxy-config': proxyConfig });
      });

      clientReq.pipe(proxy, {
        end: true
      });
    }

    function getReqBody (clientReq: IncomingMessage): Promise<string | {}> {
      return new Promise<string | {}>(resolve => {
        let requestBody: string | {} = '';
        clientReq.setEncoding('utf8');
        let rawData = '';
        clientReq.on('data', function (chunk) {
          rawData += chunk;
        });
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

    function getResBody (proxyRes: any): Promise<object | string> {
      return new Promise<string | {}>(resolve => {
        if (proxyRes.headers) {
          if (proxyRes.headers['content-encoding']) {
            proxyRes = decompressResponse(proxyRes);
          }

          if (proxyRes.headers['content-type'] &&
              proxyRes.headers['content-type'].indexOf('utf-8') !== -1) {
            proxyRes.setEncoding('utf8');
          }
        }

        let rawData = '';
        proxyRes.on('data', function (chunk: string) {
          rawData += chunk;
        });
        let parsedData = '';
        proxyRes.on('end', () => {
          try {
            parsedData = JSON.parse(rawData); // assume JSON
          } catch (e) {
            parsedData = rawData;
          }
          resolve(parsedData);
        });
      });
    }
  }
}
