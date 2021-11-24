import url from 'url';
import http, { IncomingMessage } from 'http';
import https from 'https';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import querystring from 'querystring';
import listen from './Listen';
import { AddressInfo } from 'net';
import generateCertKey from './GenerateCertKey';
const decompressResponse = require('decompress-response');

const debug = false;
type ProxyType = 'forward' | 'reverse';

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class Https1Server {
  private proxyType: ProxyType = 'forward';
  private hostname: string;
  private port = 0;
  private server: https.Server | null = null;

  private resolvePromise: (result: number) => void = () => 1;
  private promise: Promise<number> = new Promise((resolve) => {
    this.resolvePromise = resolve;
  });

  constructor (hostname: string, proxyType: ProxyType) {
    this.proxyType = proxyType;
    this.hostname = hostname;
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
    this.port = (this.server.address() as AddressInfo).port;

    this.resolvePromise(0);
  }

  public async waitForServerToStart () {
    await this.promise;
  }

  public getPort () {
    return this.port;
  }

  private async onRequest (clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    clientReq.on('error', function (error) {
      console.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2));
    });

    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

    if (debug) console.log('request URL', reqUrl);

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
      proxyConfig.port = 443;
      proxyConfig.isSecure = true;
    };

    const httpMessage = new HttpMessage(
      proxyConfig,
      sequenceNumber,
      remoteAddress!,
      clientReq.method!,
      clientReq.url!,
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

      this.proxyRequest(clientReq, clientRes, httpMessage, proxyConfig!, requestBodyPromise);
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
    clientReq: IncomingMessage,
    clientRes: http.ServerResponse,
    httpMessage: HttpMessage,
    proxyConfig: ProxyConfig,
    requestBodyPromise: Promise<string | {}>
  ) {
    const headers = clientReq.headers;
    const options = {
      protocol: 'https:',
      hostname: this.hostname,
      port: 443,
      path: clientReq.url,
      method: clientReq.method,
      headers
    };

    const proxyReq = https.request(options, handleResponse);

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

    proxyReq.on('error', async function (error) {
      console.error('Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig);
      const requestBody = await requestBodyPromise;
      httpMessage.emitMessageToBrowser(requestBody, 404, {}, { error, 'allproxy-config': proxyConfig });
    });

    clientReq.pipe(proxyReq, {
      end: true
    });
  }
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