import { makeAutoObservable, action } from "mobx"
import io, { Socket } from "socket.io-client";
import Message, { MessageType } from '../common/Message';
import proxyConfigStore from './ProxyConfigStore';
import portConfigStore from "./PortConfigStore";
import { messageQueueStore } from './MessageQueueStore';
import ProxyConfig from '../common/ProxyConfig';
import PortConfig from '../common/PortConfig';
import { metricsStore } from './MetricsStore';
import { mapProtocolToIndex } from './MetricsStore';
import { noCaptureStore } from "./NoCaptureStore";
import { filterStore } from "./FilterStore";
import MessageStore from "./MessageStore";
import { snapshotStore } from "./SnapshotStore";
import { breakpointStore } from "./BreakpointStore";
import { Browser } from "./BrowserStore";
import { apFileSystem } from "./APFileSystem";

export default class SocketStore {
	private socket?: Socket = undefined;
	private socketConnected: boolean = false;
	private queuedCount: number = 0;
	private requestCount: number = 0;
	private responseCount: number = 0;

	public constructor() {
		makeAutoObservable(this);
		this.connect();
	}

	@action private connect() {
		this.socket = io();

		this.socket.on('connect', () => {
			//console.log('socket connected');
			this.setSocketConnected(true);
			if (this.socket) {
				apFileSystem.setSocket(this.socket);
			}
		});

		this.socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
			//console.log('proxy configs', proxyConfigs);
			proxyConfigStore.setProxyConfigs(proxyConfigs);
			proxyConfigStore.load(); // send to server
			breakpointStore.init();
		});

		this.socket.on('port config', (portConfig: PortConfig) => {
			portConfigStore.setConfig(portConfig);
		});

		this.socket.on('disconnect', () => {
			//console.log('socket disconnected');
			this.setSocketConnected(false);
		});

		this.socket.on('error', (e: any) => {
			console.log('socket error', e);
		});

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

			// Filter messages:
			// 1) From clients that are in the No Capture List
			// 2) If delete filtered (X) is selected, and message doesn't match filter criteria
			const filteredMessages = messages.filter(
				message => {
					if (noCaptureStore.contains(message)) return false;
					if (
						filterStore.getFilter().length > 0
						&& filterStore.deleteFiltered()
						&& filterStore.isFiltered(new MessageStore(message))) {
						return false;
					}
					return true;
				}
			);

			if (snapshotStore.getActiveSnapshot().length + filteredMessages.length > messageQueueStore.getLimit()) {
				messageQueueStore.setFreeze(true)
			}
			messageQueueStore.insertBatch(filteredMessages);

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
		return this.socketConnected;
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
		})
	}

	public emitLaunchBrowser(browser: Browser) {
		this.socket?.emit('launch browser', browser);
	}
}

export const socketStore = new SocketStore();
