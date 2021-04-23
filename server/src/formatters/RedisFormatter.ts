import { NO_RESPONSE } from '../../../common/Message';

export default class RedisFormatter{
	formattedRequest: any;
	formattedResponse: string;
	constructor(reqBuf: Buffer, rspBuf: Buffer) {
		this.formattedRequest = this._formatRequest(reqBuf);
		this.formattedResponse = rspBuf ? this._formatResponse(rspBuf) : NO_RESPONSE;
	}

	/**
	 * Get formatted request
	 */
	getRequest(): string {return this.formattedRequest;}

	/**
	 * Get formatted response
	 */
	getResponse(): string {return this.formattedResponse;}

	_formatRequest(buf: Buffer): string {
		return buf.toString('utf8').split('\r\n').join('\n');
	}

	_formatResponse(buf: Buffer): string {
		return '\n'+buf.toString('utf8').split('\r\n').join('\n');
	}
}