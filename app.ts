import fs from 'fs';
import http from 'http';
import { exit } from 'process';
import https from 'https';
import Global from './server/src/Global';
import ProxyConfigs from './server/src/ProxyConfigs';
import HttpProxy from './HttpProxy';

let listen: {protocol?: string,
			host?: string,
			port: number}[] = [];
let httpServer: http.Server | https.Server;

for(var i = 2; i < process.argv.length; ++i) {
	switch(process.argv[i]) {
		case '--help':
			usage();
			exit(1);
		case '--listen':
		case '--listenHttps':
			if(i + 1 >= process.argv.length) {
				usage();
				console.error('\nMissing --listen value.');
			}

			const protocol = process.argv[i] === '--listenHttps' ? 'https:' : 'http:';
			let host;
			let port = process.argv[++i];
			const tokens = port.split(':');
			if(tokens.length > 1) {
				host = tokens[0];
				port = tokens[1];
			}

			const portNum: number = +port;
			listen.push({
				protocol,
				host,
				port: portNum
			})

			break;
		default:
			usage();
			console.error('\nInvalid option: '+process.argv[i]);
			exit(1);
	}
}

if(listen.length === 0) listen.push({port: 8888});

function usage() {
	console.log('\nUsage: npm start [--listen [host:]port] [--listenHttps [host:]port]');
	console.log('\nOptions:');
	console.log('\t--listen - listen for incoming http connections.  Default is 8888.');
	console.log('\t--listenHttps - listen for incoming https connections.');
	console.log('\nExample: npm start --listen localhost:3000 --listenHttps 3001');
}

/**
 * Exception handler.
 */
process.on('uncaughtException', (err) => {
	console.error(err.stack);
	process.exit();
})

Global.proxyConfigs = new ProxyConfigs();
const httpProxy = new HttpProxy();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // trust all certificates

const httpsOptions = {
	key: fs.readFileSync(__dirname + '/private/keys/server.key'),
	cert: fs.readFileSync(__dirname + '/private/keys/server.crt')
};

for(let entry of listen) {
	let protocol = entry.protocol ? entry.protocol : 'http:';
	let host = entry.host;
	let port = entry.port;

	if(protocol === 'https:') {
		httpServer = https.createServer(httpsOptions,
			(client_req, client_res) => httpProxy.onRequest(client_req, client_res));
	} else {
		httpServer = http.createServer(
			(client_req, client_res) => httpProxy.onRequest(client_req, client_res));
	}

	Global.proxyConfigs.addHttpServer(httpServer);

	httpServer.listen(port, host);
	console.log(`Listening on ${protocol} ${host?host:''} ${port}`);
	console.log(`Open browser to ${protocol}//localhost:${port}/middleman\n`);
}