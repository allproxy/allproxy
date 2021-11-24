import http from 'http';
import { exit } from 'process';
import https from 'https';
import Global from './server/src/Global';
import SocketIoManager from './server/src/SocketIoManager';
import HttpProxy from './server/src/HttpProxy';
import Paths from './server/src/Paths';
import GrpcProxy from './server/src/GrpcProxy';
import PortConfig from './common/PortConfig';
import HttpsProxy, { HttpVersion } from './server/src/HttpsProxy';

const listen: {
  protocol: string,
  host?: string,
  port: number
}[] = [];

let httpServer: http.Server | https.Server;
let useHttp2 = false;

console.log(process.argv);

for (let i = 2; i < process.argv.length; ++i) {
  switch (process.argv[i]) {
    case '--help':
      usage();
      exit(1);
      break;
    case '--listen':
    case '--listenHttp':
    case '--listenHttps':
    case '--listenGrpc':
    case '--listenSecureGrpc': {
      if (i + 1 >= process.argv.length) {
        usage();
        console.error('\nMissing port number for ' + process.argv[i]);
      }

      let protocol : 'http:' | 'https:' | 'grpc:' | 'securegrpc:' = 'http:';
      switch (process.argv[i]) {
        case '--listen':
        case '--listenHttp':
          protocol = 'http:';
          break;
        case '--listenHttps':
          protocol = 'https:';
          break;
        case '--listenGrpc':
          protocol = 'grpc:';
          break;
        case '--listenSecureGrpc':
          protocol = 'securegrpc:';
          break;
      }
      let host;
      let port = process.argv[++i];
      const tokens = port.split(':');
      if (tokens.length > 1) {
        host = tokens[0];
        port = tokens[1];
      }

      const portNum: number = +port;
      listen.push({
        protocol,
        host,
        port: portNum
      });

      break;
    }
    case '--http2':
      useHttp2 = true;
      break;
    default:
      usage();
      console.error('\nInvalid option: ' + process.argv[i]);
      exit(1);
  }
}

if (listen.length === 0) {
  listen.push({ protocol: 'http:', port: 8888 });
  listen.push({ protocol: 'https:', port: 9999 });
}

function usage () {
  console.log('\nUsage: npm start [--listen [host:]port] [--listenHttps [host:]port] [--debug]');
  console.log('\nOptions:');
  console.log('\t--listenHttp - listen for incoming http connections.  Default is 8888.');
  console.log('\t--listenHttps - listen for incoming https connections. Defaults is 9999.');
  console.log('\t--http2 - Enable HTTP/2 for https connections. (Experimental)');
  console.log('\nExample: npm start -- --listen 8888 --listenHttps 9999');
}

/**
 * Exception handler.
 */
process.on('uncaughtException', (err) => {
  console.error(err.stack);
  // process.exit()
});

Paths.makeCaPemSymLink();

Global.portConfig = new PortConfig();
Global.socketIoManager = new SocketIoManager();
const httpProxy = new HttpProxy();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // trust all certificates

for (const entry of listen) {
  const protocol = entry.protocol;
  const host = entry.host;
  const port = entry.port;

  switch (protocol) {
    case 'https:':
      console.log(`Listening on ${protocol} ${host || ''} ${port}`);
      if (useHttp2) {
        HttpsProxy.start(HttpVersion.HTTP2, port);
      } else {
        HttpsProxy.start(HttpVersion.HTTP1, port);
      }
      Global.portConfig.httpsPort = port;
      break;
    case 'http:':
      httpServer = http.createServer(
        (clientReq, clientRes) => httpProxy.onRequest(clientReq, clientRes));
      httpServer.listen(port, host);
      console.log(`Listening on ${protocol} ${host || ''} ${port}`);
      console.log(`Open browser to ${protocol}//localhost:${port}/allproxy\n`);

      Global.socketIoManager.addHttpServer(httpServer);
      Global.portConfig.httpPort = port;
      break;
    case 'grpc:':
      GrpcProxy.forwardProxy(port, false);
      console.log(`Listening on gRPC ${host || ''} ${port}`);
      Global.portConfig.grpcPort = port;
      break;
    case 'securegrpc:':
      GrpcProxy.forwardProxy(port, true);
      console.log(`Listening on secure gRPC ${host || ''} ${port}`);
      Global.portConfig.grpcSecurePort = port;
      break;
  }
}
