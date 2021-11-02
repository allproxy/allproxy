import { ServerResponse } from 'http'
import { Http2ServerResponse } from 'http2'
import path from 'path'
import { UrlWithStringQuery } from 'url'
import Paths from './Paths'
import fs from 'fs'
import Global from './Global'

const AllProxyApp = (
  clientRes: ServerResponse | Http2ServerResponse,
  reqUrl: UrlWithStringQuery
): boolean => {
  let responseSent = true
  const clientBuildDir = Paths.clientDir() + path.sep + 'build'

  if (reqUrl.pathname === '/' + 'anyproxy' || reqUrl.pathname === '/' + 'allproxy') {
    clientRes.writeHead(200, {
      'content-type': 'text/html'
    })
    clientRes.end(fs.readFileSync(clientBuildDir + path.sep + 'index.html'))
  } else {
    const dir = clientBuildDir + reqUrl.pathname?.replace(/\//g, path.sep)
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
      clientRes.end(fs.readFileSync(clientBuildDir + reqUrl.pathname))
    } else if (reqUrl.protocol === null &&
              reqUrl.pathname === '/api/allproxy/config') {
      Global.socketIoManager.updateHostReachable()
        .then((configs) => {
          clientRes.writeHead(200, {
            'content-type': 'application/json'
          })
          clientRes.end(JSON.stringify(configs, null, 2))
        })
    } else {
      responseSent = false
    }
  }

  return responseSent
}

export default AllProxyApp
