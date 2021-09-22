import Message from '../../common/Message'
import { IncomingHttpHeaders, IncomingMessage } from 'http'
import querystring from 'querystring'
import { getHttpEndpoint } from '../../HttpProxy'
import Global from './Global'
const decompressResponse = require('decompress-response')

export default class SocketMessage {
  /**
   * Parse request data
   */
  public static async parseRequest (clientReq: IncomingMessage, startTime: number, sequenceNumber: number, host: string, path: string)
    : Promise<Message> {
    return new Promise(function (resolve) {
      clientReq.setEncoding('utf8')
      let rawData = ''
      clientReq.on('data', function (chunk) {
        rawData += chunk
      })

      let requestBody: string|{}
      clientReq.on('end', async function () {
        try {
          requestBody = JSON.parse(rawData)
        } catch (e) {
          const contentType = clientReq.headers['content-type']
          if (contentType && contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
            requestBody = querystring.parse(rawData)
          } else {
            requestBody = rawData
          }
        }

        const message = await buildRequest(Date.now(),
          sequenceNumber,
          clientReq.headers,
          clientReq.method,
          clientReq.url,
          getHttpEndpoint(clientReq, requestBody),
          requestBody,
          clientReq.socket.remoteAddress,
          host, // server host
          path,
          Date.now() - startTime)

        resolve(message)
      })
    })
  }

  public static buildRequest (timestamp: number, sequenceNumber: number, requestHeaders: IncomingHttpHeaders, method: string, url: string, endpoint: string, requestBody:string|{}, clientIp: string, serverHost: string, path:string, elapsedTime:number)
    : Promise<Message> {
    return buildRequest(timestamp, sequenceNumber, requestHeaders, method, url, endpoint, requestBody, clientIp, serverHost, path, elapsedTime)
  }

  /**
   * Parse response
   */
  public static parseResponse (proxyRes: any, startTime: number, message: Message): Promise<Message> {
    return new Promise((resolve) => {
      if (proxyRes.headers) {
        if (proxyRes.headers['content-encoding']) {
          proxyRes = decompressResponse(proxyRes)
          // delete proxyRes.headers['content-encoding'];
        }

        if (proxyRes.headers['content-type'] &&
            proxyRes.headers['content-type'].indexOf('utf-8') !== -1) {
          proxyRes.setEncoding('utf8')
        }
      }

      let rawData = ''
      proxyRes.on('data', function (chunk: string) {
        rawData += chunk
      })
      proxyRes.on('end', () => {
        let parsedData
        try {
          parsedData = JSON.parse(rawData) // assume JSON
        } catch (e) {
          parsedData = rawData
        }

        this.appendResponse(message, proxyRes.headers, parsedData, proxyRes.statusCode, Date.now() - startTime)

        resolve(message)
      })
    })
  }

  public static appendResponse (message: Message, responseHeaders: {}, responseBody:{}|string, status:number, elapsedTime:number) {
    appendResponse(message, responseHeaders, responseBody, status, elapsedTime)
  }
};

async function buildRequest (timestamp:number, sequenceNumber:number, requestHeaders:{}, method:string|undefined, url:string|undefined, endpoint:string, requestBody:{}|string, clientIp:string|undefined, serverHost:string, path:string, elapsedTime:number)
  : Promise<Message> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<Message>(async (resolve) => {
    if (clientIp) {
      clientIp = await Global.resolveIp(clientIp)
      resolve(initMessage())
    } else {
      clientIp = 'unknown'
      resolve(initMessage())
    }
  })

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
    }
    return message as Message
  }
}

function appendResponse (message: Message, responseHeaders: {}, responseBody: {}, status:number, elapsedTime:number) {
  message.responseHeaders = responseHeaders
  message.responseBody = responseBody
  message.status = status
  message.elapsedTime = elapsedTime
  return message
}
