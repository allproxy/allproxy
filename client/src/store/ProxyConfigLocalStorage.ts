import ProxyConfig from '../common/ProxyConfig';
import { socketStore } from './SocketStore'

export default class ProxyConfigLocalStorage {

	public static load() {
		let proxyDirectives: ProxyConfig[] = [];
		if(localStorage.proxyDirectives) {
			proxyDirectives = JSON.parse(localStorage.proxyDirectives);
			proxyDirectives.forEach(proxyConfig => {
				// backwards compatible with previously supported 'any:'
				if(proxyConfig.protocol === 'any:') proxyConfig.protocol = 'other:';
			});
			// Send configs to server
			socketStore.emitConfig('proxy config', proxyDirectives);
		}
	}

	public static setProxyConfigs(proxyConfigs: ProxyConfig[]) {
		localStorage.proxyDirectives = JSON.stringify(proxyConfigs, null, 2);
	}

	public static getProxyConfigs(): ProxyConfig[] {
		let configs = localStorage.proxyDirectives;
		if (!configs) {
			return [];
		} else {
			return (JSON.parse(configs) as ProxyConfig[]).sort((a, b) => a.port - b.port);
		}
	}

	public static getProxyConfigWithPath(path: string): ProxyConfig | null {
		var proxyDirectives = [];
		if(localStorage.proxyDirectives) {
			proxyDirectives = JSON.parse(localStorage.proxyDirectives);
		}
		for(let config of proxyDirectives) {
			if(path === config.path) {
				return config;
			}
		}
		return null;
	}
}