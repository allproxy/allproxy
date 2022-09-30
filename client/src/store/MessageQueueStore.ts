import { makeAutoObservable, action } from "mobx"
import Message, { NO_RESPONSE } from '../common/Message';
import { updateRequestTitles } from "../components/JSONFieldButtons";
import MessageStore from './MessageStore';
import { ACTIVE_SNAPSHOT_NAME, snapshotStore } from './SnapshotStore';

const DEFAULT_LIMIT = 1000;
const LOCAL_STORAGE_LIMIT = 'allproxy-limit';

export default class MessageQueueStore {
	private limit: number = this._getLimit();
	private stopped: boolean = false;
	private autoScroll: boolean = false;
	private sortByReq: boolean = true;
	private freeze: boolean = false;
	private freezeQ: Message[] = [];

	private sortOrder: "desc" | "asc" = 'asc';
	private sortByField: string | undefined;

	private showMoreDetail = false;

	public constructor() {
		makeAutoObservable(this);
	}

	public getRequestAPI() {
		return this.showMoreDetail;
	}
	@action public toggleShowRequestAPI() {
		this.showMoreDetail = !this.showMoreDetail;
	}

	public getSortOrder() {
		return this.sortOrder;
	}
	@action public setSortOrder(order: "desc" | "asc") {
		this.sortOrder = order;
	}
	public getSortByField() {
		return this.sortByField;
	}
	@action public setSortByField(field: string | undefined) {
		this.sortByField = field;
	}
	@action public sortOrderChanged() {
		this.sort();
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

		this.sortCopy(copyMessages);

		selectedMessages.splice(0, selectedMessages.length);
		Array.prototype.push.apply(selectedMessages, copyMessages);
	}

	private sortCopy(copyMessages: MessageStore[]) {
		const getField = (message: Message): string | number => {
			let field = this.sortOrder === 'asc' ? 'zzz' : 'a';
			const obj = message as { [key: string]: any };
			if (this.sortByField && obj[this.sortByField]) {
				field = obj[this.sortByField];
			} else
				if (typeof message.responseBody === 'object') {
					const body = message.responseBody as { [key: string]: any; };
					if (this.sortByField && body[this.sortByField]) {
						field = body[this.sortByField];
					}
				}
			return field;
		}

		if (this.sortByField) {
			copyMessages.sort((a, b) => {
				const aField = getField(a.getMessage());
				const bField = getField(b.getMessage());
				if (this.sortOrder === 'asc') {
					return typeof aField === 'string' ? aField.localeCompare(bField as string) : aField - (bField as number);
				} else {
					return typeof bField === 'string' ? bField.localeCompare(aField as string) : bField - (aField as number);
				}
			})
		} else {
			copyMessages.sort((a, b) => {
				const aSeq = this.sortByReq ? a.getMessage().sequenceNumber : a.getMessage().sequenceNumberRes;
				const bSeq = this.sortByReq ? b.getMessage().sequenceNumber : b.getMessage().sequenceNumberRes;
				return aSeq - bSeq;
			})
		}
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
		// Not sorted by request?
		if (!this.sortByReq || this.sortByField) {
			copyMessages.sort((a, b) => a.getMessage().sequenceNumber - b.getMessage().sequenceNumber);
		}

		for (const message of messages) {
			if (!message.proxyConfig?.recording) return;

			const messageStore = new MessageStore(message);
			if (messageStore.getMessage().protocol === 'log:') {
				this.updateJSONFields(ACTIVE_SNAPSHOT_NAME, [messageStore]);
				updateRequestTitles(ACTIVE_SNAPSHOT_NAME, [messageStore]);
			}
			if (copyMessages.length === 0) {
				copyMessages.push(messageStore);
				continue;
			}

			const msgSequenceNumber = message.sequenceNumber;
			const m = this.binarySearch(copyMessages, msgSequenceNumber, true);

			const messageMatch = copyMessages[m].getMessage();
			const sn = messageMatch.sequenceNumber;
			if (messageMatch.sequenceNumber === msgSequenceNumber) {
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

		if (!this.sortByReq || this.sortByField) {
			this.sortCopy(copyMessages);
		}

		activeSnapshot.splice(0, activeSnapshot.length);
		Array.prototype.push.apply(activeSnapshot, copyMessages);
	}

	public updateJSONFields(snapshotName: string, newMessages: MessageStore[]) {
		const fieldsMap: { [key: string]: { count: number, selected: boolean } } = {};
		for (const f of snapshotStore.getJsonFields(snapshotName)) {
			fieldsMap[f.name] = { count: f.count, selected: f.selected }
		}

		let newFieldFound = false;
		for (const message of newMessages) {
			if (message.getMessage().protocol !== 'log:') continue;
			const json = message.getMessage().responseBody as { [key: string]: any };
			for (const field of Object.keys(json)) {
				if (isNaN(parseInt(field))) {
					if (typeof json[field] === 'string') {
						const selected = message.getMessage().url?.indexOf('>' + field + '<') !== -1;
						if (fieldsMap[field]) {
							fieldsMap[field] = { count: fieldsMap[field].count + 1, selected: fieldsMap[field].selected }
						} else {
							fieldsMap[field] = { count: 1, selected };
							newFieldFound = true;
						}
					}
				}
			}
		}

		if (newFieldFound) {
			const fields2: { name: string, selected: boolean, count: number }[] = [];
			for (const key of Object.keys(fieldsMap)) {
				fields2.push({ name: key, selected: fieldsMap[key].selected, count: fieldsMap[key].count });
			}
			fields2.sort((a, b) => a.selected ? 1 : b.count - a.count)
			snapshotStore.setJsonFields(snapshotName, fields2);
		}
	}
}

export const messageQueueStore = new MessageQueueStore();