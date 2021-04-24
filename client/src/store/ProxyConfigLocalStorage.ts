import { readConfigFile } from 'typescript';
import ProxyConfig from '../common/ProxyConfig';
import { socketStore } from './SocketStore'

export default class ProxyConfigLocalStorage {

	public static merge(proxyConfigs: ProxyConfig[]) {
		const proxyDirectives = ProxyConfigLocalStorage.getProxyConfigs();
		for (let directive of proxyDirectives) {
			if (proxyConfigs.filter(proxyConfig => {
				return directive.protocol === proxyConfig.protocol
					&& directive.path === proxyConfig.path
					&&
					(
						directive.protocol === 'proxy:'
						|| directive.protocol === 'log:'
						|| (directive.hostname === proxyConfig.hostname
							&& directive.port === proxyConfig.port)
					);
			}).length === 0) {
				proxyConfigs.push(directive);
			}
		}

		// Store local copy of configuration
		localStorage.proxyDirectives = JSON.stringify(proxyConfigs);
	}

	public static load() {
		const proxyDirectives: ProxyConfig[] = ProxyConfigLocalStorage.getProxyConfigs();
		proxyDirectives.forEach(proxyConfig => {
			// backwards compatible with previously supported 'any:'
			if(proxyConfig.protocol === 'any:') proxyConfig.protocol = 'other:';
		});
		// Send configs to server
		socketStore.emitConfig('proxy config', proxyDirectives);
	}

	public static setProxyConfigs(proxyConfigs: ProxyConfig[]) {
		localStorage.proxyDirectives = JSON.stringify(proxyConfigs, null, 2);
	}

	public static getProxyConfigs(): ProxyConfig[] {
		let configs = localStorage.proxyDirectives
		if (!configs) {
			return [];
		} else {
			let proxyConfigs: ProxyConfig[];
			try {
				proxyConfigs = (JSON.parse(configs) as ProxyConfig[]);
				proxyConfigs.sort((a, b) => {
					let rc = a.protocol.localeCompare(b.protocol);
					if (rc === 0) {
						rc = a.path.localeCompare(b.path);
						if (rc === 0) {
							rc = a.hostname.localeCompare(b.hostname);
						}
					}
					return rc;
				});
			} catch (e) {
				proxyConfigs = [];
			}
			return proxyConfigs;
		}
	}

	public static getProxyConfigWithPath(path: string): ProxyConfig | null {
		const proxyDirectives = ProxyConfigLocalStorage.getProxyConfigs();
		for(let config of proxyDirectives) {
			if(path === config.path) {
				return config;
			}
		}
		return null;
	}
}