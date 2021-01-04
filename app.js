const fs = require('fs');
const http = require('http');
const https = require('https');
const Global = require('./server/src/Global');
const ProxyConfigs = require('./server/src/ProxyConfigs');
const HttpProxy = require('./HttpProxy');
const NonHttpProxy = require('./server/src/NonHttpProxy');

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

if(useSsl) {
	var httpsOptions = {
		key: fs.readFileSync(__dirname + '/private/keys/server.key'),
		cert: fs.readFileSync(__dirname + '/private/keys/server.crt')
	};

	httpServer = https.createServer(httpsOptions, (client_req, client_res) => httpProxy.onRequest(client_req, client_res)).listen(listenPort);
}
else {
	httpServer = http.createServer((client_req, client_res) => httpProxy.onRequest(client_req, client_res)).listen(listenPort);
}

console.log('Listening on port '+listenPort);

Global.proxyConfigs.setHttpServer(httpServer);