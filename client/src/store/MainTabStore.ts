import { makeAutoObservable, action } from "mobx";
import Message from '../common/Message';
import { importJsonLines } from "../ImportJSONFile";
import LayoutStore from "./LayoutStore";
import { DEFAULT_LIMIT, messageQueueStore } from "./MessageQueueStore";
import MessageStore from './MessageStore';
import fetchToCurl from 'fetch-to-curl';
import { namedQueriesStore, namedSubQueriesStore } from "./NamedQueriesStore";
import { isJsonLogTab } from "../components/SideBar";
import FileReaderStore from "./FileReaderStore";
import { jsonLogStore, updateJSONRequestLabels } from "./JSONLogStore";
import { getPluginFunc } from "../Plugins";

export const PROXY_TAB_NAME = 'Proxy';

class MainTabs {
	private tabs: Map<string, MessageStore[]> = new Map();
	private names: string[] = [];
	private selectedReqSeqNumbers: number[] = [];
	private scrollTop: number[] = [];
	private renderSetTopIndex: number[] = [];
	private highlightSeqNum: number[] = [];
	private fileNameMap: Map<string, string> = new Map();
	private jsonSearchFieldsMap: Map<string, string[]> = new Map();
	private layoutMap: Map<string, LayoutStore> = new Map();
	private fileReaderStores: (FileReaderStore | undefined)[] = [];

	constructor() {
		makeAutoObservable(this);
	}

	public get(key: string): MessageStore[] {
		return this.tabs.get(key)!;
	}

	public set(
		key: string,
		messageStores: MessageStore[],
		fileName?: string,
		selectedReqSeqNumber = Number.MAX_SAFE_INTEGER,
		scrollTop = 0,
		jsonSearchFields: string[] = [],
		layout: LayoutStore = new LayoutStore(),
		highlightSeqNum = Number.MAX_SAFE_INTEGER,
		renderSetTopIndex = 0
	) {
		this.tabs.set(key, messageStores);
		this.names.push(key);
		this.selectedReqSeqNumbers.push(selectedReqSeqNumber);
		this.scrollTop.push(scrollTop);
		this.renderSetTopIndex.push(renderSetTopIndex);
		this.highlightSeqNum.push(highlightSeqNum);
		if (fileName) {
			this.fileNameMap.set(key, fileName);
		}
		this.jsonSearchFieldsMap.set(key, jsonSearchFields);
		this.layoutMap.set(key, layout);
		this.fileReaderStores.push(undefined);
	}

	public delete(key: string) {
		this.tabs.delete(key);
		const index = this.names.indexOf(key);
		this.names.splice(index, 1);
		this.selectedReqSeqNumbers.splice(index, 1);
		this.scrollTop.splice(index, 1);
		this.renderSetTopIndex.splice(index, 1);
		this.highlightSeqNum.splice(index, 1);
		this.fileNameMap.delete(key);
		this.jsonSearchFieldsMap.delete(key);
		this.layoutMap.delete(key);
		this.fileReaderStores.splice(index, 1);
	}

	public count() {
		return this.names.length;
	}

	public getNames(): string[] {
		return this.names;
	}

	public getSelectedReqSeqNumbers(): number[] {
		return this.selectedReqSeqNumbers;
	}

	public getScrollTop(): number[] {
		return this.scrollTop;
	}

	public getRenderSetTopIndex(): number[] {
		return this.renderSetTopIndex;
	}

	public getHighlightSeqNum(): number[] {
		return this.highlightSeqNum;
	}

	public getFileName(key: string): string | undefined {
		return this.fileNameMap.get(key);
	}

	public getJsonSearchFields(key: string): string[] {
		let fields = this.jsonSearchFieldsMap.get(key);
		if (!fields) {
			fields = [];
			this.jsonSearchFieldsMap.set(key, fields);
		}
		return fields;
	}

	public getLayout(key: string) {
		return this.layoutMap.get(key);
	}

	public getFileReaderStores(): (FileReaderStore | undefined)[] {
		return this.fileReaderStores;
	}
}

export default class MainTabStore {
	private selectedTabName = PROXY_TAB_NAME;
	private tabs: MainTabs = new MainTabs();
	private count = 0;
	private updating = false;
	private updatingMessage = '';
	private notes = '';

	public constructor() {
		this.tabs.set(PROXY_TAB_NAME, []);
		makeAutoObservable(this);
	}

	public getNotes() {
		return this.notes;
	}

	@action public setNotes(notes: string) {
		this.notes = notes;
	}

	public isUpdating() {
		return this.updating;
	}
	@action setUpdating(updating: boolean, message: string = "Updating...") {
		this.updating = updating;
		this.updatingMessage = message;
	}
	public getUpdatingMessage() {
		return this.updatingMessage;
	}

