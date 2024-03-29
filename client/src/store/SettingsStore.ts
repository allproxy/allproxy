import { makeAutoObservable, action } from "mobx";
import ProxyConfig, { ConfigProtocol } from '../common/ProxyConfig';
import { _getLimit, messageQueueStore } from './MessageQueueStore';
import proxyConfigStore from './ProxyConfigStore';

export type ConfigCategory =
	'FORWARD PROXY'
	| 'DATA STORES'
	| 'GRPC'
	| 'HTTP'
	| 'JSON LOGS'
	| 'TCP';

export const ConfigCategories: ConfigCategory[] = [
	'FORWARD PROXY',
	'DATA STORES',
	'GRPC',
	'HTTP',
	'JSON LOGS',
	'TCP',
];

export const ConfigProtocols: ConfigProtocol[] = [
	'browser:',
	'grpc:',
	'http:',
	'https:',
	'log:',
	'mongo:',
	'redis:',
	'mysql:',
	'tcp:',
];

interface ConfigProtocolDescription {
	name: string,
	protocol: ConfigProtocol,
	title: string,
	ports: number[],
}

export const ConfigCategoryGroups: Map<ConfigCategory, ConfigProtocolDescription[]> = new Map();
ConfigCategoryGroups.set('FORWARD PROXY',
	[
		{
			name: 'Forward Proxy',
			protocol: 'browser:',
			title: 'Forward Proxy',
			ports: [8888, 8888],
		},
	]
);
ConfigCategoryGroups.set('DATA STORES',
	[
		{
			name: 'MongoDB',
			protocol: 'mongo:',
			title: 'MongoDb Reverse Proxy',
			ports: [27017],
		},
		{
			name: 'Redis',
			protocol: 'redis:',
			title: 'Redis Reverse Proxy',
			ports: [6379],
		},
		{
			name: 'MySQL',
			protocol: 'mysql:',
			title: 'MySQL Reverse Proxy',
			ports: [3306],
		},
	]
);
ConfigCategoryGroups.set('GRPC',
	[
		{
			name: 'gRPC',
			protocol: 'grpc:',
			title: 'gRPC Reverse Proxy',
			ports: [],
		},
	]
);
ConfigCategoryGroups.set('HTTP',
	[
		{
			name: 'HTTP',
			protocol: 'http:',
			title: 'HTTP Reverse Proxy',
			ports: [8888],
		},
		{
			name: 'HTTPS',
			protocol: 'https:',
			title: 'HTTPS Reverse Proxy',
			ports: [8888],
		},
	]
);
ConfigCategoryGroups.set('JSON LOGS',
	[
		{
			name: 'Log',
			protocol: 'log:',
			title: 'Log Monitor',
			ports: [],
		},
	]
);
ConfigCategoryGroups.set('TCP',
	[
		{
			name: 'TCP',
			protocol: 'tcp:',
			title: 'TCP Proxy',
			ports: [],
		},
	]
);

export enum HostStatus {
	All = 'All',
	Reachable = 'Reachable',
	Unreachable = 'Unreachable',
}

export default class SettingsStore {
	private openSettingsModal = false;
	private tabCategory: ConfigCategory = 'DATA STORES';
	private tabProtocol: ConfigProtocol = ConfigCategoryGroups.get(this.tabCategory)![0].protocol;

	private changed = false;
	private protocol: ConfigProtocol | '' = '';

	private statusUpdating = true;
	private entries: ProxyConfig[] = [];
	private messageQueueLimit = 0;

	public constructor() {
		makeAutoObservable(this);
	}

	public getOpenSettingsModal() {
		return this.openSettingsModal;
	}
	@action public toggleOpenSettingsModal() {
		this.openSettingsModal = !this.openSettingsModal;
	}

	public getTabCategory() {
		return this.tabCategory;
	}
	@action public setTabCategory(cat: ConfigCategory) {
		this.tabCategory = cat;
	}
	public getTabProtocol() {
		return this.tabProtocol;
	}
	@action public setTabProtocol(protocol: ConfigProtocol) {
		this.tabProtocol = protocol;
	}

	public isStatusUpdating() {
		return this.statusUpdating;
	}

