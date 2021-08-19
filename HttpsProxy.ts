import url from 'url';
import SocketMessage from './server/src/SocketIoMessage';
import Global from './server/src/Global';
import ProxyConfig from './common/ProxyConfig';
import Proxy from './node-http-mitm-proxy';
import { MessageType, NO_RESPONSE } from './common/Message';
import { getHttpEndpoint } from './HttpProxy';
import { IncomingMessage } from 'http';

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpsProxy {
    constructor() {
    }

    onRequest(proxy: Proxy.IProxy, proxyHost: string, proxyPort: number) {
        proxy.onRequest(function (ctx, callback) {
            var startTime = Date.now();
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
                        reqChunks
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
                            ctx.serverToProxyResponse,
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
                res: IncomingMessage | undefined = undefined,
                resBody: string = NO_RESPONSE
            ) {
                const reqBodyJson = HttpsProxy.toJSON(reqBody);
                const resBodyJson = resBody === NO_RESPONSE ? resBody : HttpsProxy.toJSON(resBody);
                const host = HttpsProxy.getHostPort(proxyConfig!);

                const message = await SocketMessage.buildRequest(Date.now(),
                    sequenceNumber,
                    reqHeaders,
                    client_req.method!,
                    url,
                    getHttpEndpoint(client_req, reqBodyJson),
                    reqBodyJson,
                    client_req.socket.remoteAddress!,
                    host, // server host
                    proxyConfig ? proxyConfig.path : '',
                    Date.now() - startTime);
                const status = res && res.statusCode ? res.statusCode : 0;
                SocketMessage.appendResponse(message, res ? res.headers : {}, resBodyJson, status, Date.now() - startTime);
                Global.socketIoManager.emitMessageToBrowser(
                    resBody === NO_RESPONSE ? MessageType.REQUEST : MessageType.RESPONSE,
                    message,
                    proxyConfig);
            }
        });
    }

    static getHostPort(proxyConfig: ProxyConfig) {
        let host = proxyConfig.hostname;
        if(proxyConfig.port) host += ':' + proxyConfig.port;
        return host;
    }

    static toJSON(s: string): {} {
        try {
            return JSON.parse(s);
        } catch (e) {
            return s;
        }
    }
}