import { Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { socketIoManager } from './SocketIoManager';

export const maxLinesPerTab = 10000;
const chunkSize = 1024 * 1024;

function logResponseTime(message: string, start: number) {
	const debug = true;
	if (debug) {
		console.log(message, (Date.now() - start));
	}
}

export default class FileLineMatcher {
	private socket: Socket;
	private filePath: string = '';
	private fileSize = 0;
	private fd: number = -1;
	private chunk: Buffer = Buffer.alloc(chunkSize);
	private lines: string[] = [];
	private maxLinesToRead = maxLinesPerTab;
	private timeFilterSet = false;
	private timeFieldName: string = '';
	private startTime: Date = new Date();
	private endTime: Date = new Date();
	private includeFilters: string[] = [];
	private operator: 'and' | 'or' = 'and';

	constructor(socket: Socket, fileName: string) {
		this.socket = socket;
		this.filePath = process.env.HOME + path.sep + 'Downloads' + path.sep + fileName;
		const stat = fs.statSync(this.filePath);
		this.fileSize = stat.size;
		const mode = 'win32' ? 'r' : 444;
		this.fd = fs.openSync(this.filePath, mode);
	}

	public setTimeFilter(timeFieldName: string, startTime: Date, endTime: Date) {
		this.timeFilterSet = true;
		this.timeFieldName = timeFieldName;
		startTime.setMilliseconds(0);
		endTime.setMilliseconds(0);
		this.startTime = startTime;
		this.endTime = endTime;
		//socketIoManager.emitStatusToBrowser(this.socket, 'Time filter: ' + this.startTime.toISOString() + ' to ' + this.endTime.toISOString());
	}

	public setMaxLines(maxLines: number) {
		this.maxLinesToRead = maxLines;
	}

	public setFilters(includeFilters: string[]) {
		this.includeFilters = includeFilters;
	}

	public setOperator(operator: 'and' | 'or') {
		this.operator = operator;
	}

	private timeFieldAndColon() {
		return '"' + this.timeFieldName + '":';
	}

	private readChunk(buffer: Buffer, offset: number) {
		fs.readSync(this.fd, buffer, 0, chunkSize, offset);
	}

	private readN(buffer: Buffer, offset: number, size: number) {
		fs.readSync(this.fd, buffer, 0, size, offset);
	}

	public read(): string[] {
		const start = Date.now();

		let offset = this.findStartOffset(); // do binary search to find offset to start time

		let quit = false;

		for (; offset < this.fileSize;) {
			this.chunk = this.chunk.slice(0, chunkSize);
			this.readChunk(this.chunk, offset);

			const elapsedTime = (Date.now() - start) / 1000;
			socketIoManager.emitStatusToBrowser(this.socket, "Searching line by line - Seconds: " + elapsedTime.toFixed(3));

			const lastNewline = this.chunk.lastIndexOf('\n');
			offset += lastNewline + 1;

			if (!this.isMatch(this.chunk)) {
				continue;
			}

			const lines = this.chunk.toString().split('\n');
			lines.splice(lines.length - 1, 1); // remove last partial line
			for (let i = 0; i < lines.length; ++i) {
				const line = lines[i];
				if (this.isMatch(line)) {
					if (this.timeFilterSet) {
						const n = line.indexOf(this.timeFieldAndColon());
						if (n === -1) continue;
						const d = parseDateString(Buffer.from(line), n + this.timeFieldAndColon().length);

						if (d === undefined) {
							console.log('Did not find ' + this.timeFieldAndColon() + ' in line: ' + line);
							continue;
						}

						if (d > this.endTime) {
							quit = true;
							break;
						}

						// Time match?
						if (d < this.startTime) {
							continue;
						}
					}

					this.lines.push(line);
				}
			}

			if (quit || this.lines.length >= this.maxLinesToRead) break;
		}

		if (this.lines.length === 0) {
			socketIoManager.emitStatusToBrowser(this.socket, 'No lines match your filter criteria: ' + this.includeFilters.join(' ' + this.operator));
		}
		logResponseTime('read file time', start);

		return this.lines;
	}

	public isSorted(): boolean {
		let readSize = chunkSize;
		let currentTime: Date | undefined;

		// Check right half
		let l = 0;
		let r = this.fileSize - 1;
		let m: number;
		for (; l <= r; l = m + readSize) {
			m = Math.floor((l + r) / 2);
			const timeFieldAndColon = this.timeFieldAndColon();
			this.readN(this.chunk, m, chunkSize);

			const i1 = this.chunk.indexOf(timeFieldAndColon);
			if (i1 === -1) continue;

			const chunkTime1 = parseDateString(this.chunk, i1 + timeFieldAndColon.length);
			if (!chunkTime1) continue;
			if (currentTime && currentTime > chunkTime1) {
				return false; // is not sorted
			}
			//if (currentTime) console.log('right', currentTime.toISOString(), chunkTime1.toISOString());
			currentTime = chunkTime1;
		}

		// Check left half
		l = 0;
		r = this.fileSize - 1;
		for (; l <= r; r = m - readSize) {
			m = Math.floor((l + r) / 2);
			const timeFieldAndColon = this.timeFieldAndColon();
			this.readN(this.chunk, m, chunkSize);

			const i1 = this.chunk.indexOf(timeFieldAndColon);
			if (i1 === -1) continue;

			const chunkTime1 = parseDateString(this.chunk, i1 + timeFieldAndColon.length);
			if (!chunkTime1) continue;
			if (currentTime && currentTime < chunkTime1) {
				return false; // is not sorted
			}
			//if (currentTime) console.log('left', currentTime.toISOString(), chunkTime1.toISOString());
			currentTime = chunkTime1;
		}

		return true; // file is sorted
	}

	private findStartOffset(): number {
		if (!this.timeFilterSet) return 0;

		const timeFieldAndColon = this.timeFieldAndColon();

		let count = 1;
		const startTime = this.startTime;

		let readSize = chunkSize;
		let l = 0;
		let r = this.fileSize - 1;
		let moving: 'left' | 'right' | undefined;
		while (l <= r) {
			const m = Math.floor((l + r) / 2);
			if (readSize > chunkSize * 5) {
				const msg = 'Could not find time field: ' + timeFieldAndColon;
				console.log(msg);
				socketIoManager.emitErrorToBrowser(this.socket, msg);
				break;
			}
			this.readN(this.chunk, m, readSize);

			const i1 = this.chunk.indexOf(timeFieldAndColon);
			if (i1 === -1) {
				readSize += chunkSize;
				this.chunk = Buffer.alloc(readSize);
				console.log('Could not find time field ' + timeFieldAndColon + ', increase chunk size to ', readSize);
				continue;
			}
			const chunkTime1 = parseDateString(this.chunk, i1 + timeFieldAndColon.length);
			if (!chunkTime1) {
				socketIoManager.emitStatusToBrowser(this.socket, "Binary search " + count + ': truncated ' + this.chunk.slice(i1));
				//console.log("Truncated: " + this.chunk.slice(i1));
				if (moving === 'right') {
					l = m + readSize;
				} if (moving === 'left') {
					r = m - readSize;
				} else {
					readSize += chunkSize;
					this.chunk = Buffer.alloc(readSize);
					//console.log('Increase chunk size to ', readSize);
				}
				continue;
			}
			const i2 = this.chunk.lastIndexOf(timeFieldAndColon);
			let chunkTime2 = parseDateString(this.chunk, i2 + timeFieldAndColon.length);
			if (!chunkTime2) {
				chunkTime2 = parseDateString(this.chunk, i2 + timeFieldAndColon.length);
				if (!chunkTime2) {
					console.log("This should not happen - truncated: " + this.chunk.slice(i2));
					continue;
				}
			}

			//console.log('Binary search middle=' + m);
			if (startTime > chunkTime2) {
				const msg = "Binary search " + count + ' update left ' + l + '->' + (m + readSize) + ' ' + startTime.toISOString() + ' > ' + chunkTime2.toISOString();
				console.log(msg);
				l = m + readSize;
				moving = 'right';
			} else if (startTime < chunkTime1) {
				const msg = "Binary search " + count + ' update right ' + r + '->' + (m - readSize) + ' ' + startTime.toISOString() + ' < ' + chunkTime2.toISOString();
				console.log(msg);
				r = m - readSize;
				moving = 'left';
			} else {
				l = r + 1;
			}
			// This chunk contains start time?
			if (l > r) {
				const msg = "Starting line by line search at time " + chunkTime1.toISOString();
				socketIoManager.emitStatusToBrowser(this.socket, msg);
				console.log(msg);
				console.log('Starting line by line search at offset ' + m);
				moving = undefined;
				return m;
			}
			//console.log("Binary search " + count + ' left=' + l + ' right=' + r + ' m=' + m);
			++count;
		}

		const msg = "Did not find start time: " + this.startTime.toISOString();
		console.log(msg);
		socketIoManager.emitErrorToBrowser(this.socket, msg);
		return this.fileSize;
	}

	private isMatch(s: Buffer | string): boolean {
		if (this.operator === 'and') {
			for (const includeFilter of this.includeFilters) {
				if (s.indexOf(includeFilter) === -1) {
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
		}

		return true;
	}
}

export function parseDateString(chunk: Buffer, offsetToDateString: number): Date | undefined {
	const begin = offsetToDateString + 1; // after "
	let end = begin + 1;
	for (; end < chunk.length && chunk.slice(end, end + 1).toString() != '"'; ++end) { }
	if (end < chunk.length) {
		const s = chunk.slice(begin, end);
		const d = new Date(s.toString());
		if (d.toString() === "Invalid Date") {
			console.log("Invalid Date: " + s);
			return undefined;
		}
		return d;
	}
	return undefined;
}
