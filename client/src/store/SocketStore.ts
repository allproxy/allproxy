import { makeAutoObservable, action } from "mobx"
import io from "socket.io-client";
import Message from '../common/Message';
import proxyConfigStore from './ProxyConfigStore';
import { messageQueueStore } from './MessageQueueStore';
import ProxyConfig from '../common/ProxyConfig';
import { BlurCircular } from '@material-ui/icons';

export default class SocketStore {
	private socket?: SocketIOClient.Socket = undefined;
	private socketConnected: boolean = false;
	private queuedCount: number = 0;
	private inCount: number = 0;

	public constructor() {
		makeAutoObservable(this);
		this.connect();
	}

	@action private connect() {
		this.socket = io();

		this.socket.on('connect', () => {
			console.log('socket connected');
			this.setSocketConnected(true);
		});

		this.socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
			//console.log('proxy configs', proxyConfigs);
			proxyConfigStore.setProxyConfigs(proxyConfigs);
			proxyConfigStore.load(); // send to server
		});

		this.socket.on('disconnect', () => {
			console.log('socket disconnected');
			this.setSocketConnected(false);
		});

		this.socket.on('error', (e: any) => {
			console.log('socket error', e);
		});

		this.socket.on('reqResJson', (message: Message, queuedCount: number, callback: any) => {
			this.queuedCount = queuedCount;
			this.inCount++;
			messageQueueStore.insert(message);
			if (callback) {
				callback(`${message.sequenceNumber} socket.io callback`);
			}
		});
	}

	@action clearInCount() {
		this.inCount = 0;
	}

	public getInCount() {
		return this.inCount;
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
}

export const socketStore = new SocketStore();
