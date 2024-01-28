import { makeAutoObservable } from "mobx";
import pako from "pako";
import { mainTabStore } from "./MainTabStore";
import { jsonToJsonl } from "../components/ImportJSONFileDialog";
import { importJSONFile, newMessage } from "../ImportJSONFile";
import MessageStore from "./MessageStore";

const maxLinesPerTab = 10000;

export default class FileReaderStore {
	private file: any;
	private fileContent: string = '';
	private nextLineNumber: number = 1;
	private eof = false;


	public constructor() {
		makeAutoObservable(this);
	}

	public getFileName() {
		return this.file.name;
	}

	public getNextLineNumber() {
		return this.nextLineNumber;
	}

	public isFileContentLoaded() {
		return this.fileContent.length > 0;
	}

	public moreData() {
		return !this.eof;
	}

	public async read(file?: any): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			if (file) {
				this.file = file;
			}

			// setting up the reader
			const reader = new FileReader();

			const isGzip = this.file.type.indexOf('gzip') !== -1;
			if (isGzip) {
				reader.readAsArrayBuffer(this.file);
			} else {
				reader.readAsText(this.file, 'UTF-8');
			}

			// here we tell the reader what to do when it's done reading...
			reader.onload = (readerEvent: any) => {
				let content = readerEvent.target.result; // this is the content!

				if (isGzip) {
					this.fileContent = pako.ungzip(content, { to: 'string' });
				} else {
					this.fileContent = content;
				}
				resolve(true);
			};
		});
	}

	public addTab(tabName?: string) {
		if (this.fileContent.startsWith('[')) {
			this.fileContent = jsonToJsonl(this.fileContent);
		}

		const lines = this.fileContent.split('\n');
		this.fileContent = '';

		const offset = this.nextLineNumber - 1;
		if (offset > 0) {
			lines.splice(0, offset);
		}
		if (lines.length > maxLinesPerTab) {
			lines.splice(maxLinesPerTab, lines.length - maxLinesPerTab);
		} else {
			this.eof = true;
		}
		this.nextLineNumber += maxLinesPerTab;

		// Add tab
		if (!tabName) {
			tabName = 'unknown';
			const message = newMessage(lines[0], 1, tabName, '');
			if (message) {
				const messageStore = new MessageStore(message);
				tabName = messageStore.getLogEntry().date.toISOString().split('T')[1];
			}
		}
		mainTabStore.importTab(tabName, importJSONFile(tabName, lines, []));
		mainTabStore.getFileReaderStores()[mainTabStore.getTabCount() - 1] = this; // Save this object
	}
}
