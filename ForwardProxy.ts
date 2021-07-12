import fs from 'fs';
import path from 'path';
import url from 'url';
import http, { IncomingMessage } from 'http';
import https from 'https';
import socketMessage from './server/src/SocketIoMessage';
import Global from './server/src/Global';
import ProxyConfig from './common/ProxyConfig';
import Message from './common/Message';
import Proxy from './node-http-mitm-proxy';
import { request } from 'node:http';


/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class ForwardProxy {
    constructor() {
    }

    onRequest(proxy: Proxy.IProxy) {
        proxy.onRequest(function (ctx, callback) {
            ctx.use(Proxy.gunzip);

            const client_req = ctx.clientToProxyRequest;
            const client_res = ctx.proxyToClientResponse;
            //console.log(ctx);

            var sequenceNumber = ++Global.nextSequenceNumber;
            var remoteAddress = client_req.socket.remoteAddress;

            const reqHeaders = ctx.proxyToServerRequestOptions.headers;
            const host = reqHeaders['host'];

            client_req.url = 'https://' + host + client_req.url;
            const reqUrl = url.parse(client_req.url ? client_req.url : '');

            console.log(sequenceNumber, remoteAddress + ': ', client_req.method, client_req.url);

            let parseRequestPromise: Promise<any>;

            var startTime = Date.now();
            console.log(reqUrl.protocol, reqUrl.pathname, reqUrl.search);

            // Find matching proxy configuration
            let proxyConfig = Global.proxyConfigs.findProxyConfigMatchingURL(reqUrl);
            // Always proxy forward proxy requests
            if (proxyConfig === undefined && reqUrl.protocol !== null) {
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
                console.log(sequenceNumber, msg);
                ctx.proxyToClientResponse.end('404 '+msg);
                emitRequestToBrowser(
                    undefined,
                    client_req.url!,
                    reqHeaders,
                    msg
                );
            }
            else {
                emitRequestToBrowser(
                    proxyConfig,
                    client_req.url!,
                    reqHeaders,
                );
                proxyRequest(proxyConfig);
            }

            callback();

            function proxyRequest(proxyConfig: ProxyConfig) {
                //console.log(sequenceNumber, 'proxyRequest');

                client_req.on('close', function () {
                    console.log(sequenceNumber, 'Client closed connection');
                })

                client_req.on('error', function (error) {
                    console.log(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2));
                })

                client_res.on('error', function (error) {
                    console.log(sequenceNumber, 'Server connection error', JSON.stringify(error, null, 2));
                    emitRequestToBrowser(
                        undefined,
                        client_req.url!,
                        reqHeaders,
                        JSON.stringify(error, null, 2)
                    );
                })

                let reqChunks: string = '';
                ctx.onRequestData(function (ctx, chunk, callback) {
                    //console.log('request data length: ' + chunk.length);
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
                    //console.log('RESPONSE: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);

                    let resChunks: string = '';
                    ctx.onResponseData(function (ctx, chunk, callback) {
                        //console.log('response data length: ' + chunk.length);
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
                resBody: string = "No Response"
            ) {
                const host = ForwardProxy.getHostPort(proxyConfig!);
                var endpoint = url.split('?')[0];
                    var tokens = endpoint?.split('/');
                    endpoint = tokens?tokens[tokens.length-1]:'';
                const message = await socketMessage.buildRequest(Date.now(),
                                            sequenceNumber,
                                            reqHeaders,
                                            client_req.method!,
                                            url,
                                            endpoint,
                                            toJSON(reqBody),
                                            client_req.socket.remoteAddress!,
                                            host, // server host
                                            proxyConfig ? proxyConfig.path : '',
                                            Date.now() - startTime);
                socketMessage.appendResponse(message, resHeaders, toJSON(resBody), 0, 0);
                Global.proxyConfigs.emitMessageToBrowser(message, proxyConfig);

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