import { makeAutoObservable, action } from "mobx"
import Message, { NO_RESPONSE } from '../common/Message';
import MessageStore from './MessageStore';
import filterStore from './FilterStore';

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

	@action public toggleAutoScroll() {
		this.autoScroll = !this.autoScroll;
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
		const messageStore = new MessageStore(message);
		if (this.stores.length === 0) {
			this.stores.push(messageStore);
		} else if (sn === message.sequenceNumber) {
			if (messageStore.getMessage().responseBody !== NO_RESPONSE) {
				this.stores[m] = messageStore;
			}
		}
		else if (sn < message.sequenceNumber) {
			this.stores.splice(m+1, 0, messageStore);
		} else if(sn > message.sequenceNumber) {
			this.stores.splice(m, 0, messageStore);
		}

		// Shrink array when it is 100 larger then limit
		if (this.stores.length >= this.limit + 100) {
			this.stores.splice(0, 100);
		}
	}
}

export const messageQueueStore = new MessageQueueStore();