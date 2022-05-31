import HttpOrHttpsServer from './HttpOrHttpsServer';
import Https2Server from './Https2Server';
import net from 'net';
import Global from './Global';

const HttpOrHttpsServers: { [key: string]: HttpOrHttpsServer } = {};
const https2Servers: { [key: string]: Https2Server } = {};

export enum HttpVersion {
  // eslint-disable-next-line no-unused-vars
  HTTP1 = 1,
  // eslint-disable-next-line no-unused-vars
  HTTP2 = 2
};

let httpVersion: HttpVersion = HttpVersion.HTTP1;

export default class HttpConnectHandler {
  public static async start(_httpVersion: HttpVersion) {
    httpVersion = _httpVersion;
  }

  public static async doConnect(httpXSocket: net.Socket, data: Buffer) {
    Global.log('HttpConnectHandler doConnect', data.toString());
    const hostPort = data.toString().split(' ', 2)[1];
    const tokens = hostPort!.split(':', 2);
    const port = tokens.length === 2 ? parseInt(tokens[1]) : 443;
    HttpConnectHandler.onConnect(tokens[0], port, httpXSocket);
  }

  private static async onConnect(hostname: string, port: number, socket: net.Socket) {
    Global.log('HttpConnectHandler onConnect', hostname, port);

    const proxyConfig = Global.socketIoManager.findGrpcProxyConfig(hostname, port);
    if (proxyConfig) {
      console.log(`Proxy ${hostname}:${port} to gRPC`)
      HttpConnectHandler.createTunnel(socket, parseInt(proxyConfig.path), 'localhost');
    } else {
      const key = hostname;
      let httpsServer = httpVersion === HttpVersion.HTTP1 ? HttpOrHttpsServers[key] : https2Servers[key];
      if (!httpsServer) {
        if (httpVersion === HttpVersion.HTTP1) {
          httpsServer = new HttpOrHttpsServer('forward', 'https:', hostname, port);
          HttpOrHttpsServers[key] = httpsServer;
        } else {
          httpsServer = new Https2Server(hostname, port, 'forward');
          https2Servers[key] = httpsServer;
        }
        Global.log('HttpConnectHandler start https server');
        await httpsServer.start(0);
      } else {
        Global.log('HttpConnectHandler wait for https server to start');
        await httpsServer.waitForServerToStart();
      }

      // Create tunnel from client to Http2HttpsServer
      HttpConnectHandler.createTunnel(socket, httpsServer.getEphemeralPort(), 'localhost');
    }
  }

  private static respond(socket: net.Socket) {
    Global.log('HttpConnectHandler HTTP/1.1 200 Connection Established');
    socket.write('HTTP/1.1 200 Connection Established\r\n' +
      // 'Connection: Keep-Alive\n\r' +
      'Proxy-agent: Node.js-Proxy\r\n' +
      '\r\n');
  }

  // Create tunnel from client to AllProxy https server.  The AllProxy https server decrypts and captures
  // the HTTP messages, and forwards it to the origin server.
  private static createTunnel(httpXSocket: any, httpsServerPort: number, hostname: string) {
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
