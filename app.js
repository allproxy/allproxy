const fs = require('fs');
const http = require('http');
const https = require('https');
const Global = require('./server/src/Global');
const ProxyConfigs = require('./server/src/ProxyConfigs');
const HttpProxy = require('./HttpProxy');

let listen = []; // {protocol, host, port}

for(var i = 2; i < process.argv.length; ++i) {
	switch(process.argv[i]) {
		case '--listen':
		case '--listenHttps':
			if(i + 1 >= process.argv.length) {
				usage();
				console.log('\nMissing --listen value.');
			}

			const protocol = process.argv[i] === '--listenHttps' ? 'https:' : 'http:';
			let host;
			let port = process.argv[++i];
			const tokens = port.split(':');
			if(tokens.length > 1) {
				host = tokens[0];
				port = tokens[1];
			}

			listen.push({
				protocol,
				host,
				port
			})	
					
			break;
		default:
			usage();
			console.log('\nInvalid option: '+process.argv[i]);
			return;
			break;
	}
}

if(listen.length === 0) listen.push({port: 8888});

function usage() {
	console.log('\nUsage: yarn start [--listen [host:]port] [--listenHttps [host:]port]');
	console.log('\nOptions:');	
	console.log('\t--listen - listen for incoming http connections.  Default is 8888.');
	console.log('\t--listenHttps - listen for incoming https connections.');	
	console.log('\nExample: yarn start --listen localhost:3000 --listenHttps 3001');
}

/**
 * Exception handler.
 */
process.on('uncaughtException', (err) => {
	console.error(err.stack);
	process.exit();
})

Global.proxyConfigs = new ProxyConfigs();
const httpProxy = new HttpProxy(Global.proxyConfigs);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // trust all certificates

const httpsOptions = {
	key: fs.readFileSync(__dirname + '/private/keys/server.key'),
	cert: fs.readFileSync(__dirname + '/private/keys/server.crt')
};

for(let entry of listen) {	
	let protocol = entry.protocol;
	let host = entry.host;
	let port = entry.port;	

	if(protocol === 'https:') {
		httpServer = https.createServer(httpsOptions, 
			(client_req, client_res) => httpProxy.onRequest(client_req, client_res)).listen(port, host);
	} else {
		httpServer = http.createServer(
			(client_req, client_res) => httpProxy.onRequest(client_req, client_res)).listen(port, host);
	}
	console.log(`Listening on ${protocol?protocol:''} ${host?host:''} ${port}`);

	Global.proxyConfigs.addHttpServer(httpServer);
}