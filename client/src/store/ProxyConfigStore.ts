import { makeAutoObservable, action } from "mobx"
import ProxyConfig from '../common/ProxyConfig';
import { socketStore } from './SocketStore'

class ProxyConfigStore {
	private proxyConfigs: ProxyConfig[] = this.getFromLocalStorage();

	constructor() {
		makeAutoObservable(this);
	}

	/**
	 * Local storage is deprecated.
	 */
	private getFromLocalStorage(): ProxyConfig[] {
		let proxyConfigs: ProxyConfig[] = [];
		if (localStorage.proxyDirectives) {
			try {
				proxyConfigs = JSON.parse(localStorage.proxyDirectives);
				localStorage.proxyDirectives = undefined; // stop using local storage
			} catch (e) {
			}
		}
		return proxyConfigs;
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

		this.updateProxyConfigs(proxyConfigs);
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

	public retrieveProxyConfigs(): Promise<ProxyConfig[]> {
		const headers: {[key: string]: string} = {};
		headers['middleman_proxy'] = 'config';
		return new Promise((resolve) => {
			const url = document.location.protocol + '//' + document.location.host
			+ '/api/middleman/config';
			fetch(url, headers)
				.then((response) => response.json())
				.then(data => {
					resolve(data);
					this.setProxyConfigs(data);
				});
		})
	}

	public getProxyConfigs() {
		return this.proxyConfigs;
	}

	@action public setProxyConfigs(proxyConfigs: ProxyConfig[]) {
		this.updateProxyConfigs(proxyConfigs);
	}

	private updateProxyConfigs(proxyConfigs: ProxyConfig[]) {
		this.proxyConfigs.splice(0, this.proxyConfigs.length);
		this.sortConfigs(proxyConfigs).forEach(c => {
			this.proxyConfigs.push(new ProxyConfig(c));
		});
	}

	private sortConfigs(proxyConfigs: ProxyConfig[]): ProxyConfig[] {
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
		return proxyConfigs;
	}
}

const proxyConfigs = new ProxyConfigStore();
export default proxyConfigs;