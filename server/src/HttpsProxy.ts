import http, { IncomingMessage } from 'http';
import Https1Server from './Https1Server';
import Https2Server from './Https2Server';
import listen from './Listen';
import net from 'net';

const enableMitm = true;

const https1Servers: {[key:string]:Https1Server} = {};
const https2Servers: {[key:string]:Https2Server} = {};

export enum HttpVersion {
  HTTP1 = 1,
  HTTP2 = 2
}

export default class HttpsProxy {
  public static async start (httpVersion: HttpVersion, port: number, host?: string) {
    const server = http.createServer();

    listen('Http2Proxy', server, port, host);

    server.on('connect', onConnect);

    async function onConnect (clientReq: IncomingMessage, clientSocket: any, head: Buffer) {
      const hostPort = clientReq.url!.split(':', 2);
      const hostname = hostPort[0];
      const port = hostPort.length === 2 ? +(hostPort[1]) : 443;

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
        await httpsServer.start();
      } else {
        await httpsServer.waitForServerToStart();
      }

      // Create tunnel from client to Http2HttpsServer
      if (enableMitm) {
        createTunnel(clientSocket, head, httpsServer.getPort(), 'localhost');
      } else {
        createTunnel(clientSocket, head, port, hostname);
      }
    }

    // Create tunnel from client to AllProxy https server.  The AllProxy https server decrypts and captures
    // the HTTP messages, and forwards it to the origin server.
    function createTunnel (clientSocket: any, head: Buffer, port: number, hostname: string) {
      const serverSocket = net.connect(port, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                      'Proxy-agent: Node.js-Proxy\r\n' +
                      '\r\n');

        // Tunnel data between client and server
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
      });

      clientSocket.on('error', (err: any) => {
        console.log('Client socket error: ', err);
      });

      serverSocket.on('error', (err: any) => {
        console.log('Server socket error: ', err);
      });
    }
  }
}
