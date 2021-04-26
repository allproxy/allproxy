import { makeAutoObservable, action } from "mobx"
import io from "socket.io-client";
import Message from '../common/Message';
import proxyConfigStore from './ProxyConfigStore';
import { messageQueueStore } from './MessageQueueStore';
import ProxyConfig from '../common/ProxyConfig';

export default class SocketStore {
	private socket?: SocketIOClient.Socket = undefined;
	private socketConnected: boolean = false;

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
			proxyConfigStore.merge(proxyConfigs);
			proxyConfigStore.load(); // send to server
		});

		this.socket.on('disconnect', () => {
			console.log('socket disconnected');
			this.setSocketConnected(false);
		});

		this.socket.on('error', (e: any) => {
			console.log('socket error', e);
		});

		this.socket.on('reqResJson', (message: Message) => {
			messageQueueStore.insert(message);
		});
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
