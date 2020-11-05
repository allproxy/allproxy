const url = require('url');
const fs = require('fs');
const http = require('http');
const https = require('https');
const socketio = require('socket.io');
const path = require('path');
const socketMessage = require('./src/socket-message.js');

var listenPort = 8888;
var useSsl = false;

for(var i = 2; i < process.argv.length; ++i) {
	switch(process.argv[i]) {
	case '--listen':
		if(i + 1 >= process.argv.length) {
			usage();
			console.log('\nMissing --listen value.');
		}

		listenPort = process.argv[++i];
		break;
	case '--ssl':
		useSsl = true;
		break;
	default:
		usage();
		console.log('\nInvalid option: '+process.argv[i]);
		return;
		break;
	}
}

function usage() {
	console.log('\nUsage: node app.js [--listen [host:]port] [--ssl]');
	console.log('\nOptions:');
	console.log('\t--ssl - Listen for SSL (https) connections only');
	console.log('\t--listen - Host (IP) and port to listen on.  Default is localhost:8888.');
	console.log('\nExample: node app.js --listen localhost:3000 --ssl');
}

var httpServer;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // trust all certificates

if(useSsl) {
	var httpsOptions = {
		key: fs.readFileSync(__dirname + '/private/keys/server.key'),
		cert: fs.readFileSync(__dirname + '/private/keys/server.crt')
	};

	httpServer = https.createServer(httpsOptions, onRequest).listen(listenPort);
}
else {
	httpServer = http.createServer(onRequest).listen(listenPort);
}

var socketConfigs = []; // { socket: [socket], proxyConfig: {path: [path], url: [url]} }

console.log('Listening on port '+listenPort)

socketio.listen(httpServer).on('connection', socketConnection);

function socketConnection(socket) {
	console.log('socket connected', socket.conn.id);

	socketConfigs.push({socket : socket, proxyConfigs : []});

	socket.on('proxy config', function(msg) {
		console.log('Proxy config received', socket.conn.id, msg);

		socketConfigs.forEach(function(config) {
			if(config.socket === socket) {
				config.proxyConfigs = msg;
			}
			else {
				config.proxyConfigs.forEach(function(socketProxyConfig) {
					var c = {
						path: socketProxyConfig.path,
						hostname: socketProxyConfig.hostname
					};
				})
			}
		})
	})

	socket.on('disconnect', function() {
		console.log('socket disconnect', socket.conn.id);
		socketConfigs.forEach(function(config, i) {
			if(config.socket === socket) {
				socketConfigs.splice(i, 1);
			}
		})
	})
}

var nextSequenceNumber = 0;

function onRequest(client_req, client_res) {
	var sequenceNumber = ++nextSequenceNumber;
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
		if(fs.existsSync(__dirname + reqUrl.pathname) && fs.lstatSync(__dirname + reqUrl.pathname).isFile()) {
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
			socketConfigs.forEach(function(config) {
				if(config.proxyConfigs) {
					config.proxyConfigs.forEach(function(socketProxyConfig) {
						if(reqUrl.pathname.startsWith(socketProxyConfig.path)) {
							if(proxyConfig == undefined || socketProxyConfig.path.length > proxyConfig.path.length) {
								proxyConfig = socketProxyConfig;
							}
						}
					})
				}
			})

			if(proxyConfig == undefined) {
				sendErrorResponse(404, 'No matching proxy configuration found!');
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
			protocol : proxyConfig.protocol,
			hostname : proxyConfig.hostname,
			port : proxyConfig.port ? proxyConfig.port : proxyConfig.protocol === 'http' ? 80 : 443,
			path : client_req.url,
			method : method,
			headers : headers
		};
		
		var proxy;
		if(proxyConfig.protocol == 'https:') {
			//options.cert: fs.readFileSync('/home/davidchr/imlTrust.pem');
			options.headers.Authorization = 'Basic ' + new Buffer('elastic:imliml').toString('base64'); // hardcoded authentication
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
					var json = JSON.stringify(message, null, 2);
					socketConfigs.forEach(function(config) {
						config.proxyConfigs.forEach(function(socketProxyConfig) {
							if(socketProxyConfig.path == proxyConfig.path) {
								console.log('socket emit', config.socket.conn.id);
								config.socket.emit('message', json);
							}
						})
					});
				})
				.catch(function(error) {
					console.log(sequenceNumber, 'Parse response promise rejected:', error.message);
				})
			})
			.catch(function(error) {
				console.log(sequenceNumber, 'Parse request promise rejected:', error.message);
			})
		}

		proxy.on('error', function(error) {
			error.config = proxyConfig; // Include the proxy config in error response
			console.log(sequenceNumber, 'Proxy connect error', JSON.stringify(error));
			sendErrorResponse(404, "Proxy connect error", error, proxyConfig.path);
		})

		var partialUrl = proxyConfig.path.length > 1 ? client_req.url.replace(proxyConfig.path, '...') : client_req.url;
		var host = proxyConfig.hostname;
		if(proxyConfig.port) host += ':' + proxyConfig.port;
		parseRequestPromise = socketMessage.parseRequest(client_req, startTime, sequenceNumber, host, partialUrl, proxyConfig.path);

		client_req.pipe(proxy, {
			end : true
		});
	}

	function sendErrorResponse(status, responseMessage, jsonData, path) {
		console.log(sequenceNumber, 'sendErrorResponse', responseMessage);
		if(parseRequestPromise == undefined) {
			var host = 'error';
			parseRequestPromise = socketMessage.parseRequest(client_req, startTime, sequenceNumber, host, client_req.url, path);
		}

		parseRequestPromise.then(function(message) {
			message.responseHeaders = {};
			message.responseBody = {error: responseMessage};
			if(jsonData) {
				for(key in jsonData) {
					message.responseBody[key] = jsonData[key];
				}
			}
			message.status = status;

			var json = JSON.stringify(message, null, 2);
			socketConfigs.forEach(function(config) {
				console.log('socket emit', config.socket.conn.id);
				config.socket.emit('message', json);
			});

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
