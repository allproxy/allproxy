import { makeAutoObservable } from "mobx";
import pako from "pako";
import { mainTabStore } from "./MainTabStore";
import { importJSONFile, newMessage } from "../ImportJSONFile";
import MessageStore from "./MessageStore";

const maxLinesPerTab = 10000;
const chunkSize = () => (window as any).chunkSize ? (window as any).chunkSize * 1024 : 1000 * 1024;

function logResponseTime(message: string, start: number) {
	const debug = (window as any).debug;
	if (debug) {
		console.log(message, (Date.now() - start));
	}
}

export default class FileReaderStore {
	private file: any;
	private lines: string[] = [];
	private nextLineNumber: number = 1;
	private eof = false;
	private includeFilters: string[] = [];
	private excludeFilters: string[] = [];


	public constructor() {
		makeAutoObservable(this);
	}

	public getFileName() {
		return this.file.name;
	}

	public getNextLineNumber() {
		return this.nextLineNumber;
	}

	public moreData() {
		return !this.eof;
	}

	public setFilters(includeFilter: string, excludeFilter: string) {
		this.includeFilters = includeFilter.split(' ').filter((s) => s !== '');
		this.excludeFilters = excludeFilter.split(' ').filter((s) => s !== '');
	}

	private readChunk(offset: number): Promise<string> {
		return new Promise<string>((resolve) => {
			const readEventHandler = (evt: any) => {
				if (evt.target.error == null) {
					offset += evt.target.result.length;
					resolve(evt.target.result); // callback for handling read chunk
					//console.log(offset, fileSize);
				} else {
					console.log("readChunk error: " + evt.target.error);
					resolve('');
				}
			};

			var r = new FileReader();
			var blob = this.file.slice(offset, chunkSize() + offset);
			r.onload = readEventHandler;
			r.readAsText(blob, 'UTF-8');
		});
	}

	public async read(file?: any): Promise<boolean> {
		return new Promise<boolean>(async (resolve) => {
			const start = Date.now();
			if (file) {
				this.file = file;
			}

			// setting up the reader
			const reader = new FileReader();

			const isGzip = this.file.type.indexOf('gzip') !== -1;
			if (isGzip) {
				reader.readAsArrayBuffer(this.file);

				// here we tell the reader what to do when it's done reading...
				reader.onload = (readerEvent: any) => {
					let content = readerEvent.target.result; // this is the content!
					if (isGzip) {
						content = pako.ungzip(content, { to: 'string' });
					}
					this.lines = content.split('\n');
					logResponseTime('read file time', start);
					resolve(true);
				};
			} else {
				for (let offset = 0; offset < this.file.size;) {
					let chunk = await this.readChunk(offset);
					const lastNewline = chunk.lastIndexOf('\n');
					offset += lastNewline + 1;

					if (!this.isMatch(chunk)) {
						continue;
					}

					const lines = chunk.split('\n');
					lines.splice(lines.length - 1, 1); // remove last partial line
					for (let i = 0; i < lines.length; ++i) {
						const line = lines[i];
						if (this.isMatch(line)) {
							this.lines.push(line);
						}
					}

					if (this.lines.length >= this.nextLineNumber + maxLinesPerTab) break;
				}

				if (this.lines.length === 0) {
					alert('No lines match your filter criteria!');
				}
				logResponseTime('read file time', start);
				resolve(true);
			}
		});
	}

	private isMatch(s: string): boolean {

		for (const includeFilter of this.includeFilters) {
			if (s.indexOf(includeFilter) === -1) {
				return false;
			}
		}

		for (const excludeFilter of this.excludeFilters) {
			if (s.indexOf(excludeFilter) !== -1) {
				return false;
			}
		}

		return true;
	}

	public addTab(tabName?: string) {
		const start = Date.now();

		const offset = this.nextLineNumber - 1;
		if (offset > 0) {
			this.lines.splice(0, offset);
		}
		if (this.lines.length > maxLinesPerTab) {
			this.lines.splice(maxLinesPerTab, this.lines.length - maxLinesPerTab);
		} else {
			this.eof = true;
		}
		this.nextLineNumber += maxLinesPerTab;

		// Add tab
		if (!tabName) {
			tabName = 'unknown';
			const message = newMessage(this.lines[0], 1, tabName, '');
			if (message) {
				const messageStore = new MessageStore(message);
				tabName = messageStore.getLogEntry().date.toISOString().split('T')[1];
			}
		}
		mainTabStore.importTab(tabName, importJSONFile(tabName, this.lines, []));
		mainTabStore.getFileReaderStores()[mainTabStore.getTabCount() - 1] = this; // Save this object

		this.lines.splice(0, this.lines.length - 1);

		logResponseTime('add tab time', start);
	}
}
