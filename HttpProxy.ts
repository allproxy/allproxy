import fs from 'fs'
import path from 'path'
import url from 'url'
import http, { IncomingMessage } from 'http'
import https from 'https'
import SocketMessage from './server/src/SocketIoMessage'
import Global from './server/src/Global'
import ProxyConfig from './common/ProxyConfig'
import Message, { MessageType, NO_RESPONSE } from './common/Message'

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpProxy {
  async onRequest (clientReq: IncomingMessage, clientRes: http.ServerResponse) {
    const sequenceNumber = ++Global.nextSequenceNumber
    const remoteAddress = clientReq.socket.remoteAddress
    Global.log(sequenceNumber, remoteAddress + ': ', clientReq.method, clientReq.url)

    // eslint-disable-next-line node/no-deprecated-api
    const reqUrl = url.parse(clientReq.url ? clientReq.url : '')

    let parseRequestPromise: Promise<any>

    const startTime = Date.now()
    const clientDir = __dirname.endsWith(path.sep + 'build')
      ? __dirname + '' + path.sep + '..' + path.sep + 'client' + path.sep + 'build'
      : __dirname + '' + path.sep + 'client' + path.sep + 'build'

    Global.log(reqUrl.pathname, reqUrl.search)
    if (reqUrl.pathname === '/' + 'middleman' || reqUrl.pathname === '/' + 'anyproxy') {
      Global.log(sequenceNumber, 'loading index.html')
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
        Global.log(sequenceNumber, 'loading local file')
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
          Global.log('No match found for forward proxy')
          proxyConfig = new ProxyConfig()
          proxyConfig.path = reqUrl.pathname!
          proxyConfig.protocol = reqUrl.protocol
          proxyConfig.hostname = reqUrl.hostname!
          proxyConfig.port = reqUrl.port === null
            ? reqUrl.protocol === 'http:' ? 80 : 443
            : +reqUrl.port
        }

        if (proxyConfig === undefined) {
          const msg = 'No matching proxy configuration found for ' + reqUrl.pathname
          Global.log(sequenceNumber, msg)
          if (reqUrl.pathname === '/') {
            clientRes.writeHead(302, { Location: reqUrl.href + 'anyproxy' })
            clientRes.end()
          } else {
            sendErrorResponse(404, msg)
          }
        } else {
          emitRequestToBrowser(proxyConfig)
          proxyRequest(proxyConfig)
        }
      }
    }

    async function emitRequestToBrowser (proxyConfig: ProxyConfig) {
      const host = HttpProxy.getHostPort(proxyConfig!)

      const message = await SocketMessage.buildRequest(Date.now(),
        sequenceNumber,
        clientReq.headers,
                  clientReq.method!,
                  clientReq.url!,
                  getHttpEndpoint(clientReq, {}),
                  {},
                  clientReq.socket.remoteAddress!,
                  host, // server host
                  proxyConfig.path,
                  Date.now() - startTime)
      SocketMessage.appendResponse(message, {}, NO_RESPONSE, 0, 0)
      Global.socketIoManager.emitMessageToBrowser(MessageType.REQUEST, message, proxyConfig)
    }

    function proxyRequest (proxyConfig: ProxyConfig) {
      // Global.log(sequenceNumber, 'proxyRequest');

      clientReq.on('close', function () {
        Global.log(sequenceNumber, 'Client closed connection')
        // sendErrorResponse(499, "Client closed connection", undefined, proxyConfig.path);
      })

      clientReq.on('error', function (error) {
        Global.log(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2))
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
        proxy = https.request(options, proxyRequest)
      } else {
        proxy = http.request(options, proxyRequest)
      }

      const host = proxyConfig.protocol === 'browser:' && hostname !== null
        ? hostname.split('.')[0]
        : HttpProxy.getHostPort(proxyConfig)
      parseRequestPromise = SocketMessage.parseRequest(
        clientReq,
        startTime,
        sequenceNumber,
        host,
        proxyConfig.path)

      function proxyRequest (proxyRes: http.IncomingMessage) {
        parseRequestPromise.then(function (message) {
          const parseResponsePromise = SocketMessage.parseResponse(proxyRes, startTime, message)

          /**
                     * Forward the response back to the client
                     */
          clientRes.writeHead((proxyRes as any).statusCode, proxyRes.headers)
          proxyRes.pipe(clientRes, {
            end: true
          })
          parseResponsePromise.then(function (message: Message) {
            Global.socketIoManager.emitMessageToBrowser(MessageType.RESPONSE, message, proxyConfig)
          })
            .catch(function (error: any) {
              Global.log(sequenceNumber, 'Parse response promise emit error:', error)
            })
        })
          .catch(function (error) {
            Global.error(sequenceNumber, 'Parse request promise rejected:', error)
          })
      }

      proxy.on('error', function (error) {
        Global.error(sequenceNumber, 'Proxy connect error', JSON.stringify(error, null, 2), 'config:', proxyConfig)
        sendErrorResponse(404, 'Proxy connect error', error, proxyConfig)
      })

      clientReq.pipe(proxy, {
        end: true
      })
    }

    function sendErrorResponse (status: number,
      responseMessage: string,
      jsonData?: { [key: string]: any },
      proxyConfig?: ProxyConfig) {
      Global.log(sequenceNumber, 'sendErrorResponse', responseMessage)
      const path = proxyConfig ? proxyConfig.path : ''
      if (parseRequestPromise === undefined) {
        const host = 'error'
        parseRequestPromise = SocketMessage.parseRequest(clientReq, startTime, sequenceNumber, host, path)
      }

      parseRequestPromise.then(function (message) {
        message.responseHeaders = {}
        message.responseBody = { error: responseMessage }
        if (jsonData && typeof jsonData === 'object') {
          for (const key in jsonData) {
            message.responseBody[key] = jsonData[key]
          }
        }
        message.status = status

        Global.socketIoManager.emitMessageToBrowser(MessageType.RESPONSE, message, proxyConfig) // Send error to all browsers

        if (responseMessage !== 'Client closed connection') {
          clientRes.on('error', function (error) {
            Global.error(sequenceNumber, 'sendErrorResponse error handled', JSON.stringify(error))
          })

          clientRes.writeHead(status, {
            'content-type': 'application/json'
          })

          clientRes.end(JSON.stringify(message.responseBody, null, 2))
        }
      })
        .catch(function (error) {
          Global.log(sequenceNumber, 'sendErrorResponse: Parse request promise rejected:', error.message)
        })
    }
  }

  static getHostPort (proxyConfig: ProxyConfig) {
    let host = proxyConfig.hostname
    if (proxyConfig.port) host += ':' + proxyConfig.port
    return host
  }
}

export const getHttpEndpoint = (clientReq: IncomingMessage, requestBody: string | {}): string => {
  let endpoint = clientReq.url?.split('?')[0]
  const tokens = endpoint?.split('/')
  endpoint = tokens ? tokens[tokens.length - 1] : ''
  if (!isNaN(+endpoint) && tokens && tokens.length > 1) {
    endpoint = tokens[tokens.length - 2] + '/' + tokens[tokens.length - 1]
  }

  if (clientReq.method !== 'OPTIONS' &&
        (clientReq.url?.endsWith('/graphql') || clientReq.url?.endsWith('/graphql-public'))) {
    endpoint = ''
    if (requestBody && Array.isArray(requestBody)) {
      requestBody.forEach((entry) => {
        if (entry.operationName) {
          if (endpoint!.length > 0) endpoint += ','
          endpoint += ' ' + entry.operationName
        }
      })
    }
    const tag = clientReq.url?.endsWith('/graphql-public') ? 'GQLP' : 'GQL'
    endpoint = ' ' + tag + endpoint
  }
  if ('/' + endpoint === clientReq.url) endpoint = ''
  return endpoint
}
