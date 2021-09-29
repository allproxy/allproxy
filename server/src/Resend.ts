import urlParser from 'url'
import Message from '../../common/Message'
import HttpMessage from './HttpMessage'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import ProxyConfig from '../../common/ProxyConfig'
import Global from './Global'

const resend = async (
  forwardProxy: boolean,
  method: string,
  url: string,
  message: Message,
  body?: string | object
) => {
  const headers: {[key: string]: string} = {}
  const unsafeHeaders = ['host',
    'connection',
    'content-length',
    'origin', 'user-agent',
    'referer',
    'accept-encoding',
    'cookie',
    'sec-fetch-dest',
    'proxy-connection'
  ]
  for (const header in message.requestHeaders) {
    if (unsafeHeaders.indexOf(header) === -1) {
      headers[header] = message.requestHeaders[header]
    }
  }

  const reqUrl = urlParser.parse(url)

  headers.anyproxy = 'resend'

  // console.log(`Resend ${method} ${url} \n${body} \n${headers}`)

  body = typeof body === 'string' && body.length === 0 ? undefined : body

  let httpMessage: HttpMessage
  let clientHostName: string
  if (forwardProxy) {
    clientHostName = await Global.resolveIp(reqUrl.hostname!)
    httpMessage = recordHttpRequest()
  }

  const map: Map<string, AxiosRequestConfig['method']> = new Map()
  map.set('GET', 'get')
  map.set('HEAD', 'head')
  map.set('POST', 'post')

  axios({
    method: map.get(method),
    url,
    data: body,
    headers
  }).then((response) => recordHttpResponse(response))
    .catch(error => {
      // console.log(error)
      recordHttpResponse(error.response)
    })

  function recordHttpRequest (): HttpMessage {
    let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl)
    // Always proxy forward proxy requests
    if (proxyConfig === undefined) {
      proxyConfig = new ProxyConfig()
      proxyConfig.path = reqUrl.pathname!
      proxyConfig.protocol = reqUrl.protocol!
      proxyConfig.hostname = reqUrl.hostname!
      proxyConfig.port = reqUrl.port === null
        ? reqUrl.protocol === 'http:' ? 80 : 443
        : +reqUrl.port
    }
    const sequenceNumber = ++Global.nextSequenceNumber
    const httpMessage = new HttpMessage(proxyConfig, sequenceNumber, clientHostName, method, url, headers)
    httpMessage.emitMessageToBrowser(body)

    return httpMessage
  }

  function recordHttpResponse (response: AxiosResponse) {
    httpMessage.emitMessageToBrowser(body, response.status, response.headers, response.data)
  }
}

export default resend
