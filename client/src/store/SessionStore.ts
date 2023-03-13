import { makeAutoObservable, action } from "mobx"
import Message from "../common/Message";
import { apFileSystem } from "./APFileSystem";
import { messageQueueStore } from "./MessageQueueStore";
import { snapshotStore } from "./SnapshotStore";

export default class SessionStore {
	private sessionFileNameList: string[] = [];
	private sessionList: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public async init() {
		this.sessionFileNameList.splice(0, this.sessionFileNameList.length);
		this.sessionList.splice(0, this.sessionList.length);

		const fileNames = await apFileSystem.readDir('sessions/');
		for (const fileName of fileNames) {
			this.sessionFileNameList.push(fileName);
			const exists = await apFileSystem.exists(`sessions/${fileName}/sessionName.txt`);
			let sessionName = '';
			if (exists) {
				sessionName = await apFileSystem.readFile(`sessions/${fileName}/sessionName.txt`);
			}
			const sn = sessionName.length > 0 ? ' - ' + sessionName : '';
			this.sessionList.push(fileName + sn);
		}
		this.sessionList.sort((a, b) => {
			a = a.split(' - ')[0];
			b = b.split(' - ')[0];
			return new Date(a).getTime() - new Date(b).getTime();
		});
	}

	public getSessionList() {
		return this.sessionList;
	}

	@action public deleteEntry(index: number) {
		const sessionName = this.sessionFileNameList[index];
		apFileSystem.rmdir('sessions/' + sessionName);
		this.sessionFileNameList.splice(index, 1);
		this.sessionList.splice(index, 1);
	}

	public async saveSession(sessionName: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			messageQueueStore.setFreeze(true);
			const date = new Date().toLocaleString().replaceAll('/', '-');
			const dir = 'sessions/' + date;
			await apFileSystem.mkdir(dir);
			await apFileSystem.writeFile(dir + '/sessionName.txt', sessionName);
			let i = 1;
			for (const key of snapshotStore.getSnapshotNames()) {
				let messages: Message[] = [];
				for (const messageStore of snapshotStore.getSnapshots().get(key)) {
					messages.push(messageStore.getMessage());
				}
				if (messages.length > 0) {
					const data = JSON.stringify(messages, null, 2);
					let tabName = snapshotStore.getSnapshots().getFileName(key);
					if (tabName === undefined) {
						tabName = date;
					}
					const subDir = dir + '/tab' + i++;
					await apFileSystem.mkdir(subDir);
					await apFileSystem.writeFile(subDir + '/tabName.txt', tabName);
					await apFileSystem.writeFile(subDir + '/data.txt', data);
				}
			}
			messageQueueStore.setFreeze(false);
			resolve();
		})
	}

	public async restoreSession(index: number): Promise<number> {
		return new Promise<number>(async (resolve) => {
			const sessionDir = this.sessionFileNameList[index];
			const dir = 'sessions/' + sessionDir;
			let sessionName = '';
			const exists = await apFileSystem.exists(dir + '/sessionName.txt');
			if (exists) {
				sessionName = await apFileSystem.readFile(dir + '/sessionName.txt');
			}
			for (let dirEntry of await apFileSystem.readDir(dir)) {
				if (dirEntry === 'sessionName.txt') continue;
				if (dirEntry.startsWith('tab')) {
					let tabName = await apFileSystem.readFile(dir + '/' + dirEntry + '/tabName.txt');
					if (tabName === sessionDir && sessionName.length > 0) {
						tabName = sessionName;
					}
					const data = await apFileSystem.readFile(dir + '/' + dirEntry + '/data.txt');
					snapshotStore.importSnapshot(tabName, data);
				} else { // backwards compatibility
					const data = await apFileSystem.readFile(dir + '/' + dirEntry);
					if (dirEntry === sessionDir && sessionName.length > 0) {
						dirEntry = sessionName;
					}
					snapshotStore.importSnapshot(dirEntry, data);
				}
			}
			resolve(0);
		});
	}
}

export const sessionStore = new SessionStore();
