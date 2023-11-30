import { makeAutoObservable, action } from "mobx";
import Message from '../common/Message';
import { importJSONFile } from "../ImportJSONFile";
import LayoutStore from "./LayoutStore";
import { DEFAULT_LIMIT, messageQueueStore } from "./MessageQueueStore";
import MessageStore from './MessageStore';
import fetchToCurl from 'fetch-to-curl';

export const ACTIVE_SNAPSHOT_NAME = 'Active';

class Snapshots {
	private snapshots: Map<string, MessageStore[]> = new Map();
	private names: string[] = [];
	private selectedReqSeqNumbers: number[] = [];
	private scrollTop: number[] = [];
	private renderSetTopIndex: number[] = [];
	private highlightSeqNum: number[] = [];
	private fileNameMap: Map<string, string> = new Map();
	private jsonPrimaryFieldsMap: Map<string, { name: string, count: number, selected: boolean }[]> = new Map();
	private jsonPrimaryFieldNames: Map<string, string[]> = new Map();
	private layoutMap: Map<string, LayoutStore> = new Map();

	constructor() {
		makeAutoObservable(this);
	}

	public get(key: string): MessageStore[] {
		return this.snapshots.get(key)!;
	}

	public set(
		key: string,
		snapshot: MessageStore[],
		fileName?: string,
		selectedReqSeqNumber = Number.MAX_SAFE_INTEGER,
		scrollTop = 0,
		jsonFields: { name: string, count: number, selected: boolean }[] = [],
		layout: LayoutStore = new LayoutStore(),
		highlightSeqNum = Number.MAX_SAFE_INTEGER,
		renderSetTopIndex = 0
	) {
		this.snapshots.set(key, snapshot);
		this.names.push(key);
		this.selectedReqSeqNumbers.push(selectedReqSeqNumber);
		this.scrollTop.push(scrollTop);
		this.renderSetTopIndex.push(renderSetTopIndex);
		this.highlightSeqNum.push(highlightSeqNum);
		if (fileName) {
			this.fileNameMap.set(key, fileName);
		}
		this.jsonPrimaryFieldsMap.set(key, jsonFields);
		this.layoutMap.set(key, layout);
	}

	public delete(key: string) {
		this.snapshots.delete(key);
		const index = this.names.indexOf(key);
		this.names.splice(index, 1);
		this.selectedReqSeqNumbers.splice(index, 1);
		this.scrollTop.splice(index, 1);
		this.renderSetTopIndex.splice(index, 1);
		this.highlightSeqNum.splice(index, 1);
		this.fileNameMap.delete(key);
		this.jsonPrimaryFieldsMap.delete(key);
		this.layoutMap.delete(key);
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

	public getJsonPrimaryFields(key: string) {
		return this.jsonPrimaryFieldsMap.get(key);
	}

	public setJsonFields(key: string, jsonPrimaryFields: { name: string, count: number, selected: boolean }[]) {
		this.jsonPrimaryFieldsMap.set(key, jsonPrimaryFields);
		const names: string[] = [];
		for (const field of jsonPrimaryFields) {
			if (field.selected) {
				names.push(field.name);
			}
			this.jsonPrimaryFieldNames.set(key, names);
		}
	}

	public getJsonPrimaryFieldNames(key: string) {
		return this.jsonPrimaryFieldNames.get(key);
	}

	public getLayout(key: string) {
		return this.layoutMap.get(key);
	}
}

export default class SnapshotStore {
	private selectedSnapshotName = ACTIVE_SNAPSHOT_NAME;
	private snapshots: Snapshots = new Snapshots();
	private count = 0;
	private updating = false;
	private updatingMessage = '';
	private notes = '';

