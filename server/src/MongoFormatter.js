const sqlFormatter = require('sql-formatter');
const HexFormatter = require('./HexFormatter');
const MongoOpCode = require('./MongoOpCode');

module.exports = class SqlFormatter{
	constructor(reqBuf, rspBuf) {		
		this.formattedRequest = this._formatRequest(reqBuf);
		this.formattedResponse = '\\n' + HexFormatter.format(rspBuf) + '\\n';
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
		const opCode = MongoOpCode.toString(packet.getOpCode());
		const requestID = packet.getRequestID();
		return opCode + ' id=' + requestID + '\\n' + HexFormatter.format(buf) + '\\n';
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
		this.opCode = buf.readInt32LE(12);			
	}
	
	getOffset = () => this.offset;

	getMessageLength = () => this.messageLength;

	getRequestID = () => this.requestID;

	getResponseTo = () => this.requestID;

	getOpCode = () => this.opCode;

}