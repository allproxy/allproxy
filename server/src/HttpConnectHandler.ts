import http, { IncomingMessage } from 'http';
import Https1Server from './Https1Server';
import Https2Server from './Https2Server';
import listen from './Listen';
import net from 'net';
import Global from './Global';

const https1Servers: {[key:string]:Https1Server} = {};
const https2Servers: {[key:string]:Https2Server} = {};

export enum HttpVersion {
  // eslint-disable-next-line no-unused-vars
  HTTP1 = 1,
  // eslint-disable-next-line no-unused-vars
  HTTP2 = 2
};

let httpVersion: HttpVersion = HttpVersion.HTTP1;
let listenPort = 0;
const httpXSockets: net.Socket[] = [];

export default class HttpConnectHandler {
  public static async doConnect (httpXSocket: net.Socket, data: Buffer) {
    Global.log('HttpConnectHandler doConnect', data.toString());
    const httpConnectSocket = await net.connect(listenPort, 'localhost');

    httpConnectSocket.write(data);
    httpConnectSocket.end();
    httpXSockets.push(httpXSocket);
  }

  /**
   * Continue to listen on deprecated port 9999 for HTTP Connect requests
   */
  private static async deprecated9999Listen () {
    const server = http.createServer();

    server.listen(9999, () => {
      server.on('connect', (clientReq: IncomingMessage, _socket: any, _head: Buffer) => {
        httpXSockets.push(_socket);
        HttpConnectHandler.onConnect(clientReq, _socket);
      });
    });
  }

  public static async start (_httpVersion: HttpVersion, port: number, hostname?: string) {
    httpVersion = _httpVersion;
    HttpConnectHandler.deprecated9999Listen();

    const server = http.createServer();

    listenPort = await listen('HttpConnectHandler', server, port, hostname);

    server.on('connect', HttpConnectHandler.onConnect);
  }

  private static async onConnect (clientReq: IncomingMessage, _socket: any) {
    Global.log('HttpConnectHandler onConnect', clientReq.method, clientReq.url);

    const hostPort = clientReq.url!.split(':', 2);
    const hostname = hostPort[0];

    const proxyType = clientReq.method === 'CONNECT' ? 'forward' : 'reverse';
    const key = hostname + '@@' + proxyType;
    let httpsServer = httpVersion === HttpVersion.HTTP1 ? https1Servers[key] : https2Servers[key];
    if (!httpsServer) {
      if (httpVersion === HttpVersion.HTTP1) {
        httpsServer = new Https1Server(hostname, proxyType);
        https1Servers[key] = httpsServer;
      } else {
        httpsServer = new Https2Server(hostname, proxyType);
        https2Servers[key] = httpsServer;
      }
      Global.log('HttpConnectHandler start https server');
      await httpsServer.start();
    } else {
      Global.log('HttpConnectHandler wait for https server to start');
      await httpsServer.waitForServerToStart();
    }

    // Create tunnel from client to Http2HttpsServer
    const httpXSocket = httpXSockets.shift();
    HttpConnectHandler.createTunnel(httpXSocket, httpsServer.getPort(), 'localhost');
  }

  private static respond (socket: net.Socket) {
    Global.log('HttpConnectHandler HTTP/1.1 200 Connection Established');
    socket.write('HTTP/1.1 200 Connection Established\r\n' +
      'Connection: Keep-Alive\n\r' +
      'Proxy-agent: Node.js-Proxy\r\n' +
      '\r\n');
  }

  // Create tunnel from client to AllProxy https server.  The AllProxy https server decrypts and captures
  // the HTTP messages, and forwards it to the origin server.
  private static createTunnel (httpXSocket: any, httpsServerPort: number, hostname: string) {
    Global.log('HttpConnectionHandler createTunnel', httpsServerPort, hostname);
    const httpsServerSocket = net.connect(httpsServerPort, hostname, () => {
      HttpConnectHandler.respond(httpXSocket);

      // Tunnel data between client and server
      httpsServerSocket.pipe(httpXSocket);
      httpXSocket.pipe(httpsServerSocket);
    });

    httpXSocket.on('error', (err: any) => {
      Global.log('HttpConnectHandler Client socket error: ', err);
    });

    httpsServerSocket.on('error', (err: any) => {
      Global.log('HttpConnectHandler Server socket error: ', err);
    });
  }
}
