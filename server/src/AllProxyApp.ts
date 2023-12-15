import { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { UrlWithStringQuery } from 'url';
import Paths from './Paths';
import fs from 'fs';
import Global from './Global';
import GrpcProxy from './GrpcProxy';
import ProxyConfig, { DYNAMICALLY_ADDED } from '../../common/ProxyConfig';
import ConsoleLog from './ConsoleLog';

const portToGrpcProxyMap: Map<string, ProxyConfig> = new Map();

const AllProxyApp = (
  clientReq: IncomingMessage,
  clientRes: ServerResponse,
  reqUrl: UrlWithStringQuery
): boolean => {
  let responseSent = true;
  const clientBuildDir = Paths.clientDir() + Paths.sep() + 'build';

  switch (clientReq.method) {
    case 'GET':
      if (reqUrl.pathname === '/' + 'allproxy' || reqUrl.pathname === '/' + 'mitmproxy') {
        clientRes.writeHead(200, {
          'content-type': 'text/html'
        });
        clientRes.end(fs.readFileSync(clientBuildDir + Paths.sep() + 'index.html'));
      } else if (reqUrl.pathname === '/logviewer' || reqUrl.pathname === '/jlogviewer') {
        clientRes.writeHead(200, {
          'content-type': 'text/html'
        });
        clientRes.end(fs.readFileSync(clientBuildDir + Paths.sep() + 'index.html'));
        Global.renderLogView = true;
      } else {
        const dir = clientBuildDir + reqUrl.pathname?.replace(/\//g, Paths.sep());
        // File exists locally?
        if (reqUrl.protocol === null &&
          fs.existsSync(dir) && fs.lstatSync(dir).isFile()) {
          const extname = path.extname(reqUrl.pathname!);
          let contentType = 'text/html';
          switch (extname) {
            case '.js':
              contentType = 'text/javascript';
              break;
            case '.css':
              contentType = 'text/css';
              break;
            case '.json':
              contentType = 'application/json';
              break;
            case '.png':
              contentType = 'image/png';
              break;
            case '.jpg':
            case '.ico':
              contentType = 'image/jpg';
              break;
            case '.wav':
              contentType = 'audio/wav';
              break;
          }

          // Read local file and return to client
          clientRes.writeHead(200, {
            'content-type': contentType
          });
          clientRes.end(fs.readFileSync(clientBuildDir + reqUrl.pathname));
        } else if (reqUrl.protocol === null &&
          reqUrl.pathname === '/api/allproxy/config') {
          Global.socketIoManager.updateHostReachable()
            .then((configs) => {
              clientRes.writeHead(200, {
                'content-type': 'application/json'
              });
              clientRes.end(JSON.stringify(configs, null, 2));
            });
        } else {
          responseSent = false;
        }
      }
      break;
    case 'POST':
      if (reqUrl.protocol === null &&
        reqUrl.pathname === '/api/allproxy/grpc-proxy') {
        ConsoleLog.info('POST' + reqUrl.pathname);
        getReqBody(clientReq)
          .then((reqBody) => {
            ConsoleLog.info(reqBody);
            if (!reqBody.server || reqBody.server.indexOf(':') === -1) {
              clientRes.writeHead(400, { "content-type": "application/json; charset=utf-8" });
              clientRes.write(JSON.stringify({ error: "server field is invalid or missing" }));
              clientRes.end();
              return;
            }
            const config = new ProxyConfig()
            config.protocol = 'grpc:';
            config.comment = DYNAMICALLY_ADDED;
            config.recording = true;
            config.path = '0'; // dynamic port
            const [host, port] = reqBody.server.split(':');
            config.hostname = host;
            config.port = parseInt(port);
            GrpcProxy.reverseProxy(config)
              .then(port => {
                portToGrpcProxyMap.set(port + '', config);
                clientRes.writeHead(201, { "content-type": "application/json; charset=utf-8" });
                clientRes.write(Buffer.from(JSON.stringify({ id: port + "" }), 'utf-8'));
                clientRes.end();
              })
          })
      } else {
        responseSent = false;
      }
      break;
    case 'DELETE':
      if (reqUrl.protocol === null &&
        reqUrl.pathname!.startsWith('/api/allproxy/grpc-proxy/')) {
        ConsoleLog.info('DELETE' + reqUrl.pathname)
        const tokens = reqUrl.pathname!.split('/');
        const id = tokens[tokens.length - 1];
        const config = portToGrpcProxyMap.get(id);
        if (config) {
          GrpcProxy.destructor(config)
          portToGrpcProxyMap.delete(id);
          clientRes.writeHead(204);
          clientRes.end();
        } else {
          clientRes.writeHead(404, { "content-type": "application/json; charset=utf-8" });
          clientRes.write(JSON.stringify({ error: "No GRPC proxy found for port " + id }));
          clientRes.end();
        }
      } else {
        responseSent = false;
      }
      break;
    default:
      responseSent = false;
  }

  return responseSent;
};

function getReqBody(clientReq: IncomingMessage): Promise<{ [key: string]: any }> {
  return new Promise<{ [key: string]: any }>(resolve => {
    let requestBody: { [key: string]: any } = {};
    clientReq.setEncoding('utf8');
    let rawData = '';
    clientReq.on('data', function (chunk) {
      rawData += chunk;
    });
    clientReq.on('end', async function () {
      try {
        requestBody = JSON.parse(rawData);
      } catch (e) {

      }
      resolve(requestBody as { [key: string]: any });
    });
  });
}

export default AllProxyApp;
