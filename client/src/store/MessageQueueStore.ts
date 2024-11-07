import { makeAutoObservable, action } from "mobx";
import Message, { NO_RESPONSE } from '../common/Message';
import MessageStore from './MessageStore';
import { PROXY_TAB_NAME, mainTabStore } from './MainTabStore';
import { dateToHHMMSS } from "../components/Request";
import GTag from "../GTag";

export const DEFAULT_LIMIT = 50000;
const LOCAL_STORAGE_LIMIT = 'allproxy-limit';

export default class MessageQueueStore {
	private limit: number = _getLimit();
	private stopped: boolean = false;

	private scrollAction: 'top' | 'bottom' | 'pageup' | 'pagedown' | 'filter' | undefined = undefined;

	private sortByReq: boolean = true;

	private sortOrder: "desc" | "asc" = 'asc';
	private sortByField: string | undefined;

	private savaQueries = false;
	private fullPageSearch = false;
	private showAPI = true;
	private showTooltip = false;
	private showUserAgent = false;
	private layout: 'Default' | 'Search Match' | 'Raw Response' = 'Default';

	private scrollToSeqNum: number | null = null;
	private highlightSeqNum: number | null = null;

	public constructor() {
		makeAutoObservable(this);
	}

	public getScrollToSeqNum() {
		return this.scrollToSeqNum;
	}
	@action public setScrollToSeqNum(seqNum: number | null) {
		this.scrollToSeqNum = seqNum;
		// if (seqNum !== null) {
		// 	this.forceRerender();
		// }
		//console.log(seqNum);
		return seqNum;
	}
	public getHighlightSeqNum() {
		return this.highlightSeqNum;
	}
	@action public setHighlightSeqNum(seqNum: number | null) {
		this.highlightSeqNum = seqNum;
	}

	public getSaveQueriesFeature() {
		return this.savaQueries;
	}
	@action public toggleSaveQueriesFeature() {
		this.savaQueries = !this.savaQueries;
	}

	public getFullPageSearch() {
		return this.fullPageSearch;
	}
	@action public toggleFullPageSearch() {
		this.fullPageSearch = !this.fullPageSearch;
	}

	public getShowAPI() {
		return this.showAPI;
	}
	@action public toggleShowAPI() {
		this.showAPI = !this.showAPI;
	}

	public getLayout() {
		return this.layout;
	}
	@action public setLayout(layout: 'Default' | 'Search Match' | 'Raw Response') {
		this.layout = layout;
	}

	public getShowTooltip() {
		return this.showTooltip;
	}
	@action public toggleShowTooltip() {
		this.showTooltip = !this.showTooltip;
		GTag.selectItem('Show Tooltip Checked', this.showTooltip + '');
	}

	public getShowUserAgent() {
		return this.showUserAgent;
	}
	@action public toggleShowRequestUA() {
		this.showUserAgent = !this.showUserAgent;
		GTag.selectItem('Show User Agent Checked', this.showUserAgent + '');
	}

	public getSortOrder() {
		return this.sortOrder;
	}
	@action public setSortOrder(order: "desc" | "asc") {
		this.sortOrder = order;
		GTag.selectItem('Sort Order', this.sortOrder);
	}
	public getSortByField() {
		return this.sortByField;
	}
	@action public setSortByField(field: string | undefined) {
		this.sortByField = field;
		if (field) {
			GTag.selectItem('Sort By Field', field);
		}
	}
	@action public sortOrderChanged() {
		this.sort();
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
		GTag.selectItem('Capture Stopped', this.stopped + '');
	}

	@action public toggleStopped() {
		this.stopped = !this.stopped;
		GTag.selectItem('Capture Stopped', this.stopped + '');
	}

	public getScrollAction(): 'top' | 'bottom' | 'pageup' | 'pagedown' | 'filter' | undefined {
		return this.scrollAction;
	}

