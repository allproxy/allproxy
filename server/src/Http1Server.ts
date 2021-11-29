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

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class Http1Server {
  public static async start (port: number, host?: string): Promise<number> {
    const server: any = http.createServer((clientReq, clientRes) => Http1Server.onRequest(clientReq, clientRes));

    const listenPort = await listen('Http1Server', server, port, host);
    Global.socketIoManager.addHttpServer(server);
    return listenPort;
  }

  static async onRequest (clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

    // Request is from AllProxy app?
    if (AllProxyApp(clientRes, reqUrl)) {
      return;
    }

    const sequenceNumber = ++Global.nextSequenceNumber;
    const remoteAddress = clientReq.socket.remoteAddress;

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

      // GET request received with body?
      if (clientReq.method === 'GET' &&
          clientReq.headers['content-length'] && +clientReq.headers['content-length'] > 0) {
        method = 'POST'; // forward request as POST
      }

      const headers = clientReq.headers;
      headers.host = proxyConfig.hostname;
      if (proxyConfig.port) headers.host += ':' + proxyConfig.port;

      let { protocol, hostname, port } = proxyConfig.protocol === 'browser:'
        ? reqUrl
        : proxyConfig;
      if (port === undefined) {
        port = proxyConfig.protocol === 'https:' ? 443 : 80;
      }

      const options = {
        protocol,
        hostname,
        port,
        path: clientReq.url,
        method,
        headers
      };

      let proxy;
      if (options.protocol === 'https:') {
        proxy = https.request(options, handleResponse);
      } else {
        proxy = http.request(options, handleResponse);
      }

      async function handleResponse (proxyRes: http.IncomingMessage) {
        const requestBody = await requestBodyPromise;
        if (
          typeof requestBody === 'object' ||
          (typeof requestBody === 'string' && requestBody.length > 0)
        ) {
          httpMessage.emitMessageToBrowser(requestBody);
        }

        /**
         * Forward the response back to the client
         */
        clientRes.writeHead((proxyRes as any).statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes, {
          end: true
        });

        const resBody = await getResBody(proxyRes);
        httpMessage.emitMessageToBrowser(requestBody, proxyRes.statusCode, proxyRes.headers, resBody);
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
