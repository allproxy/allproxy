import net from 'net';
import listen from './Listen';
import HttpConnectHandler, { HttpVersion } from './HttpConnectHandler';
import HexFormatter from './formatters/HexFormatter';
import HttpOrHttpsServer from './HttpOrHttpsServer';
import Global from './Global';
import Https2Server from './Https2Server';
import ConsoleLog from './ConsoleLog';

// const GRPC_PORT = 11111;

export default class HttpXProxy {
  private server: net.Server;
  private httpsServer: Https2Server | HttpOrHttpsServer;

  private httpPort = 0; // ephemeral port for HTTP connections

  public static start(port: number, hostname: string): HttpXProxy {
    return new HttpXProxy(port, hostname);
  }

  constructor(port: number, hostname: string) {
    if (hostname.length === 0) {
      hostname = 'localhost';
    }
    this.httpsServer = Global.useHttp2
      ? new Https2Server(hostname, 443, 'forward')
      : new HttpOrHttpsServer('forward', 'https:', hostname, 443);
    this.startServers();
    this.httpsServer.start(0);

    // Start the HTTP server, and listen on an ephemeral port
    const httpServer = new HttpOrHttpsServer('forward', 'http:');
    httpServer.start(0);
    httpServer.waitForServerToStart()
      .then(() => {
        this.httpPort = httpServer.getEphemeralPort();
      })

    this.server = net.createServer(this.onConnect.bind(this));
    listen('HttpXProxy', this.server, port, undefined, 0);
    // GrpcProxy.forwardProxy(GRPC_PORT, false);
  }

  private async startServers() {
    await HttpConnectHandler.start(Global.useHttp2 ? HttpVersion.HTTP2 : HttpVersion.HTTP1);
  }

  private async onConnect(httpXSocket: net.Socket) {
    ConsoleLog.debug('HttpXProxy onConnect');

    let done = false;
    const onData = async (data: Buffer) => {
      if (!done) {
        const line1 = data.toString().split('\r\n')[0];
        if (line1.startsWith('CONNECT')) {
          ConsoleLog.info(line1);
          HttpConnectHandler.doConnect(httpXSocket, data);
        } else if (this.isClientHello(data)) {
          ConsoleLog.debug('HttpXProxy client hello:\n', HexFormatter.format(data));
          const httpsServerSocket = net.connect(this.httpsServer.getEphemeralPort(), undefined, () => {
            ConsoleLog.debug('HttpXProxy connected to httpsServer');
            httpsServerSocket.write(data);
            httpsServerSocket.pipe(httpXSocket);
            httpXSocket.pipe(httpsServerSocket);
          });
        } else { // Assume this is just HTTP in the clear
          ConsoleLog.info(line1);
          // const port = line1.endsWith('HTTP/1.0') || line1.endsWith('HTTP/1.1')
          //   ? this.http1Port
          //   : GRPC_PORT;
          ConsoleLog.debug('HttpXProxy http:\n', HexFormatter.format(data));
          const httpServerSocket = net.connect(this.httpPort, undefined, () => {
            ConsoleLog.debug('HttpXProxy connected to httpServer');
            httpServerSocket.write(data);
            httpServerSocket.pipe(httpXSocket);
            httpXSocket.pipe(httpServerSocket);
          });
        }
        httpXSocket.off('data', onData);
        done = true;
      }
    };

    httpXSocket.on('data', onData);
  }

  private isClientHello(data: Buffer) {
    return data[0] === 0x16 && data[1] === 0x03 && data[2] === 0x01;
  }
}