	@action public setScrollAction(action: 'top' | 'bottom' | 'pageup' | 'pagedown' | 'filter' | undefined) {
		this.scrollAction = action;
		if (action === 'top' || action === 'bottom') {
			GTag.selectItem('Scroll', action);
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
		mainTabStore.getProxyTab().splice(0, mainTabStore.getProxyTab().length);
		this.stopped = false;
	}

	public getMessages(): MessageStore[] {
		return mainTabStore.getSelectedMessages();
	}

	public getTotalLength() {
		let count = this.getMessages().length;
		return count;
	}

	public getUnfilteredCount() {
		let count = 0;
		for (const message of this.getMessages()) {
			if (!message.isFiltered()) {
				++count;
			}
		}
		return count;
	}

	@action private sort() {
		const selectedMessages = mainTabStore.getSelectedMessages();
		const copyMessages = selectedMessages.slice(); // shallow copy

		this.sortCopy(copyMessages);

		selectedMessages.splice(0, selectedMessages.length);
		Array.prototype.push.apply(selectedMessages, copyMessages);
	}

	private sortCopy(copyMessages: MessageStore[]) {
		const getField = (messageStore: MessageStore): string | number | undefined => {
			if (this.sortByField === undefined) return undefined;
			const message = messageStore.getMessage();
			let field;
			if (message.protocol === 'log:' && this.sortByField === 'url') return undefined;
			const obj = message as { [key: string]: any };
			if (obj[this.sortByField] !== undefined) {
				field = obj[this.sortByField];
			} else {
				let body;
				if (typeof message.requestBody === 'object') {
					body = message.requestBody as { [key: string]: any; };
					field = body[this.sortByField];
					if (field === undefined) {
						field = body[this.sortByField.toLowerCase()];
					}
					if (field === undefined) {
						field = body[this.sortByField.toUpperCase()];
					}
				}
				if (field === undefined && typeof message.responseBody === 'object') {
					body = message.responseBody as { [key: string]: any; };
					field = body[this.sortByField];
					if (field === undefined) {
						field = body[this.sortByField.toLowerCase()];
					}
					if (field === undefined) {
						field = body[this.sortByField.toUpperCase()];
					}
				}
				if (field === undefined && message.protocol == 'log:' && typeof messageStore.getLogEntry().additionalJSON === 'object') {
					body = messageStore.getLogEntry().additionalJSON as { [key: string]: any; };
					field = body[this.sortByField];
					if (field === undefined) {
						field = body[this.sortByField.toLowerCase()];
					}
					if (field === undefined) {
						field = body[this.sortByField.toUpperCase()];
					}
				}
				if (field === undefined && message.protocol === 'log:') {
					switch (this.sortByField) {
						case 'date':
							try {
								field = messageStore.getLogEntry().date.toISOString();
							} catch (e) {
								field = '0';
							}
							break;
						case 'level':
							field = messageStore.getLogEntry().level;
							break;
						case 'category':
							field = messageStore.getLogEntry().category;
							break;
						case 'kind':
							field = messageStore.getLogEntry().kind;
							break;
						case 'message':
							field = messageStore.getLogEntry().message;
							break;
					}
				}
			}
			return field;
		};

		if (this.sortByField) {
			copyMessages.sort((a, b) => {
				let aField = getField(a);
				let bField = getField(b);
				if (aField === undefined) {
					if (bField === undefined) {
						aField = bField = 0;
					} else {
						aField = typeof bField === 'string' ? '' : -999999;
					}
				} else if (bField === undefined) {
					bField = typeof aField === 'string' ? '' : -999999;
				}
				let rc = 0;
				if (this.sortOrder === 'asc') {
					rc = (typeof aField === 'string' ? aField.localeCompare(bField as string) : aField - (bField as number));
				} else {
					rc = (typeof bField === 'string' ? bField.localeCompare(aField as string) : bField - (aField as number));
				}
				return rc;
			});
		} else {
			copyMessages.sort((a, b) => {
				const aSeq = this.sortByReq ? a.getMessage().sequenceNumber : a.getMessage().sequenceNumberRes;
				const bSeq = this.sortByReq ? b.getMessage().sequenceNumber : b.getMessage().sequenceNumberRes;
				return aSeq - bSeq;
			});
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

	@action public forceRerender() {
		const proxyTab = mainTabStore.getProxyTab();
		const copyMessages = proxyTab.slice(); // shallow copy
		proxyTab.splice(0, proxyTab.length);
		Array.prototype.push.apply(proxyTab, copyMessages);
	}

	@action public insertBatch(messages: Message[]) {
		if (this.stopped) return;

		const proxyTab = mainTabStore.getProxyTab();

		const copyMessages = proxyTab.slice(); // shallow copy
		// Not sorted by request?
		if (!this.sortByReq || this.sortByField) {
			copyMessages.sort((a, b) => a.getMessage().sequenceNumber - b.getMessage().sequenceNumber);
		}

		for (const message of messages) {
			if (!message.proxyConfig?.recording) return;

			const messageStore = new MessageStore(message);
			if (messageStore.getMessage().protocol === 'log:') {
				this.updateJSONFields(PROXY_TAB_NAME, [messageStore]);
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
		}

		if (!this.sortByReq || this.sortByField) {
			this.sortCopy(copyMessages);
		}

		// Move batch of messages to new tab when limit (e.g., 10,000) is reached.
		if (copyMessages.length > this.limit) {
			const date = dateToHHMMSS(new Date(copyMessages[0].getMessage().timestamp));
			mainTabStore.newTab(date);
			copyMessages.splice(0, proxyTab.length);
		}

		proxyTab.splice(0, proxyTab.length);
		Array.prototype.push.apply(proxyTab, copyMessages);
	}

	public updateJSONFields(_tabName: string, newMessages: MessageStore[]) {
		for (const message of newMessages) {
			if (message.getMessage().protocol !== 'log:') continue;
			let json = message.getMessage().responseBody as { [key: string]: any };
			json = {
				...message.getLogEntry().additionalJSON,
				...json
			};
			if (json['PREFIX'] === undefined && message.getMessage().path) {
				const json2: { [key: string]: any } = {};
				json2['PREFIX'] = message.getMessage().path;
				for (const key in json) {
					json2[key] = json[key];
				}
				message.getMessage().responseBody = json2;
				json = json2;
			}
		}
	}
}

export function _getLimit(): number {
	try {
		const limit = localStorage.getItem(LOCAL_STORAGE_LIMIT);
		if (limit) {
			// Ensure limit is at least 20000
			if (Number(limit) > 20000) {
				return Number(limit);
			}
		}

		localStorage.setItem(LOCAL_STORAGE_LIMIT, DEFAULT_LIMIT + '');
	} catch (e) { }
	return DEFAULT_LIMIT;
}

export const messageQueueStore = new MessageQueueStore();