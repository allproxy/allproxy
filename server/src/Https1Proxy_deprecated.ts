import url from 'url';
import Global from './Global';
import ProxyConfig, { ConfigProtocol } from '../../common/ProxyConfig';
import Proxy from '../../node-http-mitm-proxy';
import HttpMessage from './HttpMessage';
import { decompressResponse } from './Zlib';

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class Https1Proxy {
  onRequest(proxy: Proxy.IProxy) {
    proxy.onRequest(async function (ctx, callback) {
      const clientReq = ctx.clientToProxyRequest;
      const clientRes = ctx.proxyToClientResponse;

      const sequenceNumber = Global.nextSequenceNumber();
      const remoteAddress = clientReq.socket.remoteAddress;

      const reqHeaders = ctx.proxyToServerRequestOptions.headers;
      const connectRequest = Object.keys((ctx as any).connectRequest).length > 0;
      if (connectRequest) {
        const host = reqHeaders.host;
        clientReq.url = 'https://' + host + clientReq.url;
      }

      // eslint-disable-next-line node/no-deprecated-api
      const reqUrl = url.parse(clientReq.url ? clientReq.url : '');

      // Find matching proxy configuration
      let proxyConfig;

      const clientHostName = await Global.resolveIp(clientReq.socket.remoteAddress);
      if (!connectRequest) {
        proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl, 'reverse');
        if (proxyConfig !== undefined) {
          ctx.proxyToServerRequestOptions.headers.host = proxyConfig.hostname;
          clientReq.url = 'https://' + proxyConfig.hostname + clientReq.url;
        }
      } else {
        proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl, 'forward');
        // Always proxy forward proxy requests
        if (proxyConfig === undefined) {
          proxyConfig = new ProxyConfig();
          proxyConfig.path = reqUrl.pathname!;
          proxyConfig.protocol = reqUrl.protocol! as ConfigProtocol;
          proxyConfig.hostname = reqUrl.hostname!;
          proxyConfig.port = reqUrl.port === null
            ? reqUrl.protocol === 'http:' ? 80 : 443
            : +reqUrl.port;
        }
      }

      const httpMessage = new HttpMessage(
        'https:',
        proxyConfig,
        sequenceNumber,
        remoteAddress!,
        clientReq.method!,
        clientReq.url!,
        reqHeaders
      );

      if (proxyConfig === undefined) {
        const msg = 'No matching proxy configuration found for ' + reqUrl.pathname;
        ctx.proxyToClientResponse.end('404 ' + msg);
        httpMessage.emitMessageToBrowser(msg);
      } else {
        proxyRequest();
      }

      callback();

      function proxyRequest() {
        clientReq.on('close', function () {

        });

        clientReq.on('error', function (error) {
          console.log(sequenceNumber, 'Https1Proxy Client connection error', JSON.stringify(error, null, 2));
        });

        clientRes.on('error', function (error) {
          console.error(sequenceNumber, 'Server connection error', JSON.stringify(error, null, 2));
          httpMessage.emitMessageToBrowser(JSON.stringify(error, null, 2));
        });

        let reqChunks: string = '';
        ctx.onRequestData(function (_ctx, chunk, callback) {
          reqChunks += chunk.toString();
          return callback(undefined, chunk);
        });

        ctx.onRequestEnd(function (_ctx, callback) {
          httpMessage.emitMessageToBrowser(reqChunks);
          return callback();
        });

        ctx.onResponse(function (ctx, callback) {
          const resChunks: Buffer[] = [];
          ctx.onResponseData(function (_ctx, chunk, callback) {
            resChunks.push(chunk);
            return callback(undefined, chunk);
          });

          ctx.onResponseEnd(function (ctx, callback) {
            const resHeaders = ctx.serverToProxyResponse.headers;
            const resBuffer = resChunks.reduce(
              (prevChunk, chunk) => Buffer.concat([prevChunk, chunk], prevChunk.length + chunk.length),
              Buffer.from('')
            );
            httpMessage.emitMessageToBrowser(
              reqChunks,
              ctx.serverToProxyResponse.statusCode,
              resHeaders,
              decompressResponse(resHeaders, resBuffer).toString()
            );
            return callback();
          });

          return callback();
        });
      }
    });
  }
}
