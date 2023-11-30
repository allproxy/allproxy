import { makeAutoObservable, action } from "mobx";
import Message from "../common/Message";
import { apFileSystem } from "./APFileSystem";
import { messageQueueStore } from "./MessageQueueStore";
import { mainTabStore } from "./MainTabStore";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
		fileNames.sort((a, b) => {
			a = a.split(' - ')[0].replaceAll('-', '/');
			b = b.split(' - ')[0].replaceAll('-', '/');
			return new Date(b).getTime() - new Date(a).getTime();
		});
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
			await apFileSystem.mkdir(dir);
			await apFileSystem.writeFile(dir + '/sessionName.txt', sessionName);
			let i = 1;
			for (const key of mainTabStore.getTabNames()) {
				let messages: Message[] = [];
				for (const messageStore of mainTabStore.getTabs().get(key)) {
					messages.push(messageStore.getMessage());
				}
				if (messages.length > 0) {
					const data = JSON.stringify(messages);
					let tabName = mainTabStore.getTabs().getFileName(key);
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

			await apFileSystem.writeFile(dir + '/notes.txt', mainTabStore.getNotes());
			resolve();
		});
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
				if (dirEntry === 'notes.txt') continue;
				if (dirEntry.startsWith('tab')) {
					let tabName = await apFileSystem.readFile(dir + '/' + dirEntry + '/tabName.txt');
					if (tabName === sessionDir && sessionName.length > 0) {
						tabName = sessionName;
					}
					const data = await apFileSystem.readFile(dir + '/' + dirEntry + '/data.txt');
					mainTabStore.importTab(tabName, data);
				} else { // backwards compatibility
					const data = await apFileSystem.readFile(dir + '/' + dirEntry);
					if (dirEntry === sessionDir && sessionName.length > 0) {
						dirEntry = sessionName;
					}
					mainTabStore.importTab(dirEntry, data);
				}
			}
			if (await apFileSystem.exists(dir + '/notes.txt')) {
				const notes = await apFileSystem.readFile(dir + '/notes.txt');
				mainTabStore.setNotes(notes);
			}
			resolve(0);
		});
	}

	public async exportSession(index: number, zipFileName: string): Promise<number> {
		return new Promise<number>(async (resolve) => {
			const zip = new JSZip();
			const sessionDir = this.sessionFileNameList[index];
			const dir = 'sessions/' + sessionDir;
			let sessionName = '';
			const exists = await apFileSystem.exists(dir + '/sessionName.txt');
			if (exists) {
				sessionName = await apFileSystem.readFile(dir + '/sessionName.txt');
				zip.file("sessionName.txt", sessionName);
			}
			for (let dirEntry of await apFileSystem.readDir(dir)) {
				if (dirEntry === 'sessionName.txt') continue;
				if (dirEntry === 'notes.txt') continue;
				if (dirEntry.startsWith('tab')) {
					const tab = zip.folder(dirEntry);
					let tabName = await apFileSystem.readFile(dir + '/' + dirEntry + '/tabName.txt');
					tab?.file('tabName.txt', tabName);
					const data = await apFileSystem.readFile(dir + '/' + dirEntry + '/data.txt');
					tab?.file("data.txt", data);
				}
			}
			if (await apFileSystem.exists(dir + '/notes.txt')) {
				const notes = await apFileSystem.readFile(dir + '/notes.txt');
				zip.file('notes.text', notes);
			}
			const content = await zip.generateAsync({ type: "blob" });
			saveAs(content, zipFileName + ".zip");
			resolve(0);
		});
	}

	public importSession() {
		var input = document.createElement('input');
		input.type = 'file';
		input.click();

		input.onchange = (e: any) => {
			let file = e.target.files[0];
			if (file.type !== 'application/zip') {
				console.log(file);
				alert(file.name + " is not a zip file!");
				return;
			}

			// setting up the reader
			const reader = new FileReader();

			reader.readAsArrayBuffer(file);

			// here we tell the reader what to do when it's done reading...
			reader.onload = async (readerEvent: any) => {
				const archive = await new JSZip().loadAsync(readerEvent.target.result);

				const sessionNameFile = archive.file('sessionName.txt');
				if (sessionNameFile === null) {
					alert(file.name + ": unsupported zip file - sessionName.txt doesn't exist");
				}

				const dropOffQ: { [key: string]: { tabName: string, data: string } } = {};
				const orderedTabs: string[] = [];
				archive.forEach(async (_, jzipObject) => {
					if (jzipObject.dir && jzipObject.name.startsWith('tab')) {
						orderedTabs.push(jzipObject.name);
						const tabNameFile = archive.files[jzipObject.name + 'tabName.txt'];
						const tabName = await tabNameFile.async('text');
						const dataFile = archive.files[jzipObject.name + 'data.txt'];
						const data = await dataFile.async('text');
						if (orderedTabs[0] === jzipObject.name) {
							mainTabStore.importTab(tabName, data);
							orderedTabs.shift();
							while (orderedTabs.length > 0 && dropOffQ[orderedTabs[0]] !== undefined) {
								const tab = dropOffQ[orderedTabs[0]];
								delete dropOffQ[orderedTabs[0]];
								orderedTabs.shift();
								mainTabStore.importTab(tab.tabName, tab.data);
							}
						} else {
							dropOffQ[jzipObject.name] = { tabName, data };
						}
					}
				});

				const noteFile = archive.file('notes.txt');
				if (noteFile !== null) {
					const notes = await noteFile.async('text');
					mainTabStore.setNotes(notes);
				}
			};
		};
	}
}

export const sessionStore = new SessionStore();
