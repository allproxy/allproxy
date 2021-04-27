import { makeAutoObservable } from 'mobx';
import net from "net";
import tls from 'tls';

export default class ProxyConfig {
	path: string = '';
	protocol: string = '';
	hostname: string = '';
	port: number = 0;
	recording: boolean = true;
	hostReachable: boolean = true;
	logProxyProcess?: any = undefined; // not used by client
	_server?: net.Server | tls.Server; // not used by client

	constructor(proxyConfig?: ProxyConfig) {
		makeAutoObservable(this);
		if (proxyConfig) {
			this.path = proxyConfig.path;
			this.protocol = proxyConfig.protocol;
			this.hostname = proxyConfig.hostname;
			this.port = proxyConfig.port;
			this.recording = proxyConfig.recording;
			this.hostReachable = proxyConfig.hostReachable;
		}
	}

	static isHttpOrHttps(config: ProxyConfig): boolean {
		switch (config.protocol) {
			case 'http:':
			case 'https:':
			case 'proxy:':
				return true;
			default:
				return false;
		}
	}
}