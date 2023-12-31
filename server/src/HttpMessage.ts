import ProxyConfig from '../../common/ProxyConfig';
import Message, { MessageProtocol, MessageType, NO_RESPONSE } from '../../common/Message';
import SocketIoMessage from './SocketIoMessage';
import Global from './Global';

export default class HttpMessage {
  private emitCount = 0;
  private startTime: number;
  private messageProtocol: MessageProtocol;
  private proxyConfig: ProxyConfig | undefined;
  private sequenceNumber = 0;
  private remoteAddress: string;
  private method: string;
  private url: string;
  private reqHeaders: {};

  public constructor(
    messageProtocol: MessageProtocol,
    proxyConfig: ProxyConfig | undefined,
    sequenceNumber: number,
    remoteAddress: string,
    method: string,
    url: string,
    reqHeaders: {}
  ) {
    this.startTime = Date.now();
    this.messageProtocol = messageProtocol;
    this.proxyConfig = proxyConfig;
    this.sequenceNumber = sequenceNumber;
    this.remoteAddress = remoteAddress;
    this.method = method;
    this.url = url;
    this.reqHeaders = reqHeaders;
    this.reqHeaders = this.sortObjectKeys(this.reqHeaders)
  }

  public async emitMessageToBrowser(
    reqBody: string | object = '',
    resStatus = 0,
    resHeaders = {},
    resBody: string | object = NO_RESPONSE
  ) {
    const message = await this.buildMessage(reqBody, resStatus, resHeaders, resBody);
    this.emitMessageToBrowser2(message);
  }

  public async emitMessageToBrowser2(
    message: Message
  ) {
    Global.socketIoManager.emitMessageToBrowser(
      message.responseBody === NO_RESPONSE
        ? MessageType.REQUEST
        : this.emitCount === 0
          ? MessageType.REQUEST_AND_RESPONSE
          : MessageType.RESPONSE,
      message,
      this.proxyConfig
    );
    ++this.emitCount;
  }

  public async buildMessage(
    reqBody: string | object = '',
    resStatus = 0,
    resHeaders = {},
    resBody: string | object = NO_RESPONSE
  ): Promise<Message> {
    const reqBodyJson = typeof reqBody === 'object' ? reqBody : this.toJSON(reqBody);
    const resBodyJson = resBody === NO_RESPONSE || typeof resBody === 'object' ? resBody : this.toJSON(resBody);
    const host = this.proxyConfig ? this.getHostPort(this.proxyConfig, this.reqHeaders) : 'Unknown';

    const message = await SocketIoMessage.buildRequest(
      Date.now(),
      this.sequenceNumber,
      this.reqHeaders,
      this.method,
      this.url,
      this.getHttpEndpoint(this.method, this.url, reqBodyJson),
      reqBodyJson,
      this.remoteAddress,
      host, // server host
      this.proxyConfig ? this.proxyConfig.path : '',
      Date.now() - this.startTime
    );
    message.protocol = this.messageProtocol;

    resHeaders = this.sortObjectKeys(resHeaders);
    SocketIoMessage.appendResponse(message, resHeaders, resBodyJson, resStatus, Date.now() - this.startTime);
    return message;
  }

  private toJSON(s: string): object | string {
    try {
      return JSON.parse(s);
    } catch (e) {
      return s;
    }
  }

  private getHostPort(proxyConfig: ProxyConfig, reqHeaders: { [key: string]: string }) {
    if (proxyConfig.hostname && proxyConfig.hostname.length > 0) {
      let host = proxyConfig.hostname;
      if (proxyConfig.port) host += ':' + proxyConfig.port;
      return host;
    } else {
      return reqHeaders.host;
    }
  }

  private getHttpEndpoint = (method: string, url: string, requestBody: string | {}): string => {
    let endpoint = url.split('?')[0];
    const tokens = endpoint.split('/');
    endpoint = tokens ? tokens[tokens.length - 1] : '';
    // Include the last 2 path segments, if this looks like and id (e.g., '/items/111222')
    if (tokens && tokens.length > 1 /*&& tokens[tokens.length - 2].endsWith('s')*/) {
      endpoint = tokens[tokens.length - 2] + '/' + tokens[tokens.length - 1];
    }

    // GraphQL?
    if (method !== 'OPTIONS' &&
      (url.endsWith('/graphql') || url.endsWith('/graphql-public'))) {
      endpoint = '';
      if (typeof requestBody === 'object') {
        if (Array.isArray(requestBody)) {
          requestBody.forEach((entry) => {
            if (entry.operationName) {
              if (endpoint!.length > 0) endpoint += ',';
              endpoint += ' ' + entry.operationName;
            }
          });
        } else {
          for (const key in requestBody) {
            if (key === 'operationName') {
              if (endpoint!.length > 0) endpoint += ',';
              endpoint += ' ' + (requestBody as { [key: string]: string })[key];
            }
          }
        }
      }
      const tag = url.endsWith('/graphql-public') ? 'GQLP' : 'GQL';
      endpoint = ' ' + tag + endpoint;
    }
    if (url === '/') endpoint = '';
    return endpoint;
  }

  private sortObjectKeys(o: { [key: string]: any }): { [key: string]: any } {
    const out: { [key: string]: any } = {};
    const keys = Object.keys(o).sort();
    for (const key of keys) {
      out[key] = o[key];
    }
    return out;
  }

}
