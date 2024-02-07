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
	private lines: string[] = [];
	private nextLineNumber: number = 1;
	private eof = false;
	private maxLinesToRead = maxLinesPerTab;
	private timeFilterSet = false;
	private timeFieldName = '';
	private startTime: Date = new Date();
	private endTime: Date = new Date();
	private includeFilters: string[] = [];
	private excludeFilters: string[] = [];
	private operator: 'and' | 'or' = 'and';


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

	public setMaxLines(maxLines: number) {
		this.maxLinesToRead = maxLines;
	}

	public setTimeFilter(timeFieldName: string, startTime: Date, endTime: Date) {
		this.timeFilterSet = true;
		this.timeFieldName = timeFieldName;
		startTime.setMilliseconds(0);
		endTime.setMilliseconds(0);
		this.startTime = startTime;
		this.endTime = endTime;
		console.log('Time filter: ', this.startTime.toISOString() + ' to ' + this.endTime.toISOString());
	}

	public setFilters(includeFilter: string, excludeFilter: string) {
		this.includeFilters = includeFilter.split(' ').filter((s) => s !== '');
		this.excludeFilters = excludeFilter.split(' ').filter((s) => s !== '');
	}

	public setOperator(operator: 'and' | 'or') {
		this.operator = operator;
		//console.log(this.operator);
	}

	private fieldColon() {
		return '"' + this.timeFieldName + '":';
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

	private readN(offset: number, size: number): Promise<string> {
		return new Promise<string>((resolve) => {
			const readEventHandler = (evt: any) => {
				if (evt.target.error == null) {
					offset += evt.target.result.length;
					resolve(evt.target.result); // callback for handling read chunk
				} else {
					console.log("readChunk error: " + evt.target.error);
					resolve('');
				}
			};

			var r = new FileReader();
			var blob = this.file.slice(offset, size + offset);
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
				let offset = await this.getStartOffset();

				let quit = false;

				for (; offset < this.file.size;) {
					let chunk = await this.readChunk(offset);

					const percent = (offset * 100 / this.file.size).toFixed(1);
					const elapsedTime = (Date.now() - start) / 1000;
					mainTabStore.setUpdating(true, percent + "% Complete, Seconds: " + elapsedTime.toFixed(0));

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
							if (this.timeFilterSet) {
								const n = line.indexOf(this.fieldColon());
								if (n === -1) continue;
								const d = this.parseDate(line, n);

								if (d === undefined) {
									console.log('Date is undefined');
									continue;
								}

								if (d > new Date(this.endTime.getTime())) {
									console.log('Quit at' + d.toISOString());
									quit = true;
									break;
								}

								// Time match?
								if (d < this.startTime) {
									continue;
								}

								if (d > this.endTime) {
									mainTabStore.setUpdating(true, percent + "% Complete, Seconds: " + elapsedTime.toFixed(0) + ' ' + d?.toISOString());
									continue;
								}
							}

							this.lines.push(line);
						}
					}

					if (quit || this.lines.length >= this.maxLinesToRead) break;
				}

				if (this.lines.length === 0) {
					alert('No lines match your filter criteria: ' + this.includeFilters.join(' ' + this.operator));
				}
				logResponseTime('read file time', start);
				resolve(true);
			}
		});
	}

	private parseDate(chunk: string, i: number): Date | undefined {
		const begin = i + this.fieldColon().length + 1;
		let end = begin + 1;
		for (; end < chunk.length && chunk[end] != '"'; ++end) { }
		if (end < chunk.length) {
			const s = chunk.substring(begin, end);
			const d = new Date(s);
			d.setMilliseconds(0);
			if (d.toString() === "Invalid Date") {
				alert("Invalid Date: " + s);
				return undefined;
			}
			return d;
		}
		return undefined;
	}

	private async getStartOffset(): Promise<number> {
		if (!this.timeFilterSet) return 0;

		const fieldColon = this.fieldColon();
		let chunk: string;

		let count = 1;
		const startTime = this.startTime;

		let readSize = chunkSize();
		let l = 0;
		let r = this.file.size - 1;
		let direction: 'left' | 'right' | undefined;
		while (l <= r) {
			const m = Math.floor((l + r) / 2);
			if (readSize > chunkSize() * 5) {
				alert('Could not find field ' + fieldColon);
				break;
			}
			chunk = await this.readN(m, readSize);

			const i1 = chunk.indexOf(fieldColon);
			if (i1 === -1) {
				readSize += chunkSize();
				console.log('Could not find field ' + fieldColon + ', increase chunk size to ', readSize);
				continue;
			}
			const chunkTime1 = this.parseDate(chunk, i1);
			if (!chunkTime1) {
				mainTabStore.setUpdating(true, "Binary search " + count + ': truncated ' + chunk.substring(i1));
				console.log("Truncated: " + chunk.substring(i1));
				if (direction === 'left') {
					console.log('Go ' + direction);
					l = m + readSize;
				} if (direction === 'right') {
					console.log('Go ' + direction);
					r = m - readSize;
				} else {
					console.log('Increase chunk size to ', readSize);
					readSize += chunkSize();
				}
				continue;
			}
			const i2 = chunk.lastIndexOf(fieldColon);
			let chunkTime2 = this.parseDate(chunk, i2);
			if (!chunkTime2) {
				chunkTime2 = this.parseDate(chunk, i2);
				if (!chunkTime2) {
					console.log("This should not happen - truncated: " + chunk.substring(i2));
					continue;
				}
			}

			//console.log(t, t1, t2);
			if (chunkTime1 > startTime) {
				const msg = "Binary search " + count + ' go left: ' + chunkTime1.toISOString() + ' < ' + startTime.toISOString();
				console.log(msg);
				mainTabStore.setUpdating(true, msg);
				l = m + readSize;
				direction = 'left';
			} else if (chunkTime2 < startTime) {
				const msg = "Binary search " + count + ' go right: ' + chunkTime1.toISOString() + ' > ' + startTime.toISOString();
				console.log(msg);
				mainTabStore.setUpdating(true, msg);
				r = m - readSize;
				direction = 'right';
			} else {
				const msg = "Binary search " + count + ' ' + startTime.toISOString() + ' is close to ' + chunkTime1.toISOString();
				console.log(msg);
				console.log('Start linear search at offset ' + m);
				mainTabStore.setUpdating(true, msg);
				direction = undefined;
				return m;
			}
			++count;
		}
		alert("Binary search failed for time range: " + this.startTime.toISOString() + ' to ' + this.endTime.toISOString());
		return this.file.size;
	}

	private isMatch(s: string): boolean {
		if (this.operator === 'and') {
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
		} else {
			let match = false;
			for (const includeFilter of this.includeFilters) {
				if (s.indexOf(includeFilter) !== -1) {
					match = true;
					break;
				}
			}
			if (!match) return false;

			if (this.excludeFilters.length === 0) {
				return true;
			}

			for (const excludeFilter of this.excludeFilters) {
				if (s.indexOf(excludeFilter) !== -1) {
					return true;
				}
			}
			return false;
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
		//mainTabStore.getFileReaderStores()[mainTabStore.getTabCount() - 1] = this; // Save this object

		this.lines.splice(0, this.lines.length - 1);

		logResponseTime('add tab time', start);
	}
}
