import { makeAutoObservable, action } from "mobx"
import Message, { NO_RESPONSE } from '../common/Message';
import { updatePrimaryJSONField } from "../components/JSONFieldButtons";
import MessageStore from './MessageStore';
import { snapshotStore } from './SnapshotStore';

const DEFAULT_LIMIT = 1000;
const LOCAL_STORAGE_LIMIT = 'allproxy-limit';

export default class MessageQueueStore {
	private limit: number = this._getLimit();
	private stopped: boolean = false;
	private autoScroll: boolean = false;
	private sortByReq: boolean = true;
	private freeze: boolean = false;
	private freezeQ: Message[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public getJsonPrimaryFields() {
		return snapshotStore.getSelectedJsonFields();
	}

	@action public setJsonPrimaryFields(fields: { name: string, selected: boolean }[]) {
		snapshotStore.setSelectedJsonFields(fields);
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

	public getSortByReq(): boolean {
		return this.sortByReq;
	}

	@action public toggleSortBy() {
		this.sortByReq = !this.sortByReq;
		this.sort();
	}

	@action public resort() {
		this.sort();
	}

	@action public clear() {
		while (snapshotStore.getActiveSnapshot().length > 0) {
			snapshotStore.getActiveSnapshot().pop();
		}
		this.stopped = false;
		this.freezeQ.splice(0, this.freezeQ.length);
	}

	public getMessages(): MessageStore[] {
		return snapshotStore.getSelectedMessages();
	}

	public getTotalLength() {
		let count = this.getMessages().length;
		if (snapshotStore.isActiveSnapshotSelected()) {
			count += this.freezeQ.length;
		}
		return count;
	}

	@action private sort() {
		const selectedMessages = snapshotStore.getSelectedMessages();
		const copyMessages = selectedMessages.slice(); // shallow copy

		copyMessages.sort((a, b) => {
			const aSeq = this.sortByReq ? a.getMessage().sequenceNumber : a.getMessage().sequenceNumberRes;
			const bSeq = this.sortByReq ? b.getMessage().sequenceNumber : b.getMessage().sequenceNumberRes;
			return aSeq - bSeq;
		})

		selectedMessages.splice(0, selectedMessages.length);
		Array.prototype.push.apply(selectedMessages, copyMessages);
	}

	private binarySearch(sortedMessages: MessageStore[], matchSeqNum: number, sortByReq: boolean) {
		let l = 0;
		let r = sortedMessages.length - 1;
		let m: number = 0;

		let sn = 0;
		while (l <= r) {
			m = l + Math.floor((r - l) / 2);
			sn = sortByReq ? sortedMessages[m].getMessage().sequenceNumber : sortedMessages[m].getMessage().sequenceNumberRes;
			if (sn === matchSeqNum) {
				break;
			}

			if (sn < matchSeqNum) {
				l = m + 1;
			} else {
				r = m - 1;
			}
		}

		return m;
	}

	@action public insertBatch(messages: Message[]) {
		if (this.stopped) return;
		if (this.freeze) {
			this.freezeQ = this.freezeQ.concat(messages);
			if (this.freezeQ.length > this.limit) {
				this.setFreeze(false);
			}
			return;
		}

		const activeSnapshot = snapshotStore.getActiveSnapshot();

		const copyMessages = activeSnapshot.slice(); // shallow copy
		for (const message of messages) {
			if (!message.proxyConfig?.recording) return;

			const messageStore = new MessageStore(message);
			if (messageStore.getMessage().protocol === 'log:') {
				const primaryJSONFields = messageStore.getMessage().proxyConfig?.hostname.split(',');
				this.buildJSONFields([messageStore], primaryJSONFields ? primaryJSONFields : []);
				if (primaryJSONFields) {
					updatePrimaryJSONField(messageStore, primaryJSONFields);
				}
			}
			if (copyMessages.length === 0) {
				copyMessages.push(messageStore);
				continue;
			}

			// Sorting by response, and
			if (!this.sortByReq &&
				message.responseBody !== NO_RESPONSE) {
				const sortedByReqArray = copyMessages.slice(); // shallow copy
				sortedByReqArray.sort((a, b) => a.getMessage().sequenceNumber - b.getMessage().sequenceNumber);
				const m = this.binarySearch(sortedByReqArray, message.sequenceNumber, true);
				const messageMatch = sortedByReqArray[m].getMessage();
				if (messageMatch.sequenceNumber === message.sequenceNumber) {
					const m2 = this.binarySearch(copyMessages, messageMatch.sequenceNumberRes, false);
					copyMessages.splice(m2, 1); // delete matching message
					if (copyMessages.length === 0) {
						copyMessages.push(messageStore);
						continue;
					}
				}
			}

			const msgSequenceNumber = this.sortByReq ? message.sequenceNumber : message.sequenceNumberRes;
			const m = this.binarySearch(copyMessages, msgSequenceNumber, this.sortByReq);

			const messageMatch = copyMessages[m].getMessage();
			const sn = this.sortByReq ? messageMatch.sequenceNumber : messageMatch.sequenceNumberRes;
			if (sn === msgSequenceNumber) {
				if (messageStore.getMessage().responseBody !== NO_RESPONSE) {
					copyMessages[m] = messageStore;
				}
			}
			else if (sn < msgSequenceNumber) {
				copyMessages.splice(m + 1, 0, messageStore);
			} else if (sn > msgSequenceNumber) {
				copyMessages.splice(m, 0, messageStore);
			}

			// Shrink array
			if (copyMessages.length > this.limit) {
				copyMessages.splice(0, copyMessages.length - this.limit);
			}
		}

		activeSnapshot.splice(0, activeSnapshot.length);
		Array.prototype.push.apply(activeSnapshot, copyMessages);
	}

	public buildJSONFields(messageStores: MessageStore[], selectedJSONFields: string[]) {
		const fieldsMap: { [key: string]: { count: number, selected: boolean } } = {};
		for (const f of this.getJsonPrimaryFields()) {
			fieldsMap[f.name] = { count: 2, selected: f.selected }
		}
		for (const f of selectedJSONFields) {
			if (f.length > 0) {
				fieldsMap[f] = { count: 2, selected: true };
			}
		}
		for (const message of messageStores) {
			if (message.getMessage().protocol !== 'log:') continue;
			const json = message.getMessage().responseBody as { [key: string]: any };
			for (const field of Object.keys(json)) {
				if (isNaN(parseInt(field))) {
					if (typeof json[field] === 'string') {
						const selected = message.getMessage().url?.indexOf('>' + field + '<') !== -1;
						fieldsMap[field] = fieldsMap[field] ?
							{ count: fieldsMap[field].count + 1, selected: fieldsMap[field].selected } :
							{ count: 1, selected };
					}
				}
			}
		}

		const fields2: { name: string, selected: boolean }[] = [];
		for (const key of Object.keys(fieldsMap)) {
			if (fieldsMap[key].count >= 1) {
				fields2.push({ name: key, selected: fieldsMap[key].selected });
			}
		}
		messageQueueStore.setJsonPrimaryFields(fields2);
	}
}

export const messageQueueStore = new MessageQueueStore();