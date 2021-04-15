import HexFormatter from './HexFormatter';
import MongoOpCode from './MongoOpCode';

export default class SqlFormatter {
	formattedRequest: string;
	formattedResponse: string;
	command: string;
	constructor(reqBuf: Buffer, rspBuf: Buffer) {
		this.formattedRequest = this._formatRequest(reqBuf);
		this.formattedResponse = rspBuf ? this._formatResponse(rspBuf) : 'No Response';
		this.command = 'Request unknown';
	}

	getCommand(): string {return this.command;}

	/**
	 * Get formatted request
	 */
	getRequest(): string {return this.formattedRequest;}

	/**
	 * Get formatted response
	 */
	getResponse(): string {return this.formattedResponse;}

	_formatRequest(buf: Buffer): string {
		const packet = new MongoPacket(buf);
		const opCode = packet.getOpCode();
		const requestID = packet.getRequestID();
		const details = packet.getDetails();
		return opCode + ' id=' + requestID + ' ' + details + '\n' + HexFormatter.format(buf) + '\n';
	}

	_formatResponse(buf: Buffer): string {
		const packet = new MongoPacket(buf);
		const flags = packet.getResponseFlags();
		const numberReturned = packet.getNumberReturned();
		return `\nflags=${flags} documents=${numberReturned}\n\n${HexFormatter.format(buf)}\n`;
	}
}

// Keep track of Mongo packets
class MongoPacket {
	buf: Buffer;
	offset: number;
	messageLength: number;
	requestID: number;
	responseTo: number;
	opCode: string;
	details: string;
	responseFlags: string = '';
	numberReturned: number = 0;
	constructor(buf: Buffer) {
		this.buf = buf;
		this.offset = 0;
		this.messageLength = buf.readInt32LE(0);
		this.requestID = buf.readInt32LE(4);
		this.responseTo = buf.readInt32LE(8);
		this.opCode = MongoOpCode.toString(buf.readInt32LE(12));

		this.details = '';
		switch(this.opCode) {
			case MongoOpCode.OP_UPDATE:
			case MongoOpCode.OP_INSERT:
			case MongoOpCode.OP_QUERY:
			case MongoOpCode.OP_GET_MORE:
			case MongoOpCode.OP_DELETE:
				this.details = cstring(20); // fullCollectionName
				break;
			case MongoOpCode.OP_REPLAY:
				this.responseFlags = 'none';
				const flags = buf.readInt32LE(16);
				switch(flags) {
					case 0:
						this.responseFlags = 'CursorNotFound';
						break;
					case 1:
						this.responseFlags = 'QueryFailure';
						break;
					case 2:
						this.responseFlags = 'ShardConfigState';
						break;
					case 3:
						this.responseFlags = 'AwaitCapable';
						break;
				}
				this.numberReturned = buf.readInt32LE(32);
				break;
		}

		function cstring(start:  number) {
			let end = start;
			for(; buf.readUInt8(end) !== 0; ++end);
			const str = buf.toString('utf8', start, end);
			return str;
		}
	}

	getOffset(): number {return this.offset;}

	getMessageLength(): number {return this.messageLength;}

	getRequestID(): number {return this.requestID;}

	getResponseTo(): number {return this.requestID;}

	getOpCode(): string {return this.opCode;}

	getDetails(): string {return this.details;}

	getResponseFlags(): string {return this.responseFlags;}

	getNumberReturned(): number {return this.numberReturned;}
}