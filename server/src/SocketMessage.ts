import Message from '../../common/Message';
import { IncomingHttpHeaders } from 'http';
import Global from './Global';

export default class SocketMessage {
  public static buildRequest (timestamp: number, sequenceNumber: number, requestHeaders: IncomingHttpHeaders, method: string, url: string, endpoint: string, requestBody:string|{}, clientIp: string, serverHost: string, path:string, elapsedTime:number)
    : Promise<Message> {
    return buildRequest(timestamp, sequenceNumber, requestHeaders, method, url, endpoint, requestBody, clientIp, serverHost, path, elapsedTime);
  }

  public static appendResponse (message: Message, responseHeaders: {}, responseBody:{}|string, status:number, elapsedTime:number) {
    appendResponse(message, responseHeaders, responseBody, status, elapsedTime);
  }
};

async function buildRequest (timestamp:number, sequenceNumber:number, requestHeaders:{}, method:string|undefined, url:string|undefined, endpoint:string, requestBody:{}|string, clientIp:string|undefined, serverHost:string, path:string, elapsedTime:number)
  : Promise<Message> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<Message>(async (resolve) => {
    if (clientIp) {
      clientIp = await Global.resolveIp(clientIp);
      resolve(initMessage());
    } else {
      clientIp = 'unknown';
      resolve(initMessage());
    }
  });

  function initMessage (): Message {
    const message = {
      timestamp,
      sequenceNumber,
      requestHeaders,
      method,
      protocol: 'http:',
      url,
      endpoint,
      requestBody,
      clientIp,
      serverHost,
      path,
      elapsedTime,
      responseHeaders: {},
      responseBody: {},
      status: 0
    };
    return message as Message;
  }
}

function appendResponse (message: Message, responseHeaders: {}, responseBody: {}, status:number, elapsedTime:number) {
  message.responseHeaders = responseHeaders;
  message.responseBody = responseBody;
  message.status = status;
  message.elapsedTime = elapsedTime;
  return message;
}
