import { makeAutoObservable } from "mobx";
import pako from "pako";
import { mainTabStore } from "./MainTabStore";
import { importJSONFile, newMessage } from "../ImportJSONFile";
import MessageStore from "./MessageStore";

export const maxLinesPerTab = 10000;
const chunkSize = () => (window as any).chunkSize ? (window as any).chunkSize * 1024 : 1024 * 1024;

function logResponseTime(message: string, start: number) {
	const debug = (window as any).debug;
	if (debug) {
		console.log(message, (Date.now() - start));
	}
}

export default class FileReaderStore {
	private file: any;
	private fileName: string = "";
	private lines: string[] = [];
	private nextLineNumber: number = 1;
	private includeFilters: string[] = [];
	private operator: 'and' | 'or' = 'and';
	private startTime: string = "";
	private endTime: string = "";
	private startTimeDate: Date = new Date();
	private endTimeDate: Date = new Date();
	private timeFieldName: string = '';
	private truncated = false;

	public constructor() {
		makeAutoObservable(this);
	}

	public getFileName() {
		return this.fileName;
	}

	public getNextLineNumber() {
		return this.nextLineNumber;
	}

	public setFilters(includeFilter: string) {
		this.includeFilters = includeFilter.split(' ').filter((s) => s !== '');
	}

	public setOperator(operator: 'and' | 'or') {
		this.operator = operator;
		//console.log(this.operator);
	}

	public setTimeFilter(timeFieldName: string, startTime: string, endTime: string) {
		this.timeFieldName = timeFieldName;
		this.startTime = startTime;
		this.endTime = endTime;
		if (startTime !== '') {
			this.startTimeDate = new Date(startTime);
		}
		if (endTime !== '') {
			this.endTimeDate = new Date(endTime);
		}
	}

	public async serverRead(fileName: string): Promise<boolean> {
		this.truncated = false;
		this.fileName = fileName;
		return new Promise<boolean>(async (resolve) => {
			const s = await import("./SocketStore");
			if (this.startTime !== "") {
				this.lines = await s.socketStore.emitFileLineMatcher(fileName, this.timeFieldName, this.startTime, this.endTime, this.operator, this.includeFilters, maxLinesPerTab);
			} else {
				this.lines = await s.socketStore.emitReadFile(fileName, this.operator, this.includeFilters, maxLinesPerTab);
			}
			resolve(true);
		});
	}

	public async clientRead(file?: any): Promise<boolean> {
		this.truncated = false;
		return new Promise<boolean>(async (resolve) => {
			const start = Date.now();
			if (file) {
				this.file = file;
				this.fileName = file.name;
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
					let chunk = await this.readChunk(offset, start);
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

					if (this.lines.length >= maxLinesPerTab) {
						this.truncated = true;
						break;
					}
				}

				if (this.lines.length === 0) {
					let timeFilter = '';
					if (this.startTime !== '') {
						timeFilter += ' ' + this.startTime;
						if (this.endTime !== '') {
							timeFilter += ' to ' + this.endTime;
						} else {
							timeFilter += ' to eof';
						}
					}
					alert('No lines match your filter criteria: ' + this.includeFilters.join(' ' + this.operator) + timeFilter);
				}
				logResponseTime('read file time', start);
				resolve(true);
			}
		});
	}

	private readChunk(offset: number, startTime: number): Promise<string> {
		return new Promise<string>((resolve) => {
			const readEventHandler = (evt: any) => {
				if (evt.target.error == null) {
					offset += evt.target.result.length;
					resolve(evt.target.result); // callback for handling read chunk
					//console.log(offset, fileSize);
					const percent = (offset * 100 / this.file.size).toFixed(1);
					const elapsedTime = (Date.now() - startTime) / 1000;
					mainTabStore.setUpdating(true, percent + "% Complete, Seconds: " + elapsedTime.toFixed(0));
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

	private isMatch(line: string): boolean {
		if (this.operator === 'and') {
			for (const includeFilter of this.includeFilters) {
				if (line.indexOf(includeFilter) === -1) {
					return false;
				}
			}
		} else {
			let match = false;
			for (const includeFilter of this.includeFilters) {
				if (line.indexOf(includeFilter) !== -1) {
					match = true;
					break;
				}
			}
			if (!match) return false;
		}

		if (this.startTime !== "") {
			const d = this.parseDateString(line);
			if (d === undefined) {
				console.log('Did not find ' + this.timeFieldName + ' in line: ' + line);
				return false;
			}

			if (d > this.endTimeDate) {
				return false;
			}

			// Time match?
			if (d < this.startTimeDate) {
				return false;
			}
		}

		return true;
	}

	private parseDateString(line: string): Date | undefined {
		const timeFieldNameAndColon = `"${this.timeFieldName}":`;
		let begin = line.indexOf(timeFieldNameAndColon);
		if (begin === -1) {
			return undefined;
		}
		begin += timeFieldNameAndColon.length;
		const c = line.slice(begin, begin + 1).toString();
		if (c === '\\' || c === ' ') begin += 1;
		let end = begin + 1;
		for (;
			end < line.length
			&& line.slice(end, end + 1).toString() != '\\'
			&& line.slice(end, end + 1).toString() != ',';
			++end) { }
		if (end < line.length) {
			const s = line.slice(begin, end);
			let d;
			const i = parseInt(s.toString());
			if (i !== Number.NaN) {
				d = new Date(i);
			} else {
				d = new Date(s.toString());
			}
			if (d.toString() === "Invalid Date") {
				console.log("Invalid Date: " + s);
				return undefined;
			}
			return d;
		}
		return undefined;
	}

	public addTab(tabName?: string, sortRequired?: 'sort' | undefined) {
		const start = Date.now();

		const offset = this.nextLineNumber - 1;
		if (offset > 0) {
			this.lines.splice(0, offset);
		}
		if (this.lines.length > maxLinesPerTab) {
			this.lines.splice(maxLinesPerTab, this.lines.length - maxLinesPerTab);
			this.truncated = true;
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
		mainTabStore.importTab(tabName, importJSONFile(tabName, this.lines, []), sortRequired);
		mainTabStore.getFileReaderStores()[mainTabStore.getTabCount() - 1] = this; // Save this object

		this.lines.splice(0, this.lines.length - 1);

		logResponseTime('add tab time', start);

		if (this.truncated) {
			setTimeout(() => alert(`File ${this.fileName} truncated to 10000 lines.  Use time and/or substring filters to select significant lines.`));
		}
	}
}
