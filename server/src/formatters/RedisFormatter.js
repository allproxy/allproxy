const HexFormatter = require('./HexFormatter');
module.exports = class RedisFormatter{
	constructor(reqBuf, rspBuf) {		
		this.formattedRequest = this._formatRequest(reqBuf);
		this.formattedResponse = rspBuf ? this._formatResponse(rspBuf) : 'No Response';		
	}

	/**
	 * Get formatted request
	 */
	getRequest = () => this.formattedRequest;

	/**
	 * Get formatted response
	 */
	getResponse = () => this.formattedResponse;

	_formatRequest(buf) {	
		return buf.toString('utf8').split('\r\n').join('\n');
	}

	_formatResponse(buf) {
		return '\n'+buf.toString('utf8').split('\r\n').join('\n');
	}
}