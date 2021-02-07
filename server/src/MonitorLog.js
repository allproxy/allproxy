const { spawn } = require('child_process');
const SocketIoMessage = require('./SocketIoMessage');
const Global = require('./Global');

module.exports = class MonitorLog {
	constructor(readLogCommand) {
		this.command = readLogCommand;
	}

	start() {
		console.log(`Monitor log: ${this.command}`);
		const tokens = this.command.split(' ');
		const cmd = spawn(tokens[0], tokens.slice(1));
		
		cmd.stdout.on('data', data => {
			this.sendToBrowser('strout', data);
		});

		cmd.stderr.on('data', data => {
			this.sendToBrowser('stderr', data);
		});

		cmd.on('error', error => {
			console.log(`error: ${error} - ${this.command}`);
		});
	}

	sendToBrowser(streamName, data) {
		console.log(`sendToBrowser log: ${this.command}`);
		const seqNo = ++Global.nextSequenceNumber; 
		const message = SocketIoMessage.buildRequest(
			seqNo,                                                    
			{}, // headers 
			'', // method 
			this.command, // url
			'', // endpoint 
			{ middleman_inner_body: this.command }, // req body
			'log', // clientIp
			streamName, // serverHost
			'', // path
			0
		);
		SocketIoMessage.appendResponse(message, {}, '[\n'+data+']', 0, 0);
		message.protocol = 'log:';
		Global.proxyConfigs.emitMessageToBrowser(message, undefined);
	}

}