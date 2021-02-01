const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');
const https = require('https');
const socketMessage = require('./server/src/SocketIoMessage.js');
const Global = require('./server/src/Global.js');

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
module.exports = class HttpProxy {
    constructor() {
    }

    onRequest(client_req, client_res) {
        var sequenceNumber = ++Global.nextSequenceNumber;
        var remoteAddress = client_req.socket.remoteAddress;
        console.log(sequenceNumber, remoteAddress + ': ', client_req.method, client_req.url);

        var proxyConfig;
        var reqUrl = url.parse(client_req.url);
        var parseRequestPromise;

        var startTime = Date.now();

        if (reqUrl.pathname == '/middleman' && reqUrl.search == undefined) {
            console.log(sequenceNumber, 'loading index.html');
            client_res.writeHead(200, {
                'Content-type' : 'text/html'
            });
            client_res.end(fs.readFileSync(__dirname + '/public/index.html'));
        } else {
            // File exists locally?
            if(reqUrl.protocol === null &&
                 fs.existsSync(__dirname + reqUrl.pathname) && fs.lstatSync(__dirname + reqUrl.pathname).isFile()) {
                var extname = path.extname(reqUrl.pathname);
                var contentType = 'text/html';
                switch (extname) {
                    case '.js':
                        contentType = 'text/javascript';
                        break;
                    case '.css':
                        contentType = 'text/css';
                        break;
                    case '.json':
                        contentType = 'application/json';
                        break;
                    case '.png':
                        contentType = 'image/png';
                        break;
                    case '.jpg':
                        contentType = 'image/jpg';
                        break;
                    case '.wav':
                        contentType = 'audio/wav';
                        break;
                }

                // Read local file and return to client
                console.log(sequenceNumber, 'loading local file');
                client_res.writeHead(200, {
                    'Content-type' : contentType
                });
                client_res.end(fs.readFileSync(__dirname + reqUrl.pathname));
            } else {
                // Find matching proxy configuration
                proxyConfig = Global.proxyConfigs.findProxyConfigMatchingURL(reqUrl);
                // Always proxy forward proxy requests
                if(proxyConfig === undefined && reqUrl.protocol !== null) {            
                    proxyConfig = {
                        path: reqUrl.pathname,
                        protocol: reqUrl.protocol,
                        hostname: reqUrl.hostname,
                        port: reqUrl.port === null ? reqUrl.protocol === 'http:' ? 80 : 443 : reqUrl.port,
                        recording: false
                    }
                }		

                if(proxyConfig == undefined) {
                    let msg = 'No matching proxy configuration found for '+reqUrl.pathname;
                    if(reqUrl.pathname === '/') {
                        msg += ' (If you are trying to access the Middleman Dashboard, use /middleman)'
                    }
                    sendErrorResponse(404, msg);
                }
                else {
                    proxyRequest();
                }
            }
        }  
        
        function proxyRequest() {
            //console.log(sequenceNumber, 'proxyRequest');
    
            client_req.on('close', function() {
                console.log(sequenceNumber, 'Client closed connection');
                //sendErrorResponse(499, "Client closed connection", undefined, proxyConfig.path);
            })
    
            client_req.on('error', function(error) {
                console.log(sequenceNumber, 'Client connection error', JSON.stringify(error));
            })
    
            var method = client_req.method;		
    
            // GET request received with body?
            if(client_req.method == 'GET' &&
                    client_req.headers['content-length'] && client_req.headers['content-length'] > 0) {
                method = 'POST'; // forward request as POST
            }
    
            var headers;
            headers = client_req.headers;
            headers.host = proxyConfig.hostname;
            if(proxyConfig.port) headers.host += ':'+proxyConfig.port;
            //headers.Connection = 'close';
    
            var options = {
                protocol : proxyConfig.protocol === 'proxy:' ? reqUrl.protocol : proxyConfig.protocol,
                hostname : proxyConfig.hostname,
                port : proxyConfig.port ? proxyConfig.port : proxyConfig.protocol === 'https:' ? 443 : 80,
                path : client_req.url,
                method : method,
                headers : headers
            };
                    
            var proxy;
            if(options.protocol === 'https:') {
                //options.cert: fs.readFileSync('/home/davidchr/imlTrust.pem');
                options.headers.Authorization = 'Basic ' + new Buffer.from('elastic:imliml').toString('base64'); // hardcoded authentication
                proxy = https.request(options, proxyRequest);
            }
            else {
                proxy = http.request(options, proxyRequest);
            }
    
            function proxyRequest(proxyRes) {
                parseRequestPromise.then(function(message) {
                    var parseResponsePromise = socketMessage.parseResponse(proxyRes, startTime, message);
    
                    /**
                     * Forward the response back to the client
                     */
                    client_res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    proxyRes.pipe(client_res, {
                        end : true
                    });
                    parseResponsePromise.then(function(message) {					
                        Global.proxyConfigs.emitMessageToBrowser(message, proxyConfig);					
                    })
                    .catch(function(error) {
                        console.log(sequenceNumber, 'Parse response promise emit error:', error);
                    })
                })
                .catch(function(error) {
                    console.log(sequenceNumber, 'Parse request promise rejected:', error);
                })
            }
    
            proxy.on('error', function(error) {
                error.config = proxyConfig; // Include the proxy config in error response
                console.log(sequenceNumber, 'Proxy connect error', JSON.stringify(error));
                sendErrorResponse(404, "Proxy connect error", error, proxyConfig);
            })
    
            var host = proxyConfig.hostname;
            if(proxyConfig.port) host += ':' + proxyConfig.port;
            parseRequestPromise = socketMessage.parseRequest(client_req, startTime, sequenceNumber, host, proxyConfig.path);
    
            client_req.pipe(proxy, {
                end : true
            });        
        }   
        
        function sendErrorResponse(status, responseMessage, jsonData, proxyConfig) {
            console.log(sequenceNumber, 'sendErrorResponse', responseMessage);
            const path = proxyConfig ? proxyConfig.path : undefined;
            if(parseRequestPromise == undefined) {
                var host = 'error';
                parseRequestPromise = socketMessage.parseRequest(client_req, startTime, sequenceNumber, host, path);
            }
    
            parseRequestPromise.then(function(message) {
                message.responseHeaders = {};
                message.responseBody = {error: responseMessage};
                if(jsonData && typeof jsonData === 'object') {
                    for(key in jsonData) {
                        message.responseBody[key] = jsonData[key];
                    }
                }
                message.status = status;
    
                Global.proxyConfigs.emitMessageToBrowser(message, proxyConfig); // Send error to all browsers		
    
                if(responseMessage != 'Client closed connection') {
                    client_res.on('error', function(error) {
                        console.log(sequenceNumber, 'sendErrorResponse error handled', JSON.stringify(error));
                    })
    
                    client_res.writeHead(status, {
                        'Content-type' : 'application/json'
                    });
    
                    client_res.end(JSON.stringify(message.responseBody));
                }
            })
            .catch(function(error) {
                console.log(sequenceNumber, 'sendErrorResponse: Parse request promise rejected:', error.message);
            })
        }
    }    
}