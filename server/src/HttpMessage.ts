import ProxyConfig from '../../common/ProxyConfig'
import { MessageType, NO_RESPONSE } from '../../common/Message'
import SocketMessage from './SocketIoMessage'
import Global from './Global'

export default class HttpMessage {
  private startTime: number;
  private proxyConfig: ProxyConfig;
  private sequenceNumber = 0;
  private remoteAddress: string;

  public constructor (proxyConfig: ProxyConfig, sequenceNumber: number, remoteAddress: string) {
    this.startTime = Date.now()
    this.proxyConfig = proxyConfig
    this.sequenceNumber = sequenceNumber
    this.remoteAddress = remoteAddress
  }

  public async emitMessageToBrowser (
    method: string,
    url: string,
    reqHeaders: {} = {},
    reqBody: string | object = '',
    resStatus = 0,
    resHeaders = {},
    resBody: string | object = NO_RESPONSE
  ) {
    const reqBodyJson = typeof reqBody === 'object' ? reqBody : this.toJSON(reqBody)
    const resBodyJson = resBody === NO_RESPONSE || typeof resBody === 'object' ? resBody : this.toJSON(resBody)
    const host = this.getHostPort(this.proxyConfig)

    const message = await SocketMessage.buildRequest(Date.now(),
      this.sequenceNumber,
      reqHeaders,
      method,
      url,
      this.getHttpEndpoint(method, url, reqBodyJson),
      reqBodyJson,
      this.remoteAddress,
      host, // server host
      this.proxyConfig ? this.proxyConfig.path : '',
      Date.now() - this.startTime)

    SocketMessage.appendResponse(message, resHeaders, resBodyJson, resStatus, Date.now() - this.startTime)

    Global.socketIoManager.emitMessageToBrowser(
      resBody === NO_RESPONSE ? MessageType.REQUEST : MessageType.RESPONSE,
      message,
      this.proxyConfig)
  }

  private toJSON (s: string): object | string {
    try {
      return JSON.parse(s)
    } catch (e) {
      return s
    }
  }

  private getHostPort (proxyConfig: ProxyConfig) {
    let host = proxyConfig.hostname
    if (proxyConfig.port) host += ':' + proxyConfig.port
    return host
  }

  private getHttpEndpoint = (method: string, url: string, requestBody: string | {}): string => {
    let endpoint = url.split('?')[0]
    const tokens = endpoint?.split('/')
    endpoint = tokens ? tokens[tokens.length - 1] : ''
    if (!isNaN(+endpoint) && tokens && tokens.length > 1) {
      endpoint = tokens[tokens.length - 2] + '/' + tokens[tokens.length - 1]
    }

    if (method !== 'OPTIONS' &&
          (url.endsWith('/graphql') || url.endsWith('/graphql-public'))) {
      endpoint = ''
      if (requestBody && Array.isArray(requestBody)) {
        requestBody.forEach((entry) => {
          if (entry.operationName) {
            if (endpoint!.length > 0) endpoint += ','
            endpoint += ' ' + entry.operationName
          }
        })
      }
      const tag = url.endsWith('/graphql-public') ? 'GQLP' : 'GQL'
      endpoint = ' ' + tag + endpoint
    }
    if ('/' + endpoint === url) endpoint = ''
    return endpoint
  }
}
