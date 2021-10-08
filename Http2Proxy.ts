import url from 'url'
import http2, { ClientHttp2Stream, Http2ServerRequest, Http2ServerResponse } from 'http2'
import Global from './server/src/Global'
import ProxyConfig from './common/ProxyConfig'
import HttpMessage from './server/src/HttpMessage'
import querystring from 'querystring'
import HexFormatter from './server/src/formatters/HexFormatter'
const decompressResponse = require('decompress-response')

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpProxy {
  public constructor (proxyConfig: ProxyConfig) {
    const server = http2.createServer() // HTTPS is not currently supported
    proxyConfig._server = server

    listen(server)

    let retries = 0
    let wait = 1000

    server.on('error', (err) => {
      if (++retries < 10) {
        setTimeout(() => listen(server), wait *= 2)
      } else {
        console.error('Http2Proxy server error', err)
      }
    })

    server.on('request', onRequest)

    function listen (server: http2.Http2Server) {
      server.listen(proxyConfig.port, () => {
        console.log(`Listening on http2 port ${proxyConfig.port} for target host ${proxyConfig.hostname}`)
      })
    }

    async function onRequest (clientReq: Http2ServerRequest, clientRes: Http2ServerResponse) {
      const sequenceNumber = ++Global.nextSequenceNumber
      const remoteAddress = clientReq.socket.remoteAddress
      // eslint-disable-next-line node/no-deprecated-api
      const reqUrl = url.parse(clientReq.url ? clientReq.url : '')

      const httpMessage = new HttpMessage(
        proxyConfig,
        sequenceNumber,
        remoteAddress!,
        clientReq.method!,
        clientReq.url!,
        clientReq.headers
      )

      const requestBodyPromise = getReqBody(clientReq)

      httpMessage.emitMessageToBrowser('') // No request body received yet
      proxyRequest(proxyConfig!, requestBodyPromise)

      function proxyRequest (proxyConfig: ProxyConfig, requestBodyPromise: Promise<string | {}>) {
        clientReq.on('close', function () {
          // sendErrorResponse(499, "Client closed connection", undefined, proxyConfig.path);
        })

        clientReq.on('error', function (error) {
          console.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2))
        })

        const headers = clientReq.headers
        headers.host = proxyConfig.hostname
        if (proxyConfig.port) headers.host += ':' + proxyConfig.port
        headers[http2.constants.HTTP2_HEADER_AUTHORITY] = headers.host

        let { hostname, port } = proxyConfig.protocol === 'browser:' || proxyConfig.protocol === 'log:'
          ? reqUrl
          : proxyConfig
        if (port === undefined) {
          port = proxyConfig.protocol === 'https:' ? 443 : 80
        }

        const proxyClient = http2.connect(`http://${hostname}:${port}`)

        proxyClient.on('error', async (err) => {
          const requestBody = await requestBodyPromise
          httpMessage.emitMessageToBrowser(requestBody, 404, {}, { err, 'anyproxy-config': proxyConfig })
        })

        const proxyReq = proxyClient.request(headers)
        clientReq.pipe(proxyReq, {
          end: true
        })

        proxyReq.on('response', async (headers, _flags) => {
          const requestBody = await requestBodyPromise
          /**
          * Forward the response back to the client
          */
          const headers2 = { ...headers }
          for (const header in headers2) {
            if (header.includes(':')) {
              delete headers2[header]
            }
          }
          clientRes.writeHead(Number(headers[':status']), headers2)
          proxyReq.pipe(clientRes, {
            end: true
          })

          const resBody = await getResBody(proxyReq, headers)
          httpMessage.emitMessageToBrowser(requestBody, headers[':status'], headers, resBody)
        })

        proxyReq.on('end', () => {
          proxyClient.close()
        })
      }

      function getReqBody (clientReq: Http2ServerRequest): Promise<string | {}> {
        return new Promise<string | {}>(resolve => {
          // eslint-disable-next-line no-unreachable
          let requestBody: string | {} = ''
          clientReq.setEncoding('utf8')
          let rawData = ''
          clientReq.on('data', function (chunk) {
            rawData += chunk
          })
          // eslint-disable-next-line no-unreachable
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
            if (proxyConfig.protocol === 'grpc:') {
              requestBody = HexFormatter.format(Buffer.from(requestBody as string, 'utf-8'))
            }
            resolve(requestBody)
          })
        })
      }

      function getResBody (proxyRes: ClientHttp2Stream, headers: http2.IncomingHttpHeaders): Promise<object | string> {
        return new Promise<string | {}>(resolve => {
          if (headers['content-encoding']) {
            proxyRes = decompressResponse(proxyRes)
          }

          let rawData = ''
          proxyRes.on('data', function (chunk: string) {
            rawData += chunk
          })
          let parsedData = ''
          proxyRes.on('end', () => {
            try {
              parsedData = JSON.parse(rawData) // assume JSON
            } catch (e) {
              parsedData = rawData
            }
            if (proxyConfig.protocol === 'grpc:') {
              parsedData = HexFormatter.format(Buffer.from(parsedData, 'utf-8'))
            }
            resolve(parsedData)
          })
        })
      }
    }
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig._server) proxyConfig._server.close()
  }
}