	public getTabs() {
		return this.tabs;
	}

	public isProxyTabSelected() {
		return this.selectedTabName === PROXY_TAB_NAME;
	}

	public getProxyTab(): MessageStore[] {
		return this.tabs.get(PROXY_TAB_NAME);
	}

	public getTabNames(): string[] {
		return this.tabs.getNames();
	}

	public getSelectedReqSeqNumbers(): number[] {
		return this.tabs.getSelectedReqSeqNumbers();
	}

	public getScrollTop(): number[] {
		return this.tabs.getScrollTop();
	}

	public getRenderSetTopIndex(): number[] {
		return this.tabs.getRenderSetTopIndex();
	}

	public getHightlightSeqNum(): number[] {
		return this.tabs.getHighlightSeqNum();
	}

	public getTabName(name: string): string {
		const fileName = this.tabs.getFileName(name);
		if (fileName) {
			return fileName;
		} else {
			return 'TAB';
		}
	}

	public addJsonSearchField(tabName: string, field: string) {
		if (!jsonLogStore.getJSONFieldNames().includes(field)) {
			const fields = this.tabs.getJsonSearchFields(tabName);
			if (!fields.includes(field)) {
				fields.push(field);
				updateJSONRequestLabels();
			}
		}
	}

	public getJsonSearchFieldNames(name: string) {
		const names = this.tabs.getJsonSearchFields(name);
		return names ? names : [];
	}

	public getLayout(name: string) {
		return this.tabs.getLayout(name);
	}

	public getFileReaderStores() {
		return this.tabs.getFileReaderStores();
	}

	public getTabCount() {
		return this.tabs.count();
	}

	public getTabMessageCount(name: string) {
		return this.tabs.get(name).length;
	}

	public getSelectedTabName(): string {
		return this.selectedTabName;
	}

	@action public setSelectedTabName(name: string) {
		this.selectedTabName = name;
		messageQueueStore.resort();
		for (const messageStore of mainTabStore.getSelectedMessages()) {
			messageStore.setFiltered(undefined);
		}
		setTimeout(() => {
			namedQueriesStore.setLogType(isJsonLogTab() ? 'json' : 'proxy');
			namedSubQueriesStore.setLogType(isJsonLogTab() ? 'json' : 'proxy');
		});
	}

	public getSelectedTabIndex(): number {
		for (let i = 0; i < this.tabs.getNames().length; ++i) {
			const name = this.tabs.getNames()[i];
			if (name === this.selectedTabName) return i;
		}
		return 0;
	}

	@action public newTab(fileName?: string, messageStores?: MessageStore[]): string {
		const padTime = (num: number) => (num + '').padStart(2, '0');
		const date = new Date();
		const hours = (date.getHours() >= 12 ? date.getHours() - 12 : date.getHours()) + 1;
		const name = 'Tab ' + padTime(hours) + ':' + padTime(date.getMinutes()) + '.' + padTime(date.getSeconds()) + ' ' + this.count++;
		if (messageStores) {
			const layoutStore = new LayoutStore();
			layoutStore.setVertical(messageStores.length === 0 || messageStores[0].getMessage().protocol !== 'log:');
			this.tabs.set(name, messageStores, fileName, Number.MAX_SAFE_INTEGER, 0, [], layoutStore);
		} else {
			// Copy the proxy tab data to new tab
			const proxyTab = this.tabs.get(PROXY_TAB_NAME);
			const copy = proxyTab.slice();
			proxyTab.splice(0, proxyTab.length);
			this.tabs.set(
				name,
				copy,
				fileName,
				this.getSelectedReqSeqNumbers()[0],
				this.getScrollTop()[0],
				[],
				this.getLayout(PROXY_TAB_NAME),
				this.getHightlightSeqNum()[0],
			);
		}
		this.setSelectedTabName(name);
		return name;
	}

	public deleteTab(name: string) {
		this.tabs.delete(name);
		if (this.selectedTabName === name) {
			this.setSelectedTabName(PROXY_TAB_NAME);
		}
	}

	public deleteAllTabs() {
		for (const name of this.tabs.getNames().slice()) {
			if (name !== PROXY_TAB_NAME) {
				this.deleteTab(name);
			}
		}
		this.setSelectedTabName(PROXY_TAB_NAME);
	}

	public copySelectedTab(): string {
		let messages: Message[] = [];
		for (const messageStore of this.getSelectedMessages()) {
			messages.push(messageStore.getMessage());
		}
		let data = "";
		if (isJsonLogTab()) {
			for (const message of messages) {
				const messageStore = new MessageStore(message);
				if (messageStore.isFiltered()) continue;
				let json = message.responseBody as { [key: string]: any };
				const prefix = json['PREFIX'];
				if (prefix) {
					delete json['PREFIX'];
				}
				// message.path is any non-json data before JSON object.  It is called the PREFIX.
				const line = message.path + JSON.stringify(message.responseBody);
				data += line + '\n';
				if (prefix) {
					json['PREFIX'] = prefix;
				}
			}
		} else {
			data = JSON.stringify(messages, null, 2);
		}
		return data;
	}

