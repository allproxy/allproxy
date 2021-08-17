import url from 'url';
import SocketMessage from './server/src/SocketIoMessage';
import Global from './server/src/Global';
import ProxyConfig from './common/ProxyConfig';
import Proxy from './node-http-mitm-proxy';
import { MessageType, NO_RESPONSE } from './common/Message';

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpsProxy {
    constructor() {
    }

    onRequest(proxy: Proxy.IProxy, proxyHost: string, proxyPort: number) {
        proxy.onRequest(function (ctx, callback) {
            ctx.use(Proxy.gunzip);

            const client_req = ctx.clientToProxyRequest;
            const client_res = ctx.proxyToClientResponse;
            //Global.log(ctx);

            var sequenceNumber = ++Global.nextSequenceNumber;
            var remoteAddress = client_req.socket.remoteAddress;

            const reqHeaders = ctx.proxyToServerRequestOptions.headers;
            const connectRequest = Object.keys((ctx as any).connectRequest).length > 0;
            if (connectRequest) {
                const host = reqHeaders['host'];
                client_req.url = 'https://' + host + client_req.url;
            }

            const reqUrl = url.parse(client_req.url ? client_req.url : '');

            Global.log(sequenceNumber, remoteAddress + ': ', client_req.method, client_req.url);

            var startTime = Date.now();
            Global.log(reqUrl.protocol, reqUrl.pathname, reqUrl.search);

            // Find matching proxy configuration
            let proxyConfig;

            if (!connectRequest) {
                proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', reqUrl);
                if (proxyConfig !== undefined) {
                    ctx.proxyToServerRequestOptions.headers['host'] = proxyConfig.hostname;
                    client_req.url = 'https://' + proxyConfig.hostname + client_req.url;
                }
            } else {
                proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', reqUrl);
                // Always proxy forward proxy requests
                if (proxyConfig === undefined) {
                    proxyConfig = new ProxyConfig();
                    proxyConfig.path = reqUrl.pathname!;
                    proxyConfig.protocol = reqUrl.protocol!;
                    proxyConfig.hostname = reqUrl.hostname!;
                    proxyConfig.port = reqUrl.port === null
                        ? reqUrl.protocol === 'http:' ? 80 : 443
                        : +reqUrl.port;
                }
            }

            if(proxyConfig === undefined) {
                let msg = 'No matching proxy configuration found for '+reqUrl.pathname;
                Global.log(sequenceNumber, msg);
                ctx.proxyToClientResponse.end('404 '+msg);
                emitRequestToBrowser(
                    undefined,
                    client_req.url!,
                    reqHeaders,
                    msg
                );
            }
            else {
                proxyRequest(proxyConfig);
            }

            callback();

            function proxyRequest(proxyConfig: ProxyConfig) {
                //Global.log(sequenceNumber, 'proxyRequest');

                client_req.on('close', function () {
                    Global.log(sequenceNumber, 'Client closed connection');
                })

                client_req.on('error', function (error) {
                    Global.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2));
                })

                client_res.on('error', function (error) {
                    Global.error(sequenceNumber, 'Server connection error', JSON.stringify(error, null, 2));
                    emitRequestToBrowser(
                        undefined,
                        client_req.url!,
                        reqHeaders,
                        JSON.stringify(error, null, 2)
                    );
                })

                let reqChunks: string = '';
                ctx.onRequestData(function (ctx, chunk, callback) {
                    //Global.log('request data length: ' + chunk.length);
                    reqChunks += chunk.toString();
                    return callback(undefined, chunk);
                });

                ctx.onRequestEnd(function (ctx, callback) {
                    emitRequestToBrowser(
                        proxyConfig,
                        client_req.url!,
                        reqHeaders,
                        reqChunks,
                    );
                    return callback();
                });

                ctx.onResponse(function (ctx, callback) {
                    //Global.log('RESPONSE: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);

                    let resChunks: string = '';
                    ctx.onResponseData(function (ctx, chunk, callback) {
                        //Global.log('response data length: ' + chunk.length);
                        resChunks += chunk.toString();
                        return callback(undefined, chunk);
                    });

                    ctx.onResponseEnd(function (ctx, callback) {
                        emitRequestToBrowser(
                            proxyConfig,
                            client_req.url!,
                            reqHeaders,
                            reqChunks,
                            ctx.serverToProxyResponse.headers,
                            resChunks,
                        );
                        return callback();
                    });

                    return callback();
                });
            }

            async function emitRequestToBrowser(
                proxyConfig: ProxyConfig | undefined,
                url: string,
                reqHeaders: {} = {},
                reqBody: string = '',
                resHeaders: {} = {},
                resBody: string = NO_RESPONSE
            ) {
                const reqBodyJson = toJSON(reqBody);
                const host = HttpsProxy.getHostPort(proxyConfig!);
                var endpoint = url.split('?')[0];
                    var tokens = endpoint?.split('/');
                endpoint = tokens ? tokens[tokens.length - 1] : '';

                if(client_req.url?.endsWith('/graphql')) {
					endpoint = '';
					if(reqBodyJson && Array.isArray(reqBodyJson)) {
						reqBodyJson.forEach((entry) => {
							if(entry.operationName) {
								if(endpoint && endpoint.length > 0) endpoint += ', '
								endpoint += entry.operationName;
							}
						})
						if (endpoint.length > 0) {
							endpoint = 'GQL ' + endpoint;
						}
					}
				}
                if ('/' + endpoint === client_req.url) endpoint = '';

                const message = await SocketMessage.buildRequest(Date.now(),
                                            sequenceNumber,
                                            reqHeaders,
                                            client_req.method!,
                                            url,
                                            endpoint,
                                            reqBodyJson,
                                            client_req.socket.remoteAddress!,
                                            host, // server host
                                            proxyConfig ? proxyConfig.path : '',
                                            Date.now() - startTime);
                SocketMessage.appendResponse(message, resHeaders, resBody, 0, 0);
                Global.socketIoManager.emitMessageToBrowser(MessageType.REQUEST, message, proxyConfig);

                function toJSON(s: string): {} {
                    try {
                        return JSON.parse(s);
                    } catch (e) {
                        return s;
                    }
                }
            }
        });
    }

    static getHostPort(proxyConfig: ProxyConfig) {
        let host = proxyConfig.hostname;
        if(proxyConfig.port) host += ':' + proxyConfig.port;
        return host;
    }
}