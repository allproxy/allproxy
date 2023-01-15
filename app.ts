import { exit } from 'process';
import Global from './server/src/Global';
import SocketIoManager from './server/src/SocketIoManager';
import Paths from './server/src/Paths';
import GrpcProxy from './server/src/GrpcProxy';
import PortConfig from './common/PortConfig';
import HttpXProxy from './server/src/HttpXProxy';
import { createCertificateAuthority } from './server/src/GenerateCertKey';
import { parseProtoFiles } from './server/src/Protobuf';
import path from 'path';
import fs from 'fs';
import ConsoleLog from './server/src/ConsoleLog';
import BrowserLauncher from './server/src/BrowserLauncher';

const listen: {
  protocol: string,
  host?: string,
  port: number
}[] = [];

console.log('app.ts', process.argv);

for (let i = 2; i < process.argv.length; ++i) {
  switch (process.argv[i]) {
    case '--help':
      usage();
      exit(1);
      break;
    case '--listen':
    case '--listenGrpc':
    case '--listenSecureGrpc': {
      if (i + 1 >= process.argv.length) {
        usage();
        console.error('\nMissing port number for ' + process.argv[i]);
      }

      let protocol: 'httpx:' | 'grpc:' | 'securegrpc:' = 'httpx:';
      switch (process.argv[i]) {
        case '--listen':
          protocol = 'httpx:';
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
      Global.useHttp2 = true;
      break;
    case '--debug':
      ConsoleLog.enableDebug = true;
      break;
    case '--info':
      ConsoleLog.enableInfo = true;
      break;
    default:
      usage();
      console.error('\nInvalid option: ' + process.argv[i]);
      exit(1);
  }
}

if (listen.length === 0) {
  listen.push({ protocol: 'httpx:', port: 8888 });
}

function usage() {
  console.log('\nUsage: npm start [--listen [host:]port] [--debug]');
  console.log('\nOptions:');
  console.log('\t--listen - listen for incoming http connections.  Default is 8888.');
  console.log('\t--http2 - Enable HTTP/2 for https connections. (Experimental)');
  console.log('\nExample: npm start -- --listen 8888');
}

/**
 * Exception handler.
 */
process.on('uncaughtException', (err) => {
  console.trace('uncaughtException:', err.stack);
  BrowserLauncher.shutdown();
  // process.exit()
});

process.on('exit', () => BrowserLauncher.shutdown());

Paths.makeCaPemSymLink();
Paths.setupInterceptDir();

setOsBinaries(process.platform)

Global.portConfig = new PortConfig();
Global.socketIoManager = new SocketIoManager();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // trust all certificates

parseProtoFiles();

startServers();

async function startServers() {
  console.log('startServers')
  await createCertificateAuthority();

  BrowserLauncher.init();

  for (const entry of listen) {
    const protocol = entry.protocol;
    const host = entry.host;
    const port = entry.port;

    switch (protocol) {
      case 'httpx:':
        console.log(`Listening on ${protocol} ${host || ''} ${port}`);
        HttpXProxy.start(port);
        Global.portConfig.httpXPort = port;
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
}

export function setOsBinaries(os: string) {
  const dirName = __dirname + path.sep + '..';
  const dataDir = process.env.ALLPROXY_DATA_DIR;
  if (dataDir) {
    const binPath = ':/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
    switch (os) {
      case 'darwin':
        fs.copyFileSync(`${dirName + path.sep}/bin/macos/trustCert.sh`, `${dataDir}/bin/trustCert.sh`);
        fs.copyFileSync(`${dirName + path.sep}/bin/macos/systemProxy.sh`, `${dataDir}/bin/systemProxy.sh`);
        process.env.PATH += binPath;
        break;
      case 'win32':
        fs.copyFileSync(`${dirName + path.sep}bin\\windows\\trustCert.bat`, `${dataDir}\\bin\\trustCert.bat`);
        fs.copyFileSync(`${dirName + path.sep}bin\\windows\\systemProxy.bat`, `${dataDir}\\bin\\systemProxy.bat`);
        break;
      case 'linux':
        fs.copyFileSync(`${dirName + path.sep}/bin/linux/trustCert.sh`, `${dataDir}/bin/trustCert.sh`);
        fs.copyFileSync(`${dirName + path.sep}/bin/linux/systemProxy.sh`, `${dataDir}/bin/systemProxy.sh`);
        process.env.PATH += binPath;
        break;
    }
  }
}
