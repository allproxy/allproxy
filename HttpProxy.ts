import fs from 'fs'
import path from 'path'
import url from 'url'
import http, { IncomingMessage } from 'http'
import https from 'https'
import Global from './server/src/Global'
import ProxyConfig from './common/ProxyConfig'
import HttpMessage from './server/src/HttpMessage'
import querystring from 'querystring'
const decompressResponse = require('decompress-response')

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpProxy {
  async onRequest (clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    const sequenceNumber = ++Global.nextSequenceNumber
    const remoteAddress = clientReq.socket.remoteAddress
    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '')

    let httpMessage: HttpMessage

    const clientDir = __dirname.endsWith(path.sep + 'build')
      ? __dirname + '' + path.sep + '..' + path.sep + 'client' + path.sep + 'build'
      : __dirname + '' + path.sep + 'client' + path.sep + 'build'

    if (reqUrl.pathname === '/' + 'middleman' || reqUrl.pathname === '/' + 'anyproxy') {
      clientRes.writeHead(200, {
        'content-type': 'text/html'
      })
      clientRes.end(fs.readFileSync(clientDir + path.sep + 'index.html'))
    } else {
      const dir = clientDir + reqUrl.pathname?.replace(/\//g, path.sep)
      // File exists locally?
      if (reqUrl.protocol === null &&
                fs.existsSync(dir) && fs.lstatSync(dir).isFile()) {
        const extname = path.extname(reqUrl.pathname!)
        let contentType = 'text/html'
        switch (extname) {
          case '.js':
            contentType = 'text/javascript'
            break
          case '.css':
            contentType = 'text/css'
            break
          case '.json':
            contentType = 'application/json'
            break
          case '.png':
            contentType = 'image/png'
            break
          case '.jpg':
            contentType = 'image/jpg'
            break
          case '.wav':
            contentType = 'audio/wav'
            break
        }

        // Read local file and return to client
        clientRes.writeHead(200, {
          'content-type': contentType
        })
        clientRes.end(fs.readFileSync(clientDir + reqUrl.pathname))
      } else if (reqUrl.protocol === null &&
                reqUrl.pathname === '/api/anyproxy/config') {
        const configs = await Global.socketIoManager.updateHostReachable()
        clientRes.writeHead(200, {
          'content-type': 'application/json'
        })
        clientRes.end(JSON.stringify(configs, null, 2))
      } else {
        // Find matching proxy configuration
        const clientHostName = await Global.resolveIp(clientReq.socket.remoteAddress)
        let proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('http:', clientHostName, reqUrl)
        // Always proxy forward proxy requests
        if (proxyConfig === undefined && reqUrl.protocol !== null) {
          proxyConfig = new ProxyConfig()
          proxyConfig.path = reqUrl.pathname!
          proxyConfig.protocol = reqUrl.protocol
          proxyConfig.hostname = reqUrl.hostname!
          proxyConfig.port = reqUrl.port === null
            ? reqUrl.protocol === 'http:' ? 80 : 443
            : +reqUrl.port
        }

        httpMessage = new HttpMessage(
          proxyConfig,
          sequenceNumber,
          remoteAddress!,
          clientReq.method!,
          clientReq.url!,
          clientReq.headers
        )

        const requestBodyPromise = getReqBody(clientReq)

        if (proxyConfig === undefined) {
          const requestBody = await requestBodyPromise
          const error = 'No matching proxy configuration found for ' + reqUrl.pathname
          if (reqUrl.pathname === '/') {
            clientRes.writeHead(302, { Location: reqUrl.href + 'anyproxy' })
            clientRes.end()
          } else {
            httpMessage.emitMessageToBrowser(requestBody, 404, {}, { error })
          }
        } else {
          httpMessage.emitMessageToBrowser('') // No request body received yet
          proxyRequest(proxyConfig, requestBodyPromise)
        }
      }
    }

    function proxyRequest (proxyConfig: ProxyConfig, requestBodyPromise: Promise<string | {}>) {
      clientReq.on('close', function () {
        // sendErrorResponse(499, "Client closed connection", undefined, proxyConfig.path);
      })

      clientReq.on('error', function (error) {
        console.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2))
      })

      let method = clientReq.method

      // GET request received with body?
      if (clientReq.method === 'GET' &&
          clientReq.headers['content-length'] && +clientReq.headers['content-length'] > 0) {
        method = 'POST' // forward request as POST
      }

      const headers = clientReq.headers
      headers.host = proxyConfig.hostname
      if (proxyConfig.port) headers.host += ':' + proxyConfig.port

      let { protocol, hostname, port } = proxyConfig.protocol === 'browser:' || proxyConfig.protocol === 'log:'
        ? reqUrl
        : proxyConfig
      if (port === undefined) {
        port = proxyConfig.protocol === 'https:' ? 443 : 80
      }

      const options = {
        protocol,
        hostname,
        port,
        path: clientReq.url,
        method,
        headers
      }

      let proxy
      if (options.protocol === 'https:') {
        // options.cert: fs.readFileSync('/home/davidchr/imlTrust.pem');
        // options.headers.Authorization = 'Basic ' + new Buffer.from('elastic:imliml').toString('base64'); // hardcoded authentication
        proxy = https.request(options, handleResponse)
      } else {
        proxy = http.request(options, handleResponse)
      }

      async function handleResponse (proxyRes: http.IncomingMessage) {
        const requestBody = await requestBodyPromise
        if (
          typeof requestBody === 'object' ||
          (typeof requestBody === 'string' && requestBody.length > 0)
        ) {
          httpMessage.emitMessageToBrowser(requestBody)
        }

        /**
         * Forward the response back to the client
         */
        clientRes.writeHead((proxyRes as any).statusCode, proxyRes.headers)
        proxyRes.pipe(clientRes, {
          end: true
        })

        const resBody = await getResBody(proxyRes)
        httpMessage.emitMessageToBrowser(requestBody, proxyRes.statusCode, proxyRes.headers, resBody)
      }

      proxy.on('error', async function (error) {
        console.error(sequenceNumber, 'Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig)
        const requestBody = await requestBodyPromise
        httpMessage.emitMessageToBrowser(requestBody, 404, {}, { error, config: proxyConfig })
      })

      clientReq.pipe(proxy, {
        end: true
      })
    }

    function getReqBody (clientReq: IncomingMessage): Promise<string | {}> {
      return new Promise<string | {}>(resolve => {
        let requestBody: string | {} = ''
        clientReq.setEncoding('utf8')
        let rawData = ''
        clientReq.on('data', function (chunk) {
          rawData += chunk
        })
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
          resolve(requestBody)
        })
      })
    }

    function getResBody (proxyRes: any): Promise<object | string> {
      return new Promise<string | {}>(resolve => {
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
        let parsedData = ''
        proxyRes.on('end', () => {
          try {
            parsedData = JSON.parse(rawData) // assume JSON
          } catch (e) {
            parsedData = rawData
          }
          resolve(parsedData)
        })
      })
    }
  }
}
