import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";
import { snapshotStore } from "./SnapshotStore";

export default class SessionStore {
	private sessionList: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public async init() {
		this.sessionList.splice(0, this.sessionList.length);
		for (const sessionName of await apFileSystem.readDir('sessions/')) {
			this.sessionList.push(sessionName);
		}
	}

	public getSessionList() {
		return this.sessionList;
	}

	@action public deleteEntry(index: number) {
		const sessionName = this.sessionList[index];
		apFileSystem.rmdir('sessions/' + sessionName);
		this.sessionList.splice(index, 1);
	}

	public async restoreSession(index: number) {
		const sessionName = this.sessionList[index];
		const dir = 'sessions/' + sessionName;
		for (const fileName of await apFileSystem.readDir(dir)) {
			const data = await apFileSystem.readFile(dir + '/' + fileName);
			snapshotStore.importSnapshot(fileName, data);
		}
	}
}

export const sessionStore = new SessionStore();
