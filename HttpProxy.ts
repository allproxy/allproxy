import fs from 'fs';
import path from 'path';
import url from 'url';
import http, { IncomingMessage } from 'http';
import https from 'https';
import SocketMessage from './server/src/SocketIoMessage';
import Global from './server/src/Global';
import ProxyConfig from './common/ProxyConfig';
import Message, { MessageType, NO_RESPONSE } from './common/Message';

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpProxy {
    constructor() {
    }

    async onRequest(client_req: IncomingMessage, client_res: http.ServerResponse) {
        var sequenceNumber = ++Global.nextSequenceNumber;
        var remoteAddress = client_req.socket.remoteAddress;
        Global.log(sequenceNumber, remoteAddress + ': ', client_req.method, client_req.url);

        let reqUrl = url.parse(client_req.url ? client_req.url : '');

        let parseRequestPromise: Promise<any>;

        var startTime = Date.now();
        const clientDir = __dirname.endsWith(path.sep+'build')
            ? __dirname + path.sep + '..'+path.sep+'client'+path.sep+'build'
            : __dirname + path.sep + 'client' + path.sep + 'build';

        Global.log(reqUrl.pathname, reqUrl.search);
        if (reqUrl.pathname === '/'+'middleman' || reqUrl.pathname === '/'+'anyproxy') {
            Global.log(sequenceNumber, 'loading index.html');
            client_res.writeHead(200, {
                'content-type' : 'text/html'
            });
            client_res.end(fs.readFileSync(clientDir + path.sep+'index.html'));
        } else {
            const dir = clientDir + reqUrl.pathname?.replace(/\//g, path.sep);
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
                        contentType = 'image/jpg';
                        break;
                    case '.wav':
                        contentType = 'audio/wav';
                        break;
                }

                // Read local file and return to client
                Global.log(sequenceNumber, 'loading local file');
                client_res.writeHead(200, {
                    'content-type': contentType
                });
                client_res.end(fs.readFileSync(clientDir + reqUrl.pathname));
            } else if (reqUrl.protocol === null
                && reqUrl.pathname === '/api/anyproxy/config') {
                const configs = await Global.socketIoManager.updateHostReachable();
                client_res.writeHead(200, {
                    'content-type': 'application/json'
                });
                client_res.end(JSON.stringify(configs, null, 2));
            } else {
                // Find matching proxy configuration
                const clientHostName = await Global.resolveIp(client_req.socket.remoteAddress);
                let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('http:', clientHostName, reqUrl);
                // Always proxy forward proxy requests
                if (proxyConfig === undefined && reqUrl.protocol !== null) {
                    Global.log('No match found for forward proxy');
                    proxyConfig = new ProxyConfig();
                    proxyConfig.path = reqUrl.pathname!;
                    proxyConfig.protocol = reqUrl.protocol;
                    proxyConfig.hostname = reqUrl.hostname!;
                    proxyConfig.port = reqUrl.port === null
                        ? reqUrl.protocol === 'http:' ? 80 : 443
                        : +reqUrl.port;
                }

                if(proxyConfig === undefined) {
                    let msg = 'No matching proxy configuration found for '+reqUrl.pathname;
                    Global.log(sequenceNumber, msg);
                    if(reqUrl.pathname === '/') {
                        client_res.writeHead(302, {'Location': reqUrl.href+'anyproxy'});
                        client_res.end();
                    } else {
                        sendErrorResponse(404, msg);
                    }
                }
                else {
                    emitRequestToBrowser(proxyConfig);
                    proxyRequest(proxyConfig);
                }
            }
        }

        async function emitRequestToBrowser(proxyConfig: ProxyConfig) {
            const host = HttpProxy.getHostPort(proxyConfig!);

            const message = await SocketMessage.buildRequest(Date.now(),
                sequenceNumber,
                client_req.headers,
                client_req.method!,
                client_req.url!,
                getHttpEndpoint(client_req, {}),
                {},
                client_req.socket.remoteAddress!,
                host, // server host
                proxyConfig.path,
                Date.now() - startTime);
            SocketMessage.appendResponse(message, {}, NO_RESPONSE, 0, 0);
            Global.socketIoManager.emitMessageToBrowser(MessageType.REQUEST, message, proxyConfig);
        }

        function proxyRequest(proxyConfig: ProxyConfig) {
            //Global.log(sequenceNumber, 'proxyRequest');

            client_req.on('close', function() {
                Global.log(sequenceNumber, 'Client closed connection');
                //sendErrorResponse(499, "Client closed connection", undefined, proxyConfig.path);
            })

            client_req.on('error', function(error) {
                Global.log(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2));
            })

            var method = client_req.method;

            // GET request received with body?
            if(client_req.method == 'GET' &&
                    client_req.headers['content-length'] && +client_req.headers['content-length'] > 0) {
                method = 'POST'; // forward request as POST
            }

            var headers;
            headers = client_req.headers;
            headers.host = proxyConfig.hostname;
            if(proxyConfig.port) headers.host += ':'+proxyConfig.port;

            let {protocol, hostname, port} = proxyConfig.protocol === 'browser:' || proxyConfig.protocol === 'log:'
                                                            ? reqUrl : proxyConfig;
            if(port === undefined) {
                port = proxyConfig.protocol === 'https:' ? 443 : 80;
            }

            var options = {
                protocol,
                hostname,
                port,
                path : client_req.url,
                method,
                headers,
            };

            var proxy;
            if(options.protocol === 'https:') {
                //options.cert: fs.readFileSync('/home/davidchr/imlTrust.pem');
                //options.headers.Authorization = 'Basic ' + new Buffer.from('elastic:imliml').toString('base64'); // hardcoded authentication
                proxy = https.request(options, proxyRequest);
            }
            else {
                proxy = http.request(options, proxyRequest);
            }

            const host = proxyConfig.protocol === 'browser:' && hostname !== null
                ? hostname.split('.')[0]
                : HttpProxy.getHostPort(proxyConfig);
            parseRequestPromise = SocketMessage.parseRequest(
                client_req,
                startTime,
                sequenceNumber,
                host,
                proxyConfig.path);

            function proxyRequest(proxyRes: http.IncomingMessage) {
                parseRequestPromise.then(function(message) {
                    var parseResponsePromise = SocketMessage.parseResponse(proxyRes, startTime, message);

                    /**
                     * Forward the response back to the client
                     */
                    client_res.writeHead((proxyRes as any).statusCode, proxyRes.headers);
                    proxyRes.pipe(client_res, {
                        end : true
                    });
                    parseResponsePromise.then(function(message: Message) {
                        Global.socketIoManager.emitMessageToBrowser(MessageType.RESPONSE, message, proxyConfig);
                    })
                    .catch(function(error: any) {
                        Global.log(sequenceNumber, 'Parse response promise emit error:', error);
                    })
                })
                .catch(function(error) {
                    Global.error(sequenceNumber, 'Parse request promise rejected:', error);
                })
            }

            proxy.on('error', function(error) {
                Global.error(sequenceNumber, 'Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig);
                sendErrorResponse(404, "Proxy connect error", error, proxyConfig);
            })

            client_req.pipe(proxy, {
                end : true
            });
        }

        function sendErrorResponse(status: number,
            responseMessage: string,
            jsonData?: { [key: string]: any },
            proxyConfig?: ProxyConfig) {
            Global.log(sequenceNumber, 'sendErrorResponse', responseMessage);
            const path = proxyConfig ? proxyConfig.path : '';
            if(parseRequestPromise == undefined) {
                var host = 'error';
                parseRequestPromise = SocketMessage.parseRequest(client_req, startTime, sequenceNumber, host, path);
            }

            parseRequestPromise.then(function(message) {
                message.responseHeaders = {};
                message.responseBody = {error: responseMessage};
                if(jsonData && typeof jsonData === 'object') {
                    for(const key in jsonData) {
                        message.responseBody[key] = jsonData[key];
                    }
                }
                message.status = status;

                Global.socketIoManager.emitMessageToBrowser(MessageType.RESPONSE, message, proxyConfig); // Send error to all browsers

                if(responseMessage != 'Client closed connection') {
                    client_res.on('error', function(error) {
                        Global.error(sequenceNumber, 'sendErrorResponse error handled', JSON.stringify(error));
                    })

                    client_res.writeHead(status, {
                        'content-type' : 'application/json'
                    });

                    client_res.end(JSON.stringify(message.responseBody, null, 2));
                }
            })
            .catch(function(error) {
                Global.log(sequenceNumber, 'sendErrorResponse: Parse request promise rejected:', error.message);
            })
        }
    }

    static getHostPort(proxyConfig: ProxyConfig) {
        let host = proxyConfig.hostname;
        if(proxyConfig.port) host += ':' + proxyConfig.port;
        return host;
    }
}

export const getHttpEndpoint = (client_req: IncomingMessage, requestBody: string | {}): string => {
    var endpoint = client_req.url?.split('?')[0];
    var tokens = endpoint?.split('/');
    endpoint = tokens ? tokens[tokens.length - 1] : '';
    if (!isNaN(+endpoint) && tokens && tokens.length > 1) {
        endpoint = tokens[tokens.length - 2] + '/' + tokens[tokens.length - 1];
    }

    if(client_req.method !== 'OPTIONS'
        && (client_req.url?.endsWith('/graphql') || client_req.url?.endsWith('/graphql-public'))) {
        endpoint = '';
        if(requestBody && Array.isArray(requestBody)) {
            requestBody.forEach((entry) => {
                if(entry.operationName) {
                    if(endpoint!.length > 0) endpoint += ','
                    endpoint += ' ' + entry.operationName;
                }
            })
        }
        const tag = client_req.url?.endsWith('/graphql-public') ? 'GQLP' : 'GQL';
        endpoint = ' ' + tag + endpoint;
    }
    if ('/' + endpoint === client_req.url) endpoint = '';
    return endpoint;
}