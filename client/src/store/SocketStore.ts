import { makeAutoObservable, action } from "mobx";
import io, { Socket } from "socket.io-client";
import Message, { MessageType } from '../common/Message';
import proxyConfigStore from './ProxyConfigStore';
import portConfigStore from "./PortConfigStore";
import { messageQueueStore } from './MessageQueueStore';
import ProxyConfig from '../common/ProxyConfig';
import PortConfig from '../common/PortConfig';
import { metricsStore } from './MetricsStore';
import { mapProtocolToIndex } from './MetricsStore';
import MessageStore from "./MessageStore";
import { breakpointStore } from "./BreakpointStore";
import { Browser } from "./BrowserStore";
import { apFileSystem } from "./APFileSystem";
import { namedQueriesStore, namedSubQueriesStore } from "./NamedQueriesStore";
import { urlPathStore } from "./UrlPathStore";
import { mainTabStore } from "./MainTabStore";

export default class SocketStore {
	private socket?: Socket = undefined;
	private socketConnected: boolean = false;
	private queuedCount: number = 0;
	private requestCount: number = 0;
	private responseCount: number = 0;
	private setTimeoutHandle: NodeJS.Timeout | null = null;

	public constructor() {
		makeAutoObservable(this);
		if (process.env.NODE_ENV === 'production' && !urlPathStore.isGitHubPages()) {
			this.connect();
		} else {
			setTimeout(() => this.init());
		}
	}

	private init() {
		breakpointStore.init();
		namedQueriesStore.init();
		namedSubQueriesStore.init();
	}

