const sqlFormatter = require('sql-formatter');
const HexFormatter = require('./HexFormatter');
const SqlCommand = require('./SqlCommand');

module.exports = class SqlFormatter{
	constructor(reqBuf, rspBuf) {		
		this.formattedQuery = this._formatQuery(reqBuf);
		this.formattedResults = this.getCommand() === 'Query' ? 
											this._formatResults(rspBuf) 
											: '\\n' + HexFormatter.format(rspBuf) + '\\n';
		this.command = 'Request unknown';
	}

	getCommand = () => this.command;

	/**
	 * Get formatted query
	 */
	getQuery = () => this.formattedQuery;

	/**
	 * Get formatted results
	 */
	getResults = () => this.formattedResults;

	_formatQuery(buf) {	
		const packet = new MySqlPacket(buf);
		if(packet.getNumber() === 1) {
			this.command = 'Login Request';
		} else {
			const command = buf.readUInt8(4);
			this.command = SqlCommand.toString(command);
			if(this.command === 'Query') {
				const str = buf.toString('utf8', 5); // query string
				return sqlFormatter.format(str.split('\\n').join(' '));
			}			
		}

		return this.command +'\n' + HexFormatter.format(buf);		
	}	

	_formatResults(buf) {
		try {
			const packet = new MySqlPacket(buf); // keep track of Payload Packet offset

			let formattedResults = '\n';
			let pktOffset = packet.nextOffset(); // get next (second) payload packet
			
			const rowCount = buf.readUInt8(4); // number of rows	

			let colNames = [];
			for(let i = 0; i < rowCount; ++i) {											
				let subCvOffset = pktOffset + 4; // offset to data in payload packet		
				for(let j = 0; j < 5; ++j) { // 5th sub payload packet is column name
					subCvOffset += buf.readUInt8(subCvOffset) + 1; // next sub payload packet
				}
				colNames.push(buf.toString('utf8', subCvOffset+1, subCvOffset+1+buf.readUInt8(subCvOffset)));

				pktOffset = packet.nextOffset(); // next payload packet			
			}
			//console.log(colNames);
			
			// Skip EOF markers
			for(let len = buf.readUInt8(pktOffset + 4); 
				len === 254; 
				pktOffset = packet.nextOffset(), len = buf.readUInt8(pktOffset + 4));

			if(pktOffset >= buf.length) {
				formattedResults += 'No matching rows found';
			}
			else {
				// Get values for each columns		
				let subCvOffset = pktOffset + 4; // offset to first sub payload packet
				for(let i = 0; i < rowCount; ++i) {
								
					const len = buf.readUInt8(subCvOffset);	
					const isNull = (len === 251);
					
					subCvOffset += 1; // value after length

					const colName = colNames[i];
					const fieldValue = isNull ? 'NULL' : buf.toString('utf8', subCvOffset, subCvOffset+len);
					//console.log(colName, '=', fieldValue);					
					
					formattedResults += `${colName} = ${fieldValue}\n`;
					if(!isNull) subCvOffset += len;
				}
			}
			
			return JSON.stringify(formattedResults,null,2).replace(/\n/g, '\n');
		} catch(e) {
			return '\\n' + HexFormatter.format(buf) + '\\n'; // must not be a SELECT
		}	
	}

	static _format(buf) {
		let str = buf.toString('utf8').replace(/\n/g, '\\n');
		if(str.replace(/[^\x20-\x7E]/g, '').length === 0) {
			return '';
		}
		else {
			str = str.replace(/[^\x21-\x7E]+/g, '\\n'); 
			str = str.split('\\n\\n').join('\\n') // remove consecutive line breaks
		}
		
		try {
			str = JSON.parse(str);
			str = JSON.stringify(str, null, 2);                                         
		}
		catch(e) {                  
		}                
		//str = str.split(',').join(',\\n'); // SQL is more readable if there is a line break after each comma
		str = str.trim();
		while(str.startsWith('\\n')) str = str.replace('\\n','');                
		
		return str;
	}
}

// Keep track of MySQL packets
class MySqlPacket {
	constructor(buf) {
		this.buf = buf;
		this.offset = 0;		
		this.packetLength = this.toUInt24(0);
		this.packetNumber = buf.readUInt8(3);		
	}	

	toUInt24(offset) {		
		return this.buf.readUInt8(offset) + (this.buf.readUInt8(offset+1)<<8) + (this.buf.readUInt8(offset+2)<<16);
	}
	
	// Move offset to next packet
	nextOffset() {
		const offset = this.offset + this.toUInt24(this.offset) + 4;
		if(offset >= this.buf.length) return null;
		
		this.offset = offset;
		this.packetLength = this.toUInt24(offset);
		this.packetNumber = this.buf.readUInt8(offset+3);
		//console.log(`Payload Packet: number=${this.packetNumber} length=${this.packetOffset}`);

		return offset;
	}

	getOffset = () => this.offset;

	getLength = () => this.packetLength;

	getNumber = () => this.packetNumber;}