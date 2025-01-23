import { makeAutoObservable, action } from "mobx";
import Message from "../common/Message";
import { apFileSystem } from "./APFileSystem";
import { mainTabStore } from "./MainTabStore";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { urlPathStore } from "./UrlPathStore";

export default class SessionStore {
	private categories: string[] = ['default'];
	private sessionFileNameList: string[] = [];
	private sessionList: { fileName: string, name: string, category: string, canDelete: boolean }[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public async init() {
		this.categories = [];
		this.sessionFileNameList.splice(0, this.sessionFileNameList.length);
		this.sessionList.splice(0, this.sessionList.length);
		let addDefault = false;
		const categories: string[] = [];
		for (const fsTypeStr of ['browserFs', 'serverFs']) {
			const fsType = fsTypeStr as 'browserFs' | 'serverFs';
			if (fsType === 'serverFs' && !apFileSystem.isConnected()) continue;
			const fileNames = await apFileSystem.readDir('sessions/', fsType);
			fileNames.sort((a, b) => {
				a = a.split(' - ')[0].replaceAll('-', '/');
				b = b.split(' - ')[0].replaceAll('-', '/');
				return new Date(b).getTime() - new Date(a).getTime();
			});
			for (const fileName of fileNames) {
				let category = 'default';
				const catExists = await apFileSystem.exists(`sessions/${fileName}/category.txt`, fsType);
				if (catExists) {
					const catName = await apFileSystem.readFile(`sessions/${fileName}/category.txt`, fsType);
					if (!categories.includes(catName) && catName !== 'default') {
						categories.push(catName);
					}
					category = catName;
				} else {
					await apFileSystem.writeFile(`sessions/${fileName}/category.txt`, 'default', fsType);
				}

				if (category === 'default') {
					addDefault = true;
				}

				this.sessionFileNameList.push(fileName);
				const exists = await apFileSystem.exists(`sessions/${fileName}/sessionName.txt`, fsType);
				let sessionName = '';
				if (exists) {
					sessionName = await apFileSystem.readFile(`sessions/${fileName}/sessionName.txt`, fsType);
				}
				const sn = sessionName.length > 0 ? ' - ' + sessionName : '';
				this.sessionList.push({ fileName: fileName, name: fileName + sn, category, canDelete: urlPathStore.isLocalhost() || fsType === 'browserFs' });
			}
		}
		categories.sort();
		if (addDefault) {
			categories.unshift('default');
		}
		this.categories = categories;
	}

	public getCategories() {
		return this.categories;
	}

	public getSessionList() {
		return this.sessionList;
	}

	@action public async deleteEntry(index: number) {
		const sessionName = this.sessionFileNameList[index];
		this.sessionFileNameList.splice(index, 1);
		this.sessionList.splice(index, 1);

		for (const fsTypeStr of ['browserFs', 'serverFs']) {
			const fsType = fsTypeStr as 'browserFs' | 'serverFs';
			if (fsType === 'serverFs' && !urlPathStore.isLocalhost()) continue;
			const dir = 'sessions/' + sessionName;
			if (await apFileSystem.exists(dir, fsType)) {
				for (let dirEntry of await apFileSystem.readDir(dir, fsType)) {
					if (dirEntry === 'sessionName.txt') await apFileSystem.deleteFile(dir + '/sessionName.txt', fsType);
					if (dirEntry === 'category.txt') await apFileSystem.deleteFile(dir + '/category.txt', fsType);
					if (dirEntry === 'notes.txt') await apFileSystem.deleteFile(dir + '/notes.txt', fsType);
					if (dirEntry.startsWith('tab')) {
						await apFileSystem.deleteFile(dir + '/' + dirEntry + '/tabName.txt', fsType);
						await apFileSystem.deleteFile(dir + '/' + dirEntry + '/data.txt', fsType);
						await apFileSystem.rmdir(dir + '/' + dirEntry, fsType);
					}
				}
				if (await apFileSystem.exists(dir + '/notes.txt', fsType)) {
					await apFileSystem.deleteFile(dir + '/notes.txt', fsType);
				}
				await apFileSystem.rmdir(dir, fsType);
			}
		}
	}

	public async saveSession(sessionName: string, category: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			const date = new Date().toLocaleString().replaceAll('/', '-');
			const dir = 'sessions/' + date;
			await apFileSystem.mkdir(dir);
			await apFileSystem.writeFile(dir + '/sessionName.txt', sessionName);
			await apFileSystem.writeFile(dir + '/category.txt', category);
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

			await apFileSystem.writeFile(dir + '/notes.txt', mainTabStore.getNotes());
			resolve();
		});
	}

	public async changeCategory(index: number, category: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			const sessionDir = this.sessionFileNameList[index];
			const dir = 'sessions/' + sessionDir;
			this.sessionList[index].category = category;
			if (!this.categories.includes(category)) {
				this.categories.push(category);
			}
			await apFileSystem.writeFile(dir + '/category.txt', category);
			resolve();
		});
	}

	public async restoreSession(index: number): Promise<number> {
		return new Promise<number>(async (resolve) => {
			const sessionDir = this.sessionFileNameList[index];
			const dir = 'sessions/' + sessionDir;
			const fsType = await apFileSystem.exists(dir, 'browserFs') ? 'browserFs' : 'serverFs';
			let sessionName = '';
			const exists = await apFileSystem.exists(dir + '/sessionName.txt', fsType);
			if (exists) {
				sessionName = await apFileSystem.readFile(dir + '/sessionName.txt', fsType);
			}
			for (let dirEntry of await apFileSystem.readDir(dir, fsType)) {
				if (dirEntry === 'sessionName.txt') continue;
				if (dirEntry === 'category.txt') continue;
				if (dirEntry === 'notes.txt') continue;
				if (dirEntry.startsWith('tab')) {
					let tabName = await apFileSystem.readFile(dir + '/' + dirEntry + '/tabName.txt', fsType);
					if (tabName === sessionDir && sessionName.length > 0) {
						tabName = sessionName;
					}
					const data = await apFileSystem.readFile(dir + '/' + dirEntry + '/data.txt', fsType);
					mainTabStore.importTabFromFile(tabName, data);
				} else { // backwards compatibility
					const data = await apFileSystem.readFile(dir + '/' + dirEntry, fsType);
					if (dirEntry === sessionDir && sessionName.length > 0) {
						dirEntry = sessionName;
					}
					mainTabStore.importTabFromFile(dirEntry, data);
				}
			}
			if (await apFileSystem.exists(dir + '/notes.txt', fsType)) {
				const notes = await apFileSystem.readFile(dir + '/notes.txt', fsType);
				mainTabStore.setNotes(notes);
			}
			resolve(0);
		});
	}

	public searchSession(sessionDir: string, match: string): Promise<string> {
		return new Promise<string>(async (resolve) => {
			let result = '';
			const dir = 'sessions/' + sessionDir;
			const fsType = await apFileSystem.exists(dir, 'browserFs') ? 'browserFs' : 'serverFs';
			let sessionName = '';
			const exists = await apFileSystem.exists(dir + '/sessionName.txt', fsType);
			if (exists) {
				sessionName = await apFileSystem.readFile(dir + '/sessionName.txt', fsType);
			}
			for (let dirEntry of await apFileSystem.readDir(dir, fsType)) {
				if (dirEntry === 'sessionName.txt') continue;
				if (dirEntry === 'category.txt') continue;
				if (dirEntry === 'notes.txt') continue;
				if (dirEntry.startsWith('tab')) {
					let tabName = await apFileSystem.readFile(dir + '/' + dirEntry + '/tabName.txt', fsType);
					if (tabName === sessionDir && sessionName.length > 0) {
						tabName = sessionName;
					}
					const data = await apFileSystem.readFile(dir + '/' + dirEntry + '/data.txt', fsType);
					const i = data.indexOf(match);
					if (i !== -1) {
						let left = 0;
						let right = 0;
						let s = i;
						for (; s >= 0; --s) {
							if (data[s] === '{') {
								if (left === right) break;
								++left;
							}
							if (data[s] === '}') ++right;
						}

						left = right = 0;
						let e = i;
						for (; e < data.length; ++e) {
							if (data[e] === '}') {
								if (left === right) break;
								++right;
							}
							if (data[e] === '{') ++left;
						}

						if (s === -1 || e === data.length) {
							s = i - 100;
							if (s < 0) s = 0;
							result = data.substring(s);
						} else {
							const str = data.substring(s, e + 1);
							try {
								result = JSON.stringify(JSON.parse(str), null, 2);
							} catch (e) {
								result = str;
							}
						}
						break;
					}
				}
			}
			resolve(result);
		});
	}

	public async exportSession(index: number, zipFileName: string): Promise<number> {
		return new Promise<number>(async (resolve) => {
			const zip = new JSZip();
			const sessionDir = this.sessionFileNameList[index];
			const dir = 'sessions/' + sessionDir;
			const fsType = await apFileSystem.exists(dir, 'browserFs') ? 'browserFs' : 'serverFs';
			let sessionName = '';
			const exists = await apFileSystem.exists(dir + '/sessionName.txt', fsType);
			if (exists) {
				sessionName = await apFileSystem.readFile(dir + '/sessionName.txt', fsType);
				zip.file("sessionName.txt", sessionName);
			}
			for (let dirEntry of await apFileSystem.readDir(dir, fsType)) {
				if (dirEntry === 'sessionName.txt') continue;
				if (dirEntry === 'category.txt') continue;
				if (dirEntry === 'notes.txt') continue;
				if (dirEntry.startsWith('tab')) {
					const tab = zip.folder(dirEntry);
					let tabName = await apFileSystem.readFile(dir + '/' + dirEntry + '/tabName.txt', fsType);
					tab?.file('tabName.txt', tabName);
					const data = await apFileSystem.readFile(dir + '/' + dirEntry + '/data.txt', fsType);
					tab?.file("data.txt", data);
				}
			}
			if (await apFileSystem.exists(dir + '/notes.txt', fsType)) {
				const notes = await apFileSystem.readFile(dir + '/notes.txt', fsType);
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
							mainTabStore.importTabFromFile(tabName, data);
							orderedTabs.shift();
							while (orderedTabs.length > 0 && dropOffQ[orderedTabs[0]] !== undefined) {
								const tab = dropOffQ[orderedTabs[0]];
								delete dropOffQ[orderedTabs[0]];
								orderedTabs.shift();
								mainTabStore.importTabFromFile(tab.tabName, tab.data);
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
