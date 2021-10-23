import { makeAutoObservable } from 'mobx';
import net from "net";
import tls from 'tls';

export type ConfigProtocol =
  'browser:'
  | 'grpc:'
  | 'http:'
  | 'https:'
  | 'log:'
  | 'mongo:'
  | 'redis:'
  | 'sql:'
  | 'tcp:';

export default class ProxyConfig {
	isSecure: boolean = false;
	path: string = '';
	protocol: ConfigProtocol = 'http:';
	hostname: string = '';
	port: number = 0;
	recording: boolean = true;
	hostReachable: boolean = true;
	logProxyProcess?: any = undefined; // not used by client
	_server?: net.Server | tls.Server; // not used by client
	comment = '';

	constructor(proxyConfig?: ProxyConfig) {
		makeAutoObservable(this);
		if (proxyConfig) {
			this.isSecure = proxyConfig.isSecure || proxyConfig.protocol === 'https:';
			this.path = proxyConfig.path;
			this.protocol = proxyConfig.protocol;
			this.hostname = proxyConfig.hostname;
			this.port = proxyConfig.port;
			this.recording = proxyConfig.recording;
			this.hostReachable = proxyConfig.hostReachable;
			this.comment = proxyConfig.comment;
		}
	}

	static isHttpOrHttps(config: ProxyConfig): boolean {
		switch (config.protocol) {
			case 'http:':
			case 'https:':
			case 'browser:':
				return true;
			default:
				return false;
		}
	}
}