	@action private connect() {
		//console.log('Connect to AllProxy server')
		this.socket = io();

		this.socket.on('connect', async () => {
			//console.log('socket connected');
			this.setSocketConnected(true);
			if (this.socket) {
				await apFileSystem.setSocket(this.socket);

				var os = '';
				if (navigator.userAgent.indexOf('Win') !== -1) os = 'win32';
				else if (navigator.userAgent.indexOf('Mac') !== -1) os = 'darwin';
				else if (navigator.userAgent.indexOf('Linux') !== -1) os = 'linux';

				if (os.length > 0) {
					let ipInfo = undefined;
					if (document.location.host === 'allproxy.ddns.net') {
						const response = await fetch("https://api.db-ip.com/v2/free/self");
						ipInfo = await response.json();
					}
					this.socket.emit('ostype', os, document.location.pathname, ipInfo);
				}
			}
		});

		this.socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
			//console.log('proxy configs', proxyConfigs);
			proxyConfigStore.setProxyConfigs(proxyConfigs);
			proxyConfigStore.load(); // send to server
			this.init();
		});

		this.socket.on('port config', (portConfig: PortConfig) => {
			portConfigStore.setConfig(portConfig);
		});

		this.socket.on('status dialog', (message: string) => {
			mainTabStore.setUpdating(true, message);
		});

		this.socket.on('error dialog', (message: string) => {
			alert(message);
		});

		this.socket.on('disconnect', () => {
			//console.log('socket disconnected');
			this.setSocketConnected(false);
			//reconnect();
		});

		this.socket.on('error', (e: any) => {
			console.log('socket error', e);
			this.setSocketConnected(false);
			reconnect();
		});

		const reconnect = () => {
			if (this.setTimeoutHandle === null) {
				// Reconnect in 60 seconds
				this.setTimeoutHandle = setTimeout(() => {
					this.setTimeoutHandle = null;
					//console.log('reconnect to AllProxy server')
					this.socket?.close();
					this.connect();
				}, 60 * 1000);
			}
		};

		this.socket.on('breakpoint', (message: Message, callback: any) => {
			const breakpoint = breakpointStore.findMatchingBreakpoint(message);
			if (breakpoint) {
				breakpointStore.openBreakpointResponseModal(new MessageStore(message), callback);
			} else {
				callback(message);
			}
		});

		this.socket.on('reqResJson', (messages: Message[], queuedCount: number, callback: any) => {
			this.queuedCount = queuedCount;
			for (const message of messages) {
				this.countMetrics(message);
			}

			messageQueueStore.insertBatch(messages);

			if (callback) {
				setTimeout(() => {
					const first = messages[0];
					callback(`${messageTypeTOString(first)} seq=${first.sequenceNumber}`);
				}, messageQueueStore.getStopped() ? 0 : 3000);
			}

			function messageTypeTOString(message: Message): string {
				switch (message.type) {
					case MessageType.REQUEST:
						return 'req';
					case MessageType.RESPONSE:
						return 'res';
					case MessageType.REQUEST_AND_RESPONSE:
						return 'req/res';
				}
				return 'unknown';
			}
		});
	}

	@action private countMetrics(message: Message) {
		const protocol = message.proxyConfig!.protocol;
		const i = mapProtocolToIndex.get(protocol);
		if (i === undefined) {
			console.error(`Unknown protocol ${protocol} for message ${message}`);
			return;
		}

		const row = metricsStore.getMetrics()[i];

		if (message.type === MessageType.REQUEST_AND_RESPONSE
			|| message.type === MessageType.REQUEST) {
			++row.requestCount;
			++this.requestCount;
		}
		if (message.type === MessageType.REQUEST_AND_RESPONSE
			|| message.type === MessageType.RESPONSE) {
			++row.responseCount;
			++this.responseCount;
			row.totalTime += message.elapsedTime;

			if (message.elapsedTime > row.maximumTime) {
				row.maximumTime = message.elapsedTime;
			}

			if (message.elapsedTime < row.minimumTime || row.minimumTime === 0) {
				row.minimumTime = message.elapsedTime;
			}
		}
	}

	@action clearMetrics() {
		this.requestCount = 0;
		this.responseCount = 0;
		metricsStore.clear();
	}

	public getRequestCount() {
		return this.requestCount;
	}

	public getResponseCount() {
		return this.responseCount;
	}

	public getQueuedCount() {
		return this.queuedCount;
	}

	@action setSocketConnected(value: boolean) {
		this.socketConnected = value;
	}

	public isConnected(): boolean {
		return this.socketConnected || urlPathStore.isGitHubPages();
	}

	public emitConfig(event: string, proxyConfig: ProxyConfig[]) {
		this.socket?.emit(event, proxyConfig);
	}

	public emitResend(forwardProxy: boolean, method: string, url: string, message: Message, body?: string | object) {
		this.socket?.emit('resend', forwardProxy, method, url, message, body);
	}

	public emitBreakpoint(enable: boolean) {
		this.socket?.emit('breakpoint', enable);
	}

	public async emitDetectBrowsers(): Promise<Browser[]> {
		return new Promise((resolve) => {
			this.socket?.emit('detect browsers', (browsers: Browser[]) => {
				resolve(browsers);
			});
		});
	}

	public emitLaunchBrowser(browser: Browser) {
		this.socket?.emit('launch browser', browser);
	}

	public emitIsFileInDownloads(fileName: string): Promise<boolean> {
		return new Promise((resolve) => {
			this.socket?.emit('is file in downloads', fileName, (result: boolean) => {
				resolve(result);
			});
		});
	}

	public emitReadFile(fileName: string, operator: 'and' | 'or', filters: string[], maxLines: number): Promise<string[]> {
		return new Promise((resolve) => {
			this.socket?.emit('read file', fileName, operator, filters, maxLines, (lines: string[]) => {
				resolve(lines);
			});
		});
	}

	public emitJsonFieldExists(fileName: string, filterField: string): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			this.socket?.emit('json field exists', fileName, filterField, (exists: boolean) => {
				resolve(exists);
			});
		});
	}

	public emitNewSubset(fileName: string, filterField: string, filterValues: string[], timeFieldName: string): Promise<{ fileSize: number, startTime: string, endTime: string }> {
		return new Promise((resolve) => {
			this.socket?.emit('new subset', fileName, filterField, filterValues, timeFieldName,
				(fileSize: number, startTime: string, endTime: string) => {
					resolve({ fileSize, startTime, endTime });
				});
		});
	}

	public emitGetSubsets(fileName: string, timeFieldName: string): Promise<{ filterValue: string, fileSize: number, startTime: string, endTime: string }[]> {
		return new Promise((resolve) => {
			this.socket?.emit('get subsets', fileName, timeFieldName,
				(subsets: { filterValue: string, fileSize: number, startTime: string, endTime: string }[]) => {
					resolve(subsets);
				});
		});
	}

	public emitFileLineMatcher(
		fileName: string,
		timeFieldName: string,
		startTime: string,
		endTime: string,
		operator: 'and' | 'or',
		filters: string[],
		maxLines: number
	): Promise<string[]> {
		return new Promise((resolve) => {
			this.socket?.emit('file line matcher', fileName, timeFieldName, startTime, endTime, operator, filters, maxLines, (lines: string[]) => {
				resolve(lines);
			});
		});
	}
}

export const socketStore = new SocketStore();