	public constructor() {
		this.snapshots.set(ACTIVE_SNAPSHOT_NAME, []);
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

	public getSnapshots() {
		return this.snapshots;
	}

	public isActiveSnapshotSelected() {
		return this.selectedSnapshotName === ACTIVE_SNAPSHOT_NAME;
	}

	public getActiveSnapshot(): MessageStore[] {
		return this.snapshots.get(ACTIVE_SNAPSHOT_NAME);
	}

	public getSnapshotNames(): string[] {
		return this.snapshots.getNames();
	}

	public getSelectedReqSeqNumbers(): number[] {
		return this.snapshots.getSelectedReqSeqNumbers();
	}

	public getScrollTop(): number[] {
		return this.snapshots.getScrollTop();
	}

	public getRenderSetTopIndex(): number[] {
		return this.snapshots.getRenderSetTopIndex();
	}

	public getHightlightSeqNum(): number[] {
		return this.snapshots.getHighlightSeqNum();
	}

	public getSnapshotName(name: string): string {
		const fileName = this.snapshots.getFileName(name);
		if (fileName) {
			return fileName.replace('.allproxy', '');
		} else {
			return 'SNAPSHOT';
		}
	}

	public getJsonFields(name: string) {
		const fields = this.snapshots.getJsonPrimaryFields(name);
		return fields ? fields : [];
	}

	public setJsonFields(name: string, fields: { name: string, count: number, selected: boolean }[]) {
		this.snapshots.setJsonFields(name, fields);
	}

	public getJsonFieldNames(name: string) {
		const names = this.snapshots.getJsonPrimaryFieldNames(name);
		return names ? names : [];
	}

	public getLayout(name: string) {
		return this.snapshots.getLayout(name);
	}

	public getSnapshotCount() {
		return this.snapshots.count();
	}

	public getSnapshotSize(name: string) {
		return this.snapshots.get(name).length;
	}

	public getSelectedSnapshotName(): string {
		return this.selectedSnapshotName;
	}

	@action public setSelectedSnapshotName(name: string) {
		this.selectedSnapshotName = name;
		messageQueueStore.resort();
	}

	public getSelectedSnapshotIndex(): number {
		for (let i = 0; i < this.snapshots.getNames().length; ++i) {
			const name = this.snapshots.getNames()[i];
			if (name === this.selectedSnapshotName) return i;
		}
		return 0;
	}

	@action public newSnapshot(fileName?: string, snapshot?: MessageStore[]): string {
		const padTime = (num: number) => (num + '').padStart(2, '0');
		const date = new Date();
		const hours = (date.getHours() >= 12 ? date.getHours() - 12 : date.getHours()) + 1;
		const name = 'Snapshot ' + padTime(hours) + ':' + padTime(date.getMinutes()) + '.' + padTime(date.getSeconds()) + ' ' + this.count++;
		if (snapshot) {
			const layoutStore = new LayoutStore();
			layoutStore.setVertical(snapshot.length === 0 || snapshot[0].getMessage().protocol !== 'log:');
			this.snapshots.set(name, snapshot, fileName, Number.MAX_SAFE_INTEGER, 0, [], layoutStore);
		} else {
			// Take snapshot of proxy tab
			const activeSnapshot = this.snapshots.get(ACTIVE_SNAPSHOT_NAME);
			const copy = activeSnapshot.slice();
			activeSnapshot.splice(0, activeSnapshot.length);
			this.snapshots.set(
				name,
				copy,
				fileName,
				this.getSelectedReqSeqNumbers()[0],
				this.getScrollTop()[0],
				this.getJsonFields(ACTIVE_SNAPSHOT_NAME),
				this.getLayout(ACTIVE_SNAPSHOT_NAME),
				this.getHightlightSeqNum()[0],
			);
		}
		this.setSelectedSnapshotName(name);
		return name;
	}

	public deleteSnapshot(name: string) {
		this.snapshots.delete(name);
		if (this.selectedSnapshotName === name) {
			this.setSelectedSnapshotName(ACTIVE_SNAPSHOT_NAME);
		}
	}

	public deleteAllSnapshots() {
		for (const name of this.snapshots.getNames().slice()) {
			if (name !== ACTIVE_SNAPSHOT_NAME) {
				this.deleteSnapshot(name);
			}
		}
		this.setSelectedSnapshotName(ACTIVE_SNAPSHOT_NAME);
	}

	public copySelectedSnapshot(): string {
		let messages: Message[] = [];
		for (const messageStore of this.getSelectedMessages()) {
			messages.push(messageStore.getMessage());
		}
		let data = "";
		if (messages[0].protocol === 'log:') {
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

	public copyMessage(message: Message): string {
		let json = { ...message.responseBody as { [key: string]: any } };
		for (const key in json) {
			if (key === 'PREFIX' || key.startsWith('_')) {
				delete json[key];
			}
		}
		// message.path is any non-json data before JSON object.  It is called the PREFIX.
		let line = message.path + compressJSON(json);
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

	public exportSelectedSnapshot(fileName: string) {
		const data = this.copySelectedSnapshot();
		const file = new Blob([data], { type: 'text/plain' });
		const element = document.createElement("a");
		element.href = URL.createObjectURL(file);
		element.download = fileName + '.allproxy';
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
	}

	public importSnapshot(fileName: string, snapshot: string | Message[]) {
		let doDateSort = true;
		let parsedBlob: any;
		if (typeof snapshot === 'string') {
			try {
				parsedBlob = JSON.parse(snapshot);
				doDateSort = false; // no need to re-sort
			} catch (e) {
				console.log('importJSONFile');
				parsedBlob = importJSONFile(fileName, snapshot, []);
			}
		} else {
			parsedBlob = snapshot;
		}

		const messageStores: MessageStore[] = [];
		let messages = (parsedBlob as Message[]);

		for (const message of messages) {
			const ms = new MessageStore(message);
			if (ms.getMessage().protocol !== 'log:') doDateSort = false;
			messageStores.push(ms);
		}
		if (doDateSort) {
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
				message.sequenceNumberRes = i;
				message.sequenceNumber = i;
			});
		}
		const chunkSize = DEFAULT_LIMIT;
		let record = 1;
		while (messageStores.length > 0) {
			if (messageStores.length > chunkSize) {
				const copy = messageStores.splice(0, chunkSize);
				this.newSnapshot(fileName, copy);
				fileName = '...' + record;
				record += chunkSize;
			} else {
				this.newSnapshot(fileName, messageStores);
				messageStores.splice(0, messageStores.length);
			}
		}
	}

	public getSelectedMessages(): MessageStore[] {
		const snapshot = this.snapshots.get(this.selectedSnapshotName);
		return snapshot;
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
	line = line.replace(/\\n/g, '');
	line = line.replace(/\\r/g, '');
	line = line.replace(/\\"/g, '');
	line = line.replace(/ /g, '');
	return line;
}

export const snapshotStore = new SnapshotStore();