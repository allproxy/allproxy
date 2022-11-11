import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import { messageQueueStore } from "./MessageQueueStore";
import MessageStore from './MessageStore';
import { apFileSystem } from './APFileSystem';

export const ACTIVE_SNAPSHOT_NAME = 'Active';

class Snapshots {
	private snapshots: Map<string, MessageStore[]> = new Map();
	private names: string[] = [];
	private selectedReqSeqNumbers: number[] = [];
	private scrollTop: number[] = [];
	private fileNameMap: Map<string, string> = new Map();
	private jsonPrimaryFieldsMap: Map<string, { name: string, count: number, selected: boolean }[]> = new Map();

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
		jsonFields: { name: string, count: number, selected: boolean }[] = []
	) {
		this.snapshots.set(key, snapshot);
		this.names.push(key);
		this.selectedReqSeqNumbers.push(selectedReqSeqNumber);
		this.scrollTop.push(scrollTop);
		if (fileName) {
			this.fileNameMap.set(key, fileName);
		}
		this.jsonPrimaryFieldsMap.set(key, jsonFields)
	}

	public delete(key: string) {
		this.snapshots.delete(key);
		const index = this.names.indexOf(key);
		this.names.splice(index, 1);
		this.selectedReqSeqNumbers.splice(index, 1);
		this.scrollTop.splice(index, 1);
		this.fileNameMap.delete(key);
		this.jsonPrimaryFieldsMap.delete(key);
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

	public getFileName(key: string): string | undefined {
		return this.fileNameMap.get(key);
	}

	public getJsonPrimaryFields(key: string) {
		return this.jsonPrimaryFieldsMap.get(key);
	}

	public setJsonFields(key: string, jsonPrimaryFields: { name: string, count: number, selected: boolean }[]) {
		this.jsonPrimaryFieldsMap.set(key, jsonPrimaryFields);
	}
}

export default class SnapshotStore {
	private selectedSnapshotName = ACTIVE_SNAPSHOT_NAME;
	private snapshots: Snapshots = new Snapshots();
	private count = 0;

	public constructor() {
		this.snapshots.set(ACTIVE_SNAPSHOT_NAME, [], undefined, undefined, undefined);
		makeAutoObservable(this);
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
		return this.snapshots.setJsonFields(name, fields);
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

	@action public newSnapshot(fileName?: string, snapshot?: MessageStore[]): string {
		const padTime = (num: number) => (num + '').padStart(2, '0');
		const activeSnapshot = this.snapshots.get(ACTIVE_SNAPSHOT_NAME);
		const date = new Date();
		const hours = (date.getHours() >= 12 ? date.getHours() - 12 : date.getHours()) + 1;
		const name = 'Snapshot ' + padTime(hours) + ':' + padTime(date.getMinutes()) + '.' + padTime(date.getSeconds()) + ' ' + this.count++;
		if (snapshot) {
			this.snapshots.set(name, snapshot, fileName, Number.MAX_SAFE_INTEGER, 0);
		} else {
			this.snapshots.set(
				name,
				activeSnapshot.slice(),
				fileName,
				this.getSelectedReqSeqNumbers()[0],
				this.getScrollTop()[0],
				this.getJsonFields(ACTIVE_SNAPSHOT_NAME)
			);
			activeSnapshot.splice(0, activeSnapshot.length);
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

	public exportSelectedSnapshot(fileName: string) {
		const element = document.createElement("a");
		let messages: Message[] = [];
		for (const messageStore of this.getSelectedMessages()) {
			messages.push(messageStore.getMessage());
		}
		const file = new Blob([JSON.stringify(messages, null, 2)], { type: 'text/plain' });
		element.href = URL.createObjectURL(file);
		element.download = fileName + '.allproxy';
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
	}

	public importSnapshot(fileName: string, snapshot: string | Message[]) {
		const parsedBlob = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
		const messageStores: MessageStore[] = [];
		for (const message of parsedBlob) {
			const ms = new MessageStore(message);
			messageStores.push(ms);
		}
		this.newSnapshot(fileName, messageStores);
	}

	public saveSession(sessionName: string) {
		const date = new Date().toLocaleString().replaceAll('/', '-');
		const dir = 'sessions/' + date + ' - ' + sessionName;
		apFileSystem.mkdir(dir);
		for (const key of this.snapshots.getNames()) {
			let messages: Message[] = [];
			for (const messageStore of this.snapshots.get(key)) {
				messages.push(messageStore.getMessage());
			}
			if (messages.length > 0) {
				const data = JSON.stringify(messages, null, 2);
				let name = this.snapshots.getFileName(key);
				if (name === undefined) {
					name = sessionName.length > 0 ? sessionName : date;
				}
				const fileName = dir + '/' + name;
				apFileSystem.writeFile(fileName, data);
			}
		}
	}

	public getSelectedMessages(): MessageStore[] {
		const snapshot = this.snapshots.get(this.selectedSnapshotName);
		return snapshot;
	}
}

export const snapshotStore = new SnapshotStore();