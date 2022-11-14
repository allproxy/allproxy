import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";
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

	public async restoreSession(index: number): Promise<number> {
		return new Promise<number>(async (resolve) => {
			const sessionName = this.sessionFileNameList[index];
			const dir = 'sessions/' + sessionName;
			for (const fileName of await apFileSystem.readDir(dir)) {
				if (fileName === 'sessionName.txt') continue;
				const data = await apFileSystem.readFile(dir + '/' + fileName);
				snapshotStore.importSnapshot(fileName, data);
			}
			resolve(0);
		});
	}
}

export const sessionStore = new SessionStore();
