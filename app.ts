import http from 'http'
import { exit } from 'process'
import https from 'https'
import Global from './server/src/Global'
import SocketIoManager from './server/src/SocketIoManager'
import HttpProxy from './server/src/HttpProxy'
import HttpsProxy from './server/src/HttpsProxy'
import HttpMitmProxy from './node-http-mitm-proxy'
const httpMitmProxy = HttpMitmProxy()

const listen: {protocol?: string,
      host?: string,
      port: number}[] = []
let httpServer: http.Server | https.Server

for (let i = 2; i < process.argv.length; ++i) {
  switch (process.argv[i]) {
    case '--help':
      usage()
      exit(1)
      break
    case '--listen':
    case '--listenHttps': {
      if (i + 1 >= process.argv.length) {
        usage()
        console.error('\nMissing --listen value.')
      }

      const protocol = process.argv[i] === '--listenHttps' ? 'https:' : 'http:'
      let host
      let port = process.argv[++i]
      const tokens = port.split(':')
      if (tokens.length > 1) {
        host = tokens[0]
        port = tokens[1]
      }

      const portNum: number = +port
      listen.push({
        protocol,
        host,
        port: portNum
      })

      break
    }
    default:
      usage()
      console.error('\nInvalid option: ' + process.argv[i])
      exit(1)
  }
}

if (listen.length === 0) {
  listen.push({ protocol: 'http:', port: 8888 })
  listen.push({ protocol: 'https:', port: 9999 })
}

function usage () {
  console.log('\nUsage: npm start [--listen [host:]port] [--listenHttps [host:]port] [--debug]')
  console.log('\nOptions:')
  console.log('\t--listen - listen for incoming http connections.  Default is 8888.')
  console.log('\t--listenHttps - listen for incoming https connections.')
  console.log('\nExample: npm start -- --listen 8888 --listenHttps 9999')
}

/**
 * Exception handler.
 */
process.on('uncaughtException', (err) => {
  console.error(err.stack)
  // process.exit()
})

Global.socketIoManager = new SocketIoManager()
const httpProxy = new HttpProxy()
const httpsProxy = new HttpsProxy()

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' // trust all certificates

for (const entry of listen) {
  const protocol = entry.protocol ? entry.protocol : 'http:'
  const host = entry.host
  const port = entry.port

  if (protocol === 'https:') {
    httpMitmProxy.listen({ port: port })
    console.log(`Listening on ${protocol} ${host || ''} ${port}`)
    httpsProxy.onRequest(httpMitmProxy)
  } else {
    httpServer = http.createServer(
      (clientReq, clientRes) => httpProxy.onRequest(clientReq, clientRes))
    httpServer.listen(port, host)
    console.log(`Listening on ${protocol} ${host || ''} ${port}`)
    console.log(`Open browser to ${protocol}//localhost:${port}/anyproxy\n`)

    Global.socketIoManager.addHttpServer(httpServer)
  }
}
