import { spawn } from 'child_process';
import SocketIoMessage from './SocketIoMessage';
import Global from './Global';
import ProxyConfig from '../../common/ProxyConfig';
import Message from '../../common/Message';

export default class LogProxy {
	proxyConfig: ProxyConfig;
	command: string;
	constructor(proxyConfig: ProxyConfig) {
		this.proxyConfig = proxyConfig;
		this.command = proxyConfig.path;
		proxyConfig.logProxyProcess = this;
		this.start();
	}

	static destructor(proxyConfig: ProxyConfig) {
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
			console.log('LogProxy exiting:', this.command)
			setTimeout(() => this.start(), 10000); // Retry in 10 seconds
		});

		function warmUpCompleted() {
			return Date.now() > startTime + 3000;
		}
	}

	TIMEOUT = 5000;
	RECORD_LIMIT = 50;
	streamName = '';
	recordCount = 0;
	buffer = '';
	timerHandle: NodeJS.Timeout|undefined;

	sendToBrowser(streamName: string, data: any) {
		if (this.timerHandle) {
			clearInterval(this.timerHandle);
		}

		if (this.streamName.length === 0) {
			this.streamName = streamName;
		}

		this.buffer += data;
		if (++this.recordCount < this.RECORD_LIMIT && streamName === this.streamName) {
			this.timerHandle = setInterval(
				() => {
					this.recordCount = this.RECORD_LIMIT;
					this.sendToBrowser(this.streamName, '');
				},
				this.TIMEOUT
			);
			return;
		}

		console.log(`sendToBrowser log: ${this.command}`);
		const seqNo = ++Global.nextSequenceNumber;
		const message: Message = SocketIoMessage.buildRequest(
			Date.now(),
			seqNo,
			{}, // headers
			'', // method
			this.buffer.toString().split('\n')[0], // url
			'', // endpoint
			{ middleman_inner_body: this.command }, // req body
			'log', // clientIp
			streamName, // serverHost
			'', // path
			0
		);
		SocketIoMessage.appendResponse(message, {}, this.buffer.toString(), 0, 0);
		message.protocol = 'log:';
		Global.proxyConfigs.emitMessageToBrowser(message, this.proxyConfig);

		//console.log('buffered:', this.recordCount, this.buffer.toString());
		this.buffer = '';
		this.recordCount = 0;
	}

}