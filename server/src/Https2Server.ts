import url, { UrlWithStringQuery } from 'url';
import http2, { Http2ServerRequest, Http2ServerResponse } from 'http2';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import querystring from 'querystring';
import listen from './Listen';
import { AddressInfo } from 'net';
import generateCertKey from './GenerateCertKey';
import decompressResponse from './DecompressResponse';
import replaceResponse from './ReplaceResponse';

const debug = false;
type ProxyType = 'forward' | 'reverse';

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class Https2Server {
  private proxyType: ProxyType = 'forward';
  private hostname: string;
  private port = 0;
  private server: http2.Http2SecureServer | null = null;

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
    this.server = http2.createSecureServer(
      {
        allowHTTP1: true,
        ...certKey
      },
      this.onRequest.bind(this)
    );

    await listen('Https2Server', this.server, 0); // assign port number
    this.port = (this.server.address() as AddressInfo).port;

    this.resolvePromise(0);
  }

  public async waitForServerToStart () {
    await this.promise;
  }

  public getPort () {
    return this.port;
  }

  private async onRequest (clientReq: Http2ServerRequest, clientRes: Http2ServerResponse) {
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

      this.proxyRequest(
        reqUrl,
        clientReq,
        clientRes,
        httpMessage,
        proxyConfig!,
        requestBodyPromise);
    }

    function getReqBody (clientReq: Http2ServerRequest): Promise<string | {}> {
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
    clientReq: Http2ServerRequest,
    clientRes: Http2ServerResponse,
    httpMessage: HttpMessage,
    proxyConfig: ProxyConfig,
    requestBodyPromise: Promise<string | {}>
  ) {
    const headers = clientReq.headers;
    const authority = this.hostname + ':443';
    headers[http2.constants.HTTP2_HEADER_AUTHORITY] = authority;
    delete headers.host;
    delete headers.connection;
    delete headers.upgrade;

    const url = `https://${authority}`;
    const clientHttp2Session = http2.connect(url);

    clientHttp2Session.on('error', async (err) => {
      const requestBody = await requestBodyPromise;
      httpMessage.emitMessageToBrowser(requestBody, 404, {}, { err, 'allproxy-config': proxyConfig });
    });

    const chunks: Buffer[] = [];
    let proxyStream: http2.ClientHttp2Stream;
    try {
      proxyStream = clientHttp2Session.request(headers);
    } catch (e) {
      console.log(headers);
      throw e;
    }

    let replaceRes: Buffer | null = null;
    if (reqUrl.pathname) {
      replaceRes = replaceResponse(reqUrl.pathname);
    }

    proxyStream.on('response', (headers, flags) => {
      if (debug) console.log('on response', clientReq.url, headers, 'flags:', flags);
      if (clientRes.stream) {
        clientRes.stream.respond(headers, { waitForTrailers: true });
      }
      proxyStream.on('data', function (chunk: Buffer) {
        if (!replaceRes) {
          clientRes.write(chunk);
          chunks.push(chunk);
        }
      });

      proxyStream.on('end', async () => {
        if (debug) console.log('end of response received');

        if (replaceRes) {
          clientRes.write(replaceRes);
        }

        clientRes.end();
        if (clientHttp2Session) {
          clientHttp2Session.close();
        }

        const requestBody = await requestBodyPromise;

        // chunks.push(headers)
        let resBody;
        if (replaceRes) {
          headers['allproxy-replaced-response'] = 'yes';
          resBody = replaceRes.toString();
        } else {
          resBody = getResBody(headers, chunks);
        }
        httpMessage.emitMessageToBrowser(requestBody, headers[':status'], headers, resBody);
      });
    });

    // Forward the client request
    clientReq.pipe(proxyStream, {
      end: true
    });
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