	public setConfig() {
		this.entries.splice(0, this.entries.length);
		const configs = proxyConfigStore.getProxyConfigs();
		configs.forEach((config) => {
			this.entries.push(config);
		});

		this.statusUpdating = true;
		proxyConfigStore.retrieveProxyConfigs()
			.then((configs) => {
				configs.forEach(config => {
					if (config.protocol === 'log:' || config.protocol === 'browser:') return;
					for (const entry of this.entries) {
						if (entry.hostname === config.hostname && entry.port === config.port) {
							entry.hostReachable = config.hostReachable;
						}
					}
					this.statusUpdating = false;
				});
			});
	}

	@action public async reset() {
		this.changed = false;
		this.protocol = 'http:';
		this.messageQueueLimit = _getLimit();
		this.setConfig();
	}

	public isChanged() {
		return this.changed;
	}

	public getSubTitle() {
		const c = ConfigCategoryGroups.get(this.tabCategory)!.find(e => e.protocol === this.protocol);
		return c ? c.title : '';
	}

	public getConfigCategories(): ConfigCategory[] {
		return ConfigCategories;
	}

	public getProtocols(): ConfigProtocol[] {
		return ConfigProtocols;
	}

	public getProtocol() {
		return this.protocol;
	}

	@action public setProtocol(protocol: ConfigProtocol) {
		this.protocol = protocol;
	}

	public isProxyOrLog() {
		return this.protocol === 'browser:' || this.protocol === 'log:';
	}

	@action public addEntry(): void {
		const proxyConfig = new ProxyConfig();
		proxyConfig.protocol = this.protocol as ConfigProtocol;
		this.entries.push(proxyConfig);
		this.changed = true;
	}

	@action public deleteEntry(index: number) {
		this.entries.splice(index, 1);
		this.changed = true;
	}

	@action public updateEntryProtocol(index: number, value: ConfigProtocol) {
		const entry = { ...this.entries[index] };
		entry.protocol = value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateEntryPath(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.path = value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateEntryHost(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.hostname = value;
		if (entry.protocol === 'log:' && value.length > 0) {
			entry.port = 0;
		}
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateEntryPort(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.port = +value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public updateComment(index: number, value: string) {
		const entry = { ...this.entries[index] };
		entry.comment = value;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	@action public toggleEntryCapture(index: number) {
		const entry = { ...this.entries[index] };
		entry.recording = !entry.recording;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	public isEntrySecure(index: number) {
		const entry = { ...this.entries[index] };
		return entry.isSecure;
	}

	@action public toggleEntryIsSecure(index: number) {
		const entry = { ...this.entries[index] };
		entry.isSecure = !entry.isSecure;
		this.entries.splice(index, 1, entry);
		this.changed = true;
	}

	public getEntries(hostStatus: HostStatus = HostStatus.All): ProxyConfig[] {
		if (hostStatus === HostStatus.All) {
			return this.entries;
		} else {
			const hostPorts: Map<string, boolean> = new Map();
			const hostReachable = (hostStatus === HostStatus.Reachable);
			return this.entries
				.filter(entry => {
					if (
						entry.hostReachable !== hostReachable
						|| entry.protocol === 'browser:'
						|| entry.protocol === 'log:'
					) {
						return false;
					}

					const hostPort = entry.hostname + ':' + entry.port;
					if (hostPorts.get(hostPort)) {
						return false;
					}
					hostPorts.set(hostPort, true);
					return true;
				});
		}
	}

	public getMessageQueueLimit() {
		if (this.messageQueueLimit === 0) this.messageQueueLimit = _getLimit();
		return this.messageQueueLimit;
	}

	@action setMessageQueueLimit(messageQueueLimit: number) {
		if (this.messageQueueLimit === 0) this.messageQueueLimit = _getLimit();
		this.messageQueueLimit = messageQueueLimit;
		this.changed = true;
	}

	@action public save() {
		this.changed = false;
		proxyConfigStore.setProxyConfigs(this.entries);
		messageQueueStore.setLimit(this.messageQueueLimit);
		proxyConfigStore.load();
	}
}

export const settingsStore = new SettingsStore();
