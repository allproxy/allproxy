import { makeAutoObservable, action } from "mobx"
import Message, { NO_RESPONSE } from '../common/Message';
import { breakpointStore } from "./BreakpointStore";
import MessageStore from './MessageStore';
import { snapshotStore } from './SnapshotStore';

const DEFAULT_LIMIT = 1000;
const LOCAL_STORAGE_LIMIT = 'allproxy-limit';

export default class MessageQueueStore {
	private limit: number = this._getLimit();
	private stopped: boolean = false;	
	private autoScroll: boolean = false;
	private freeze: boolean = false;
	private freezeQ: Message[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	private _getLimit(): number {
		const limit = localStorage.getItem(LOCAL_STORAGE_LIMIT);
		if (limit) {
			return Number(limit);
		}
		localStorage.setItem(LOCAL_STORAGE_LIMIT, DEFAULT_LIMIT + '');
		return DEFAULT_LIMIT;
	}

	public getLimit(): number {
		return this.limit;
	}

	@action public setLimit(limit: number) {
		localStorage.setItem(LOCAL_STORAGE_LIMIT, limit + '');
		this.limit = limit;
	}

	public getStopped(): boolean {
		return this.stopped;
	}

	@action public setStopped(stopped: boolean) {
		this.stopped = stopped;
	}

	public getFreeze(): boolean {
		return this.freeze;
	}

	@action public setFreeze(freeze: boolean) {
		if (!freeze) {
			const messages = this.freezeQ.slice();
			this.freezeQ.splice(0, this.freezeQ.length);
			setTimeout(() => this.insertBatch(messages), 1000);
		}
		this.freeze = freeze;
	}

	@action public toggleStopped() {
		this.stopped = !this.stopped;
	}

	public getAutoScroll(): boolean {
		return snapshotStore.isActiveSnapshotSelected() && this.autoScroll;
	}

	@action public toggleAutoScroll() {
		this.autoScroll = !this.autoScroll;
		// When toggling to auto-scroll, de-select the active request, if it is selected.
		// This will expand the request panel to full screen mode, and start the auto
		// scrolling.  If a request is selected, the auto scrolling is stopped until
		// the request is de-selected (clicked again).
		if (this.autoScroll) {
			snapshotStore.getSelectedReqSeqNumbers()[0] = Number.MAX_SAFE_INTEGER;
		}
	}

	@action public clear() {
		while(snapshotStore.getActiveSnapshot().length > 0) {
			snapshotStore.getActiveSnapshot().pop();
		}
		this.stopped = false;
	}

	public getMessages(): MessageStore[] {
		return snapshotStore.getSelectedMessages();
	}

	@action public insertBatch(messages: Message[]) {
		if (this.stopped) return;
		if (this.freeze) {
			this.freezeQ = this.freezeQ.concat(messages);
			return;
		}

		const activeSnapshot = snapshotStore.getActiveSnapshot();

		const copyMessages = activeSnapshot.slice(); // shallow copy
		for (const message of messages) {
			if (!message.proxyConfig?.recording) return;

			let l = 0;
			let r = copyMessages.length - 1;
			let m: number = 0;

			let sn = 0;
			while (l <= r) {
				m = l + Math.floor((r - l) / 2);
				sn = copyMessages[m].getMessage().sequenceNumber;
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
			if (copyMessages.length === 0) {
				copyMessages.push(messageStore);
			} else if (sn === message.sequenceNumber) {
				if (messageStore.getMessage().responseBody !== NO_RESPONSE) {
					copyMessages[m] = messageStore;
				}
			}
			else if (sn < message.sequenceNumber) {
				copyMessages.splice(m + 1, 0, messageStore);
			} else if (sn > message.sequenceNumber) {
				copyMessages.splice(m, 0, messageStore);
			}

			const breakpoint = breakpointStore.findMatchingBreakpoint(message);
			if (breakpoint) {
				activeSnapshot.splice(0, activeSnapshot.length);
				Array.prototype.push.apply(activeSnapshot, copyMessages);
				copyMessages.splice(0, copyMessages.length);
				snapshotStore.newSnapshot(breakpoint.getFilter());
				breakpoint.setEnabled(false); // disable breakpoint
				breakpointStore.changed();
			}

			// Shrink array
			if (copyMessages.length >= this.limit + this.limit / 2) {
				copyMessages.splice(0, copyMessages.length - this.limit);
			}
		}

		activeSnapshot.splice(0, activeSnapshot.length);
		Array.prototype.push.apply(activeSnapshot, copyMessages);
	}
}

export const messageQueueStore = new MessageQueueStore();