	public copyMessage(message: MessageStore): string {
		let line = message.getLogEntry().rawLine;
		line = line.replace(/\\"/g, '');
		return line;
	}

	public copyAsCurl(message: Message): string {
		return fetchToCurl({
			url: message.url,
			headers: getSafeHeaders(message),
			method: message.method,
			body: message.requestBody ? message.requestBody : undefined
		});
	}

	public exportSelectedTab(fileName: string) {
		const data = this.copySelectedTab();
		const file = new Blob([data], { type: 'text/plain' });
		const element = document.createElement("a");
		element.href = URL.createObjectURL(file);

		const extension = isJsonLogTab() ? '.json' : '.allproxy';
		element.download = fileName + extension;
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
	}

	public importTabFromFile(tabName: string, data: string) {
		let messages: Message[] = [];
		let sortRequired: 'sort' | undefined;
		try {
			messages = JSON.parse(data);
			sortRequired = undefined; // no need to re-sort
		} catch (e) {
			console.log('importJSONFile');
			const lines = data.split('\n');
			messages = importJsonLines(tabName, lines);
			sortRequired = 'sort';
		}
		this.importTab(tabName, messages, sortRequired);
	}

	public importTab(
		tabName: string,
		messages: Message[],
		sortRequired?: 'sort' | undefined,
		maxLines = Number.MAX_SAFE_INTEGER,
		startTime: string = '',
		endTime: string = '',
	): number {
		jsonLogStore.updateScriptFunc();
		updateJSONRequestLabels();

		// Call importJSON plugin
		const jsonObjects: {}[] = [];
		for (const message of messages) {
			if (message.protocol === 'log:' && typeof message.responseBody === 'object') {
				jsonObjects.push(message.responseBody);
			}
		}
		if (jsonObjects.length > 0) {
			getPluginFunc("importJSON")(jsonObjects);
		}

		let startTimeDate = new Date(0);
		let endTimeDate = new Date();
		if (startTime !== '') {
			startTimeDate = new Date(startTime);
		}
		if (endTime !== '') {
			endTimeDate = new Date(endTime);
		}

		const messageStores: MessageStore[] = [];
		for (const message of messages) {
			const ms = new MessageStore(message);

			if (startTime !== '' || endTime !== '') {
				const date = ms.getLogEntry().date;
				if (date.toString() === 'Invalid Date') continue;
				if (date < startTimeDate || date > endTimeDate) continue;
			}

			if (messageStores.length <= maxLines) {
				messageStores.push(ms);
			}
		}

		if (sortRequired === 'sort') {
			messageStores.sort((a, b) => {
				let dateA: Date = a.getLogEntry().date;
				let dateB: Date = b.getLogEntry().date;
				if (dateA < dateB) {
					return -1;
				} else if (dateA > dateB) {
					return 1;
				} else {
					return 0;
				}
			});
			messageStores.map((m, i) => {
				const message = m.getMessage();
				message.sequenceNumber = message.sequenceNumberRes = i;
			});
		}

		const size = messageStores.length;

		const chunkSize = DEFAULT_LIMIT;
		while (messageStores.length > 0) {
			if (messageStores.length > chunkSize) {
				const copy = messageStores.splice(0, chunkSize);
				this.newTab(tabName, copy);
				tabName = copy[0].getLogEntry().date.toISOString().split("T")[1];
			} else {
				this.newTab(tabName, messageStores);
				messageStores.splice(0, messageStores.length);
			}
		}

		return size;
	}

	public getSelectedMessages(): MessageStore[] {
		const messageStores = this.tabs.get(this.selectedTabName);
		return messageStores;
	}
}

function getSafeHeaders(message: Message) {
	const headers: { [key: string]: string } = {};
	const unsafeHeaders = [
		'host',
		'connection',
		'content-length',
		'origin',
		'referer',
		'accept-encoding',
		'cookie',
		'sec-fetch-dest',
		'proxy-connection'
	];
	for (const header in message.requestHeaders) {
		if (unsafeHeaders.indexOf(header) === -1) {
			headers[header] = message.requestHeaders[header];
		}
	}
	return headers;
}


export function compressJSON(json: object) {
	let line = JSON.stringify(json);
	line = line.replace(/\n/g, '');
	line = line.replace(/\r/g, '');
	line = line.replace(/\\"/g, '');
	//line = line.replace(/ /g, '');
	return line;
}

export const mainTabStore = new MainTabStore();