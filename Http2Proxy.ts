import url from 'url'
import http2, { Http2ServerRequest, Http2ServerResponse } from 'http2'
import Global from './server/src/Global'
import ProxyConfig from './common/ProxyConfig'
import HttpMessage from './server/src/HttpMessage'
import querystring from 'querystring'
import HexFormatter from './server/src/formatters/HexFormatter'
// const decompressResponse = require('decompress-response')

const debug = false

const settings = { maxConcurrentStreams: undefined }

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpProxy {
  public constructor (proxyConfig: ProxyConfig) {
    const server = http2.createServer({
      settings
    }) // HTTPS is not currently supported
    proxyConfig._server = server

    listen(server)

    let retries = 0
    let wait = 1000

    server.on('error', (err) => {
      if (++retries < 10) {
        setTimeout(() => listen(server), wait *= 2)
      } else {
        if (debug) console.error('Http2Proxy server error', err)
      }
    })

    server.on('request', onRequest)

    function listen (server: http2.Http2Server) {
      server.listen(proxyConfig.path, () => {
        if (debug) console.log(`Listening on http2 port ${proxyConfig.path} for target host ${proxyConfig.hostname}`)
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
        clientReq.on('error', function (error) {
          console.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2))
        })

        const headers = clientReq.headers
        let authority = proxyConfig.hostname
        if (proxyConfig.port) authority += ':' + proxyConfig.port
        headers[http2.constants.HTTP2_HEADER_AUTHORITY] = authority

        let { hostname, port } = proxyConfig.protocol === 'browser:' || proxyConfig.protocol === 'log:'
          ? reqUrl
          : proxyConfig
        if (port === undefined) {
          port = proxyConfig.protocol === 'https:' ? 443 : 80
        }

        const proxyClient = http2.connect(
          `http://${hostname}:${port}`,
          { settings }
        )

        proxyClient.on('error', async (err) => {
          const requestBody = await requestBodyPromise
          httpMessage.emitMessageToBrowser(requestBody, 404, {}, { err, 'anyproxy-config': proxyConfig })
        })

        const chunks: Buffer[] = []
        let trailers = {}
        const proxyStream = proxyClient.request(headers)

        proxyStream.on('trailers', (headers, _flags) => {
          if (debug) console.log('trailers', headers)
          clientRes.addTrailers(headers)
          trailers = headers
        })

        proxyStream.on('response', (headers, flags) => {
          if (debug) console.log('on response', clientReq.url, headers, flags)
          clientRes.stream.respond(headers, { waitForTrailers: true })
          // proxyStream.pipe(clientRes, {
          //   end: true
          // })
          proxyStream.on('data', function (chunk: Buffer) {
            clientRes.write(chunk)
            chunks.push(chunk)
          })

          proxyStream.on('end', async () => {
            if (debug) console.log('end of response received')
            clientRes.end()
            proxyClient.close()

            const requestBody = await requestBodyPromise

            // chunks.push(headers)
            const resBody = getResBody(chunks)
            const allHeaders = {
              ...headers,
              ...trailers
            }
            httpMessage.emitMessageToBrowser(requestBody, headers[':status'], allHeaders, resBody)
          })
        })

        // Forward the client request
        clientReq.pipe(proxyStream, {
          end: true
        })
      }

      function getReqBody (clientReq: Http2ServerRequest): Promise<string | {}> {
        return new Promise<string | {}>(resolve => {
          // eslint-disable-next-line no-unreachable
          let requestBody: string | {} = ''
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

      function getResBody (chunks: Buffer[]): object | string {
        if (chunks.length === 0) return ''
        const resBuffer = chunks.reduce(
          (prevChunk, chunk) => Buffer.concat([prevChunk, chunk], prevChunk.length + chunk.length)
        )
        const resString = resBuffer.toString()
        let resBody = ''
        try {
          resBody = JSON.parse(resString) // assume JSON
        } catch (e) {
          resBody = resString
        }
        // gRPC is binary data
        if (proxyConfig.protocol === 'grpc:') {
          resBody = HexFormatter.format(Buffer.from(resBody, 'utf-8'))
        }
        return resBody
      }
    }
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig._server) proxyConfig._server.close()
  }
}
