import url from 'url';
import http2, { Http2ServerRequest, Http2ServerResponse } from 'http2';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import querystring from 'querystring';
import HexFormatter from './formatters/HexFormatter';
import Paths from './Paths';
import fs from 'fs';
import listen from './Listen';
import decompressResponse from './DecompressResponse';

const settings = { maxConcurrentStreams: undefined };

const tlsOptions = {
  key: fs.readFileSync(Paths.serverKey()),
  cert: fs.readFileSync(Paths.serverCrt())
};

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class GrpcProxy {
  public static async forwardProxy (port: number, isSecure: boolean = false): Promise<number> {
    const proxyConfig = new ProxyConfig();
    proxyConfig.isSecure = isSecure;
    proxyConfig.protocol = 'grpc:';
    proxyConfig.path = port.toString();
    return GrpcProxy.start(proxyConfig, true);
  }

  public static async reverseProxy (proxyConfig: ProxyConfig): Promise<number> {
    return GrpcProxy.start(proxyConfig);
  }

  private static async start (proxyConfig: ProxyConfig, isForwardProxy = false): Promise<number> {
    const server = proxyConfig.isSecure
      ? http2.createSecureServer({
        settings,
        ...tlsOptions
      })
      : http2.createServer({
        settings
      });

    if (!isForwardProxy) {
      proxyConfig._server = server;
    }

    let port = await listen('GrpcProxy', server, +proxyConfig.path);
    proxyConfig.path = port+'';  // update port

    server.on('request', onRequest);

    async function onRequest (clientReq: Http2ServerRequest, clientRes: Http2ServerResponse) {
      // eslint-disable-next-line node/no-deprecated-api
      const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

      console.log('GRPC:' + clientReq.method + ' ' + clientReq.url)
      Global.log('GrpcProxy onRequest', reqUrl.path);

      const sequenceNumber = ++Global.nextSequenceNumber;
      const remoteAddress = clientReq.socket.remoteAddress;
      const httpMessage = new HttpMessage(
        proxyConfig.isSecure ? 'https:' : 'http:',
        proxyConfig,
        sequenceNumber,
        remoteAddress!,
        clientReq.method!,
        clientReq.url!,
        clientReq.headers
      );

      const requestBodyPromise = getReqBody(clientReq);

      httpMessage.emitMessageToBrowser(''); // No request body received yet
      proxyRequest(proxyConfig!, requestBodyPromise);

      function proxyRequest (proxyConfig: ProxyConfig, requestBodyPromise: Promise<string | {}>) {
        clientReq.on('error', function (error) {
          console.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2));
        });

        const headers = clientReq.headers;
        let authority = proxyConfig.hostname;
        if (proxyConfig.port) authority += ':' + proxyConfig.port;
        headers[http2.constants.HTTP2_HEADER_AUTHORITY] = authority;

        let { protocol, hostname, port } = isForwardProxy
          ? reqUrl
          : proxyConfig;

        if (!isForwardProxy) {
          protocol = proxyConfig.isSecure ? 'https:' : 'http:';
        }

        if (port === undefined) {
          port = protocol === 'https:' ? 443 : 80;
        }

        const proxyClient = http2.connect(
          `${protocol}//${hostname}:${port}`,
          { settings }
        );

        proxyClient.on('error', async (err) => {
          const requestBody = await requestBodyPromise;
          httpMessage.emitMessageToBrowser(requestBody, 404, {}, { err, 'allproxy-config': proxyConfig });
        });

        const chunks: Buffer[] = [];
        let trailers: {[key:string]: any} = {};
        const proxyStream = proxyClient.request(headers);
        let needToSendTrailers = false;

        proxyStream.on('trailers', (headers, _flags) => {
          Global.log('GrpcProxy on trailers', headers);
          clientRes.addTrailers(headers);
          trailers = headers;
        });

        proxyStream.on('response', (headers, flags) => {
          Global.log('GrpcProxy on response', clientReq.url, headers, 'flags:', flags);
          if (headers['grpc-status']) {
            trailers['grpc-status'] = headers['grpc-status'];
            trailers['grpc-message'] = headers['grpc-message'];
            headers['grpc-status'] = headers['grpc-message'] = undefined;
            needToSendTrailers = true;
          }
          clientRes.stream.respond(headers, { waitForTrailers: true });
          // proxyStream.pipe(clientRes, {
          //   end: true
          // })
          proxyStream.on('data', function (chunk: Buffer) {
            clientRes.write(chunk);
            chunks.push(chunk);
          });

          proxyStream.on('end', async () => {
            Global.log('GrpcProxy end of response received');
            if (needToSendTrailers) {
              clientRes.addTrailers(trailers);
            }
            clientRes.end();
            proxyClient.close();

            const requestBody = await requestBodyPromise;

            // chunks.push(headers)
            const resBody = getResBody(headers, chunks);
            const allHeaders = {
              ...headers,
              ...trailers
            };
            httpMessage.emitMessageToBrowser(requestBody, headers[':status'], allHeaders, resBody);
          });
        });

        // Forward the client request
        clientReq.pipe(proxyStream, {
          end: true
        });
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
            if (proxyConfig.protocol === 'grpc:') {
              requestBody = HexFormatter.format(Buffer.from(requestBody as string, 'utf-8'));
            }
            resolve(requestBody);
          });
        });
      }

      function getResBody (headers: {}, chunks: Buffer[]): object | string {
        if (chunks.length === 0) return '';
        const resBuffer = chunks.reduce(
          (prevChunk, chunk) => Buffer.concat([prevChunk, chunk], prevChunk.length + chunk.length)
        );
        const resString = decompressResponse(headers, resBuffer).toString();
        let resBody = '';
        try {
          resBody = JSON.parse(resString); // assume JSON
        } catch (e) {
          resBody = resString;
        }
        // gRPC is binary data
        if (proxyConfig.protocol === 'grpc:') {
          resBody = HexFormatter.format(Buffer.from(resBody, 'utf-8'));
        }
        return resBody;
      }
    }

    return port;
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig._server) {
      Global.log('GrpcProxy destructor ', proxyConfig.path);
      proxyConfig._server.close();
    }
  }
}
