import net from 'net'
import tls from 'tls'
import fs from 'fs'
import Global from './Global'
import SocketIoMessage from './SocketMessage'
import HexFormatter from './formatters/HexFormatter'
import SqlFormatter from './formatters/SqlFormatter'
import MongoFormatter from './formatters/MongoFormatter'
import RedisFormatter from './formatters/RedisFormatter'
import ProxyConfig from '../../common/ProxyConfig'
import { MessageProtocol, MessageType, NO_RESPONSE } from '../../common/Message'
import Paths from './Paths'

export default class TcpProxy {
  constructor (proxyConfig: ProxyConfig) {
    this.startProxy(proxyConfig)
  }

  static destructor (proxyConfig: ProxyConfig) {
    if (proxyConfig._server) proxyConfig._server.close()
  }

  /**
     * Star proxy
     * @param proxyConfig
     */
  startProxy (proxyConfig: ProxyConfig) {
    const sourcePort = proxyConfig.path
    const targetHost = proxyConfig.hostname
    const targetPort = proxyConfig.port

    let server: net.Server | tls.Server

    if (proxyConfig.isSecure) {
      const tlsOptions = {
        key: fs.readFileSync(Paths.serverKey()),
        cert: fs.readFileSync(Paths.serverCrt())
      }

      server = tls.createServer(tlsOptions, onConnect)
    } else {
      server = net.createServer(onConnect)
    }

    let retries = 0
    let wait = 1000
    server.on('error', (err) => {
      if (++retries < 10) {
        setTimeout(() => listen(server), wait *= 2)
      } else {
        console.error('TcpProxy server error', err)
      }
    })

    listen(server)

    function listen (server: net.Server) {
      server.listen(sourcePort, function () {
        console.log('Listening on port ' + sourcePort + ' for target host ' + targetHost + ':' + targetPort)
      })
      proxyConfig._server = server
    }

        type RequestInfo = {
            data: Buffer,
            sequenceNumber: number,
            startTime: number,
        }

        // Create server (source) socket
        function onConnect (sourceSocket: any) {
          const requests: RequestInfo[] = []

          // Connect to target host
          let targetSocket: net.Socket | tls.TLSSocket
          if (!proxyConfig.isSecure) {
            targetSocket = net.connect(targetPort, targetHost, () => {
              // console.log('connected to target');
            })
          } else {
            targetSocket = tls.connect(targetPort, targetHost, {}, () => {
              // console.log('connected to target');
            })
          }

          sourceSocket.on('error', (err: any) => {
            console.error(`TcpProxy client error ${sourcePort}: ${err}`)
          })

          targetSocket.on('error', (err) => {
            console.error(`TcpProxy server error ${sourcePort}: ${err}`)
          })

          // Handle data from source (client)
          sourceSocket.on('data', async (data: Buffer) => {
            const request = {
              data,
              startTime: Date.now(),
              sequenceNumber: ++Global.nextSequenceNumber
            }
            requests.push(request)
            targetSocket.write(data)
            await processData(request, null)
          })

          // Handle data from target (e.g., database)
          targetSocket.on('data', async (data) => {
            sourceSocket.write(data)
            if (requests.length > 0) {
              const request = requests.pop()
              await processData(request!, data)
            }
          })

          // Handle source socket closed
          sourceSocket.on('close', () => {
            targetSocket.end()
          })

          // Handle target socket closed
          targetSocket.on('close', () => {
            sourceSocket.end()
          })

          async function processData (request: RequestInfo, response: Buffer|null): Promise<number> {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve) => {
              let requestString = ''
              let responseString = ''
              let url = ''
              let status = 0
              let noResponseRequired = false
              switch (proxyConfig.protocol) {
                case 'sql:': {
                  const sqlFormatter = new SqlFormatter(request.data, response!)
                  requestString = sqlFormatter.getQuery()
                  responseString = sqlFormatter.getResults()
                  status = sqlFormatter.getErrorCode()
                  for (const line of requestString.split('\n')) {
                    if (line.indexOf('/*') !== -1) continue
                    url += line + ' '
                    if (url.length >= 64) break
                  }
                  noResponseRequired = sqlFormatter.getCommand() === 'Close'
                  break
                }
                case 'mongo:': {
                  const mongoFormatter = new MongoFormatter(request.data, response!)
                  requestString = mongoFormatter.getRequest()
                  responseString = mongoFormatter.getResponse()
                  url = requestString.split('\n')[0]
                  break
                }
                case 'redis:': {
                  const redisFormatter = new RedisFormatter(request.data, response!)
                  requestString = redisFormatter.getRequest()
                  responseString = redisFormatter.getResponse()
                  for (const line of requestString.split('\n')) {
                    url += line + ' '
                    if (url.length >= 64) break
                  }
                  break
                }
                default:
                  requestString = HexFormatter.format(request.data)
                  responseString = response
                    ? '\n' + HexFormatter.format(response) + '\n'
                    : NO_RESPONSE
                  if (requestString.length <= 64) {
                    url = requestString
                  } else {
                    url = requestString.substring(0, Math.min(requestString.indexOf('\n'), requestString.length))
                    if (url.length < 16) url = requestString.substring(0, Math.min(requestString.indexOf('\n', url.length + 1), requestString.length))
                  }
                  break
              }

              if (requestString.length > 0) {
                const endpoint = ''

                const message = await SocketIoMessage.buildRequest(
                  request.startTime,
                  request.sequenceNumber,
                  {}, // headers
                  '', // method
                  url, // url
                  endpoint, // endpoint
                  { anyproxy_inner_body: requestString }, // req body
                  sourceSocket.remoteAddress, // clientIp
                  targetHost + ':' + targetPort, // serverHost
                  '', // path
                  Date.now() - request.startTime)
                SocketIoMessage.appendResponse(message, {}, responseString, status, Date.now() - request.startTime)
                message.protocol = proxyConfig.protocol as MessageProtocol
                Global.socketIoManager.emitMessageToBrowser(
                  response === null
                    ? responseString === NO_RESPONSE && noResponseRequired === false
                      ? MessageType.REQUEST
                      : MessageType.REQUEST_AND_RESPONSE
                    : MessageType.RESPONSE,
                  message,
                  proxyConfig)
              }
              resolve(0)
            })
          }
        }
  }
}
