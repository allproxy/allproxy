import url from 'url';
import http2, { Http2ServerRequest, Http2ServerResponse } from 'http2';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import HttpMessage from './HttpMessage';
import HexFormatter from './formatters/HexFormatter';
import Paths from './Paths';
import fs from 'fs';
import listen from './Listen';
import decompressResponse from './DecompressResponse';
import protobuf from 'protobufjs'
import path from 'path';

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

      let protoMessageNames: string[]|null = null;
      const urlPath = reqUrl.path || "";
      const parts = GrpcProxy.parsePath(urlPath);
      if (parts.packageName.length > 0 && parts.service.length > 0 && parts.method.length > 0) {
        protoMessageNames = GrpcProxy.getMessageNames(parts.packageName, parts.service, parts.method);
      }
      const requestBodyPromise = getReqBody(clientReq, protoMessageNames ? protoMessageNames[0] : null);

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
            const resBody = await getResBody(headers, chunks, protoMessageNames ? protoMessageNames[1] : null);
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

      async function getReqBody (clientReq: Http2ServerRequest, protoMessageName: string|null): Promise<string | {}> {
        return new Promise<string|{}>((resolve) => {
          // eslint-disable-next-line no-unreachable
          let buffer: Buffer;
          clientReq.on('data', function (chunk: Buffer) {
            if(buffer) {
              buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
            } else {
              buffer = chunk;
            }
          });
          // eslint-disable-next-line no-unreachable
          clientReq.on('end', async function () {
            if (protoMessageName) {              
              const json = await GrpcProxy.decodeProtobuf(parts.packageName, protoMessageName, buffer);
              if (json) resolve(json);
            }          
            resolve(HexFormatter.format(buffer));
          });            
        })        
      }

      async function getResBody (headers: {}, chunks: Buffer[], protoMessageName: string|null): Promise<object | string> {
        if (chunks.length === 0) return '';
        let resBuffer = chunks.reduce(
          (prevChunk, chunk) => Buffer.concat([prevChunk, chunk], prevChunk.length + chunk.length)
        );
        resBuffer = decompressResponse(headers, resBuffer);
        if (protoMessageName) {          
          const json = await GrpcProxy.decodeProtobuf(parts.packageName, protoMessageName, resBuffer);
          if (json) return json;
        }  
        return HexFormatter.format(resBuffer);
      }
    }

    return port;
  }  

  static parsePath(path: string): {[key:string]:string} {
    let parts: {[key:string]:string} = {};
    const segments = path.split('/')
    if (segments.length === 3) {
      const tokens = segments[1].split('.');      
      parts.packageName = tokens[0];
      if (tokens.length > 1) {
        parts.service = tokens[1];
      }
      parts.method = segments[2];
    }
    return parts;
  }

  // rpc Bauthz (AuthzRequest)  returns (AuthzResponse){}
  static getMessageNames(packageName: string, service: string, method: string): string[]|null {
    const messageNames: string[] = [];
    const protoFile = path.join(Paths.protoDir(), packageName+'.proto');    
    if (fs.existsSync(protoFile)) {      
      const lines = fs.readFileSync(protoFile).toString().split('\n');      
      let foundService = false;
      for (let line of lines) {  
        line = line.trim();        
        if (!foundService) {
          if (line.startsWith('service '+service+'{')) foundService = true;
        } else {
          if (line === '}') {
            return null;
          }
          if (line.startsWith('rpc '+ method+ ' (')) {
            let j = line.indexOf('(') + 1;
            for(let i = j; i < line.length; ++i) {              
              const c = line.substring(i,i+1);
              if (c === ')') {
                const messageName = line.substring(j,i);                
                messageNames.push(messageName);
                if (messageNames.length === 2) return messageNames;                
                i += line.substring(i).indexOf('(');  
                j = i + 1;              
              }
            }
            return null; // only found 1 message name
          }
        }
      }
    }  
    return null;   
  }

  static async decodeProtobuf(packageName: string, messageName: string, buffer: Buffer): Promise<{}|undefined> {
    const message = buffer.subarray(5);
    const root = await protobuf.load(path.join(Paths.protoDir(), packageName+'.proto'));
    const protobufType = root.lookupType(`${packageName}.${messageName}`);
    const err = protobufType.verify(message);    
    if (err) {
      console.log(err);
      return undefined;
    }
    
    try {
      const decodedMessage = protobufType.decode(message);
      return protobufType.toObject(decodedMessage);
    } catch(e) {
      console.log(e);
      return undefined;
    }
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig._server) {
      Global.log('GrpcProxy destructor ', proxyConfig.path);
      proxyConfig._server.close();
    }
  }
}
