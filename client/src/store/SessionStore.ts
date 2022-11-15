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
			apFileSystem.mkdir(dir);
			apFileSystem.writeFile(dir + '/sessionName.txt', sessionName);
			for (const key of snapshotStore.getSnapshotNames()) {
				let messages: Message[] = [];
				for (const messageStore of snapshotStore.getSnapshots().get(key)) {
					messages.push(messageStore.getMessage());
				}
				if (messages.length > 0) {
					const data = JSON.stringify(messages, null, 2);
					let name = snapshotStore.getSnapshots().getFileName(key);
					if (name === undefined) {
						name = date;
					}
					const fileName = dir + '/' + name;
					await apFileSystem.writeFile(fileName, data);
				}
			}
			messageQueueStore.setFreeze(false);
			resolve();
		})
	}

	public async restoreSession(index: number): Promise<number> {
		return new Promise<number>(async (resolve) => {
			const dirName = this.sessionFileNameList[index];
			const dir = 'sessions/' + dirName;
			let sessionName = '';
			const exists = await apFileSystem.exists(dir + '/sessionName.txt');
			if (exists) {
				sessionName = await apFileSystem.readFile(dir + '/sessionName.txt');
			}
			for (let fileName of await apFileSystem.readDir(dir)) {
				if (fileName === 'sessionName.txt') continue;
				const data = await apFileSystem.readFile(dir + '/' + fileName);
				if (fileName === dirName && sessionName.length > 0) {
					fileName = sessionName;
				}
				snapshotStore.importSnapshot(fileName, data);
			}
			resolve(0);
		});
	}
}

export const sessionStore = new SessionStore();
