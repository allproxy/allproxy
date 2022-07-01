import url from 'url';
import http2, { Http2ServerRequest, Http2ServerResponse } from 'http2';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import HexFormatter from './formatters/HexFormatter';
import listen from './Listen';
import { decompressResponse } from './Zlib';
import { decodeProtobuf, getProtoNames } from './Protobuf';
import generateCertKey from './GenerateCertKey';
import ConsoleLog from './ConsoleLog';

const settings = { maxConcurrentStreams: undefined };

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class GrpcProxy {
  public static async forwardProxy(port: number, isSecure: boolean = false): Promise<number> {
    const proxyConfig = new ProxyConfig();
    proxyConfig.isSecure = isSecure;
    proxyConfig.protocol = 'grpc:';
    proxyConfig.path = port.toString();
    return GrpcProxy.start(proxyConfig, true);
  }

  public static async reverseProxy(proxyConfig: ProxyConfig): Promise<number> {
    return GrpcProxy.start(proxyConfig);
  }

  private static async start(proxyConfig: ProxyConfig, isForwardProxy = false): Promise<number> {
    const server = proxyConfig.isSecure
      ? http2.createSecureServer({
        settings,
        ...await generateCertKey(proxyConfig.hostname)
      })
      : http2.createServer({
        settings
      });

    if (!isForwardProxy) {
      proxyConfig._server = server;
    }

    let port = await listen('GrpcProxy', server, +proxyConfig.path);
    proxyConfig.path = port + '';  // update port

    server.on('error', (e) => ConsoleLog.info('GrpcProxy error:', e))

    server.on('request', onRequest);

    async function onRequest(clientReq: Http2ServerRequest, clientRes: Http2ServerResponse) {
      // eslint-disable-next-line node/no-deprecated-api
      const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

      ConsoleLog.info('GRPC:' + clientReq.method + ' ' + clientReq.url)
      ConsoleLog.debug('GrpcProxy onRequest', reqUrl.path);

      const sequenceNumber = Global.nextSequenceNumber();
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

      const urlPath = reqUrl.path || "";
      let protoNames = getProtoNames(urlPath);
      const protoFile = protoNames ? protoNames[0] : "";

      const requestBodyPromise = getReqBody(clientReq, protoFile, protoNames ? protoNames[1] : null);

      httpMessage.emitMessageToBrowser(''); // No request body received yet
      proxyRequest(proxyConfig!, requestBodyPromise);

      function proxyRequest(proxyConfig: ProxyConfig, requestBodyPromise: Promise<string | {}>) {
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
        let trailers: { [key: string]: any } = {};
        const proxyStream = proxyClient.request(headers);
        let needToSendTrailers = false;

        proxyStream.on('trailers', (headers, _flags) => {
          ConsoleLog.debug('GrpcProxy on trailers', headers);
          clientRes.addTrailers(headers);
          trailers = headers;
        });

        proxyStream.on('response', (headers, flags) => {
          ConsoleLog.debug('GrpcProxy on response', clientReq.url, headers, 'flags:', flags);
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
            ConsoleLog.debug('GrpcProxy end of response received');
            if (needToSendTrailers) {
              clientRes.addTrailers(trailers);
            }
            clientRes.end();
            proxyClient.close();

            const requestBody = await requestBodyPromise;

            // chunks.push(headers)
            const resBody = await getResBody(headers, chunks, protoFile, protoNames ? protoNames[2] : null);
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

      async function getReqBody(clientReq: Http2ServerRequest, protoFile: string, protoMessageName: string | null): Promise<string | {}> {
        return new Promise<string | {}>((resolve) => {
          // eslint-disable-next-line no-unreachable
          let buffer: Buffer;
          clientReq.on('data', function (chunk: Buffer) {
            if (buffer) {
              buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
            } else {
              buffer = chunk;
            }
          });
          // eslint-disable-next-line no-unreachable
          clientReq.on('end', async function () {
            if (protoMessageName) {
              const json = await decodeProtobuf(protoFile, GrpcProxy.getPackageName(reqUrl.path), protoMessageName, buffer);
              if (json) resolve(json);
            }
            resolve(HexFormatter.format(buffer));
          });
        })
      }

      async function getResBody(headers: {}, chunks: Buffer[], protoFile: string, protoMessageName: string | null): Promise<object | string> {
        if (chunks.length === 0) return '';
        let resBuffer = chunks.reduce(
          (prevChunk, chunk) => Buffer.concat([prevChunk, chunk], prevChunk.length + chunk.length)
        );
        resBuffer = decompressResponse(headers, resBuffer);
        if (protoMessageName) {
          const json = await decodeProtobuf(protoFile, GrpcProxy.getPackageName(reqUrl.path), protoMessageName, resBuffer);
          if (json) return json;
        }
        return HexFormatter.format(resBuffer);
      }
    }

    return port;
  }

  static getPackageName(path: string | null): string {
    if (path === null) return "";
    const tokens = path.split('/');
    return tokens.length > 1 ? tokens[1].split('.')[0] : "";
  }

  static destructor(proxyConfig: ProxyConfig) {
    if (proxyConfig._server) {
      ConsoleLog.debug('GrpcProxy destructor ', proxyConfig.path);
      proxyConfig._server.close();
    }
  }
}
