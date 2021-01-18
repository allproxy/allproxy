const HexFormatter = require('./HexFormatter');
const MongoOpCode = require('./MongoOpCode');

module.exports = class SqlFormatter{
	constructor(reqBuf, rspBuf) {		
		this.formattedRequest = this._formatRequest(reqBuf);
		this.formattedResponse = this._formatResponse(rspBuf);
		this.command = 'Request unknown';
	}

	getCommand = () => this.command;

	/**
	 * Get formatted request
	 */
	getRequest = () => this.formattedRequest;

	/**
	 * Get formatted response
	 */
	getResponse = () => this.formattedResponse;

	_formatRequest(buf) {	
		const packet = new MongoPacket(buf);
		const opCode = packet.getOpCode();
		const requestID = packet.getRequestID();
		const details = packet.getDetails();
		return opCode + ' id=' + requestID + ' ' + details + '\\n' + HexFormatter.format(buf) + '\\n';
	}

	_formatResponse(buf) {
		const packet = new MongoPacket(buf);
		const flags = packet.getResponseFlags();
		const numberReturned = packet.getNumberReturned();		
		return `\\nflags=${flags} documents=${numberReturned}\\n\\n${HexFormatter.format(buf)}\\n`;
	}
}

// Keep track of Mongo packets
class MongoPacket {
	constructor(buf) {
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

		function cstring(start) {
			let end = start;
			for(; buf.readUInt8(end) !== 0; ++end);
			const str = buf.toString('utf8', start, end);			
			return str;
		}
	}
	
	getOffset = () => this.offset;

	getMessageLength = () => this.messageLength;

	getRequestID = () => this.requestID;

	getResponseTo = () => this.requestID;

	getOpCode = () => this.opCode;

	getDetails = () => this.details;

	getResponseFlags = () => this.responseFlags;

	getNumberReturned = () => this.numberReturned;
}