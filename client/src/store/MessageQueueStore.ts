import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import MessageStore from './MessageStore';

const DEFAULT_LIMIT = 1000;

export default class MessageQueueStore {
	private stores: MessageStore[] = [];
	private limit: number = DEFAULT_LIMIT;
	private stopped: boolean = false;
	private autoScroll: boolean = false;

	public constructor() {
			makeAutoObservable(this)
	}

	public getLimit(): number {
		return this.limit;
	}

	@action public setLimit(limit: number) {
		this.limit = limit;
	}

	public getStopped(): boolean {
		return this.stopped;
	}

	@action public setStopped(stopped: boolean) {
		this.stopped = stopped;
	}

	@action public toggleStopped() {
		this.stopped = !this.stopped;
	}

	public getAutoScroll(): boolean {
		return this.autoScroll;
	}

	@action public setAutoScroll(autoScroll: boolean) {
		this.autoScroll = autoScroll;
	}

	@action public clear() {
		while(this.stores.length > 0) {
			this.stores.pop();
		}
		this.stopped = false;
	}

	public getMessages(): MessageStore[] {
		return this.stores;
	}

	@action public insert(message: Message) {
		if (this.stopped) return;
		if (!message.proxyConfig?.recording) return;

		let l = 0;
		let r = this.stores.length - 1;
		let m: number = 0;

		let sn = 0;
		while (l <= r) {
			m = l + Math.floor((r - l) / 2);
			sn = this.stores[m].getMessage().sequenceNumber;
			if (sn === message.sequenceNumber) {
				break;
			}

			if (sn < message.sequenceNumber) {
				l = m + 1;
			} else {
				r = m - 1;
			}
		}

		// console.log(l,r,m);
		const store = new MessageStore(message);
		if (this.stores.length === 0) {
			this.stores.push(store);
		} else if (sn === message.sequenceNumber) {
			this.stores[m] = store;
		}
		else if (sn < message.sequenceNumber) {
			this.stores.splice(m+1, 0, store);
		} else if(sn > message.sequenceNumber) {
			this.stores.splice(m, 0, store);
		}

		// Only display the last "n" requests
		if (this.stores.length > this.limit) {
			this.stores.shift();
		}
	}
}

export const messageQueueStore = new MessageQueueStore();