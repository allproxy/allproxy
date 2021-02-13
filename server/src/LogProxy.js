const { spawn } = require('child_process');
const SocketIoMessage = require('./SocketIoMessage');
const Global = require('./Global');

module.exports = class LogProxy {
	constructor(proxyConfig) {
		this.proxyConfig = proxyConfig;
		this.command = proxyConfig.path;
		proxyConfig.logProxyProcess = this;
		this.start();
	}

	static destructor(proxyConfig) {              
        if(proxyConfig.logProxyProcess) {
			try {
				proxyConfig.logProxyProcess.kill('SIGINT');
			} catch(e) {
				console.log(e);
			}
		}
    }

	start() {
		console.log(`Monitoring log: ${this.command}`);
		const tokens = this.command.split(' ');
		const proc = spawn(tokens[0], tokens.slice(1));
		this.proxyConfig.logProxyProcess = proc; // save so we can kill process
		const startTime = Date.now();

		proc.stdout.on('data', data => {
			if (warmUpCompleted()) {
				this.sendToBrowser('stdout', data);
			}
		});

		proc.stderr.on('data', data => {
			if (warmUpCompleted()) {
				this.sendToBrowser('stderr', data);
			}
		});

		proc.on('error', error => {
			console.log(`error: ${error} - ${this.command}`);
		});

		proc.on('exit', rc => {
			setTimeout(() => this.start(), 5000); // Retry in 5 seconds
		});
		
		function warmUpCompleted() {
			return Date.now() > startTime + 3000; 
		}
	}

	sendToBrowser(streamName, data) {
		console.log(`sendToBrowser log: ${this.command}`);
		const seqNo = ++Global.nextSequenceNumber; 
		const message = SocketIoMessage.buildRequest(
			Date.now(),
			seqNo,                                                    
			{}, // headers 
			'', // method 
			data.toString().split('\n')[0], // url
			'', // endpoint 
			{ middleman_inner_body: this.command }, // req body
			'log', // clientIp
			streamName, // serverHost
			'', // path
			0
		);
		SocketIoMessage.appendResponse(message, {}, data.toString(), 0, 0);
		message.protocol = 'log:';
		Global.proxyConfigs.emitMessageToBrowser(message, this.proxyConfig);
	}

}