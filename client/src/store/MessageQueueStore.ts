import { makeAutoObservable, action } from "mobx"
import Message, { NO_RESPONSE } from '../common/Message';
import MessageStore from './MessageStore';

const DEFAULT_LIMIT = 1000;

export const ACTIVE_SNAPSHOT_NAME = 'Active';

class Snapshots {
	private snapshots: Map<string, MessageStore[]> = new Map();
	private names: string[] = [];
	private fileNameMap: Map<string, string> = new Map();

	constructor() {
		makeAutoObservable(this);
	}

	public get(key: string): MessageStore[] {
		return this.snapshots.get(key)!;
	}

	public set(key: string, snapshot: MessageStore[], fileName?: string) {
		this.snapshots.set(key, snapshot);
		this.names.push(key);
		if (fileName) {
			this.fileNameMap.set(key, fileName);
		}
	}

	public delete(key: string) {
		this.snapshots.delete(key);
		this.names.splice(this.names.indexOf(key), 1);
		this.fileNameMap.delete(key);
	}

	public count() {
		return this.names.length;
	}

	public getNames(): string[] {
		return this.names;
	}

	public getFileName(key: string): string | undefined {
		return this.fileNameMap.get(key);
	}
}

export default class MessageQueueStore {
	private selectedSnapshotName = ACTIVE_SNAPSHOT_NAME;
	private snapshots: Snapshots = new Snapshots();
	private limit: number = DEFAULT_LIMIT;
	private stopped: boolean = false;
	private autoScroll: boolean = false;

	public constructor() {
		this.snapshots.set(ACTIVE_SNAPSHOT_NAME, []);
		makeAutoObservable(this);
	}

	public isActiveSnapshotSelected() {
		return this.selectedSnapshotName === ACTIVE_SNAPSHOT_NAME;
	}

	public getSnapshotNames(): string[] {
		return this.snapshots.getNames();
	}

	public getSnapshotName(name: string): string {
		const fileName = this.snapshots.getFileName(name);
		if (fileName) {
			return fileName.replace('.middlename', '');
		} else {
			return 'SNAPSHOT';
		}
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
	}

	@action public newSnapshot(fileName?: string, snapshot?: MessageStore[]): string {
		const padTime = (num: number) => (num+'').padStart(2, '0');
		const activeSnapshot = this.snapshots.get(ACTIVE_SNAPSHOT_NAME);
		const date = new Date();
		const hours = (date.getHours() >= 12 ? date.getHours() - 12 : date.getHours()) + 1;
		const name = 'Snapshot ' + padTime(hours) + ':' + padTime(date.getMinutes()) + '.' + padTime(date.getSeconds());
		if(snapshot) {
			this.snapshots.set(name, snapshot, fileName);
		} else {
			this.snapshots.set(name, activeSnapshot.slice(), fileName);
			activeSnapshot.splice(0, activeSnapshot.length);
		}
		return name;
	}

	public deleteSnapshot(name: string) {
		this.snapshots.delete(name);
		if (this.selectedSnapshotName === name) {
			this.selectedSnapshotName = ACTIVE_SNAPSHOT_NAME;
		}
	}

	public deleteAllSnapshots() {
		for(const name of this.snapshots.getNames().slice()) {
			if(name !== ACTIVE_SNAPSHOT_NAME) {
				this.deleteSnapshot(name);
			}
		}
		this.selectedSnapshotName = ACTIVE_SNAPSHOT_NAME;
	}

	public exportSelectedSnapshot(fileName: string) {
		const element = document.createElement("a");
		let messages: Message[] = [];
		for (const messageStore of this.getMessages()) {
			messages.push(messageStore.getMessage());
		}
		const file = new Blob([JSON.stringify(messages, null, 2)], {type: 'text/plain'});
		element.href = URL.createObjectURL(file);
		element.download = fileName + '.middleman';
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
	}

	public importSnapshot(fileName: string, snapshot: string) {
		const parsedBlob = JSON.parse(snapshot);
		const messageStores: MessageStore[] = [];
		for (const message of parsedBlob) {
			const ms = new MessageStore(message);
			messageStores.push(ms);
		}
		this.newSnapshot(fileName, messageStores);
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
		while(this.snapshots.get(ACTIVE_SNAPSHOT_NAME).length > 0) {
			this.snapshots.get(ACTIVE_SNAPSHOT_NAME).pop();
		}
		this.stopped = false;
	}

	public getMessages(): MessageStore[] {
		const snapshot = this.snapshots.get(this.selectedSnapshotName);
		return snapshot;
	}

	@action public insertBatch(messages: Message[]) {
		if (this.stopped) return;

		const activeSnapshot = this.snapshots.get(ACTIVE_SNAPSHOT_NAME);

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

			// Shrink array
			if (copyMessages.length >= this.limit + this.limit / 2) {
				copyMessages.splice(0, this.limit / 2);
			}
		}

		activeSnapshot.splice(0, activeSnapshot.length);
		Array.prototype.push.apply(activeSnapshot, copyMessages);
	}
}

export const messageQueueStore = new MessageQueueStore();