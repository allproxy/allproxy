import urlParser from 'url';
import Message, { MessageProtocol } from '../../common/Message';
import HttpMessage from './HttpMessage';
import ProxyConfig, { ConfigProtocol } from '../../common/ProxyConfig';
import Global from './Global';
const fetch = require('node-fetch');

const resend = async (
  forwardProxy: boolean,
  method: string,
  url: string,
  message: Message,
  body?: string | object
) => {
  const headers: {[key: string]: string} = {};
  const unsafeHeaders = [
    'host',
    'connection',
    'content-length',
    'origin',
    'referer',
    'accept-encoding',
    'cookie',
    'sec-fetch-dest',
    'proxy-connection'
  ];
  for (const header in message.requestHeaders) {
    if (unsafeHeaders.indexOf(header) === -1) {
      headers[header] = message.requestHeaders[header];
    }
  }

  // eslint-disable-next-line node/no-deprecated-api
  const reqUrl = urlParser.parse(url);

  headers.allproxy = 'resend';

  // console.log(`Resend ${method} ${url} \n${body} \n${headers}`)

  body = typeof body === 'string' && body.length === 0 ? undefined : body;

  let httpMessage: HttpMessage;
  let clientHostName: string;
  if (forwardProxy) {
    clientHostName = await Global.resolveIp(reqUrl.hostname!);
    httpMessage = recordHttpRequest();
  }

  if (body && body != null && typeof body === 'object') {
    body = JSON.stringify(body);
  }
  try {
    const response = await fetch(url, 
      {
        method: method, 
        headers,
        body: body === null ? undefined : body
      });    
    try {
      const data = await response.json();
      recordHttpResponse(response, data);
    } catch(e) {
      try {
        recordHttpResponse(response, "");
      } catch(e) {
        httpMessage!.emitMessageToBrowser(body, 520, {}, typeof e === 'string' ? {error: e} : (e as object)); 
      }
    }
  } catch (e) {    
    httpMessage!.emitMessageToBrowser(body, 520, {}, typeof e === 'string' ? {error: e} : (e as object));    
  }

  function recordHttpRequest (): HttpMessage {
    const proxyType = reqUrl.protocol ? 'forward' : 'reverse';
    let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl, proxyType);
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
    const sequenceNumber = ++Global.nextSequenceNumber;
    const httpMessage = new HttpMessage(
      reqUrl.protocol as MessageProtocol,
      proxyConfig,
      sequenceNumber,
      clientHostName,
      method,
      url,
      headers
    );
    httpMessage.emitMessageToBrowser(body);

    return httpMessage;
  }

  function recordHttpResponse (response: any, data: any) {
    httpMessage.emitMessageToBrowser(body, response.status, response.headers, data);
  }
};

export default resend;
