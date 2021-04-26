import { makeAutoObservable, action } from "mobx"
import ProxyConfig from '../common/ProxyConfig';
import { socketStore } from './SocketStore'

class ProxyConfigStore {
	private proxyConfigs: ProxyConfig[] = this.getFromLocalStorage();

	constructor() {
		makeAutoObservable(this);
	}

	@action public merge(proxyConfigs: ProxyConfig[]) {
		const proxyDirectives = this.proxyConfigs;
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
		this.updateProxyConfigs();
	}

	/**
	 * Load config on server
	 */
	public load() {
		const proxyDirectives: ProxyConfig[] = this.proxyConfigs;
		proxyDirectives.forEach(proxyConfig => {
			// backwards compatible with previously supported 'any:'
			if(proxyConfig.protocol === 'any:') proxyConfig.protocol = 'other:';
		});
		// Send configs to server
		socketStore.emitConfig('proxy config', proxyDirectives);
	}

	public getProxyConfigs() {
		return this.proxyConfigs;
	}

	@action public setProxyConfigs(proxyConfigs: ProxyConfig[]) {
		localStorage.proxyDirectives = JSON.stringify(proxyConfigs, null, 2);
		this.updateProxyConfigs();
	}

	private updateProxyConfigs() {
		this.proxyConfigs.splice(0, this.proxyConfigs.length);
		this.getFromLocalStorage().forEach(c => {
			this.proxyConfigs.push(new ProxyConfig(c));
		});
	}

	private getFromLocalStorage(): ProxyConfig[] {
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

	public getProxyConfigWithPath(protocol: string, path: string): ProxyConfig | null {
		let result = null;
		const proxyDirectives = this.proxyConfigs;
		for (let config of proxyDirectives) {
			if (protocol === config.protocol && path === config.path) {
				result = config;
			}
		}
		console.log(result);
		return result;
	}
}

const proxyConfigs = new ProxyConfigStore();
export default proxyConfigs;