const sqlFormatter = require('sql-formatter');
const HexFormatter = require('./HexFormatter');
const SqlCommand = require('./SqlCommand');

module.exports = class SqlFormatter{
	constructor(reqBuf, rspBuf) {		
		this.formattedQuery = this._formatQuery(reqBuf);
		this.formattedResults = rspBuf ? (this.getCommand() === 'Query' ? 
											this._formatResults(rspBuf) 
											: HexFormatter.format(rspBuf))
										: this.getCommand() === 'Quit' ?
											'Closed' :
											'No Response';
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
				return sqlFormatter.format(str.split('\n').join(' '));
			}			
		}

		return this.command +'\n' + HexFormatter.format(buf);		
	}	

	_formatResults(buf) {
		let formattedResults = [];
		let fieldCount = 0;
		let rowCount = 0;
		let truncated = false;
		try {
			const packet = new MySqlPacket(buf); // keep track of Payload Packet offset
			let pktOffset = packet.nextOffset(); // get next (second) payload packet
			
			fieldCount = buf.readUInt8(4); // number of rows	

			let colNames = [];
			for(let i = 0; i < fieldCount; ++i) {											
				let subCvOffset = pktOffset + 4; // offset to data in payload packet		
				for(let j = 0; j < 4; ++j) { // 4th sub payload packet is column name
					subCvOffset += buf.readUInt8(subCvOffset) + 1; // next sub payload packet
				}
				colNames.push(buf.toString('utf8', subCvOffset+1, subCvOffset+1+buf.readUInt8(subCvOffset)));

				pktOffset = packet.nextOffset(); // next payload packet			
			}
			//console.log(colNames);			
			for(; pktOffset !== null; pktOffset = packet.nextOffset(), ++rowCount) {
				// Skip EOF markers
				for(let len = buf.readUInt8(pktOffset + 4); 
					len === 254; 
					pktOffset = packet.nextOffset(), len = buf.readUInt8(pktOffset + 4));

				if(pktOffset !== null) {									
					// Get values for each columns		
					let subCvOffset = pktOffset + 4; // offset to first sub payload packet
					for(let i = 0; i < fieldCount; ++i) {
						if(subCvOffset >= buf.length) {
							truncated = true;
							break;
						} 

						const len = buf.readUInt8(subCvOffset);	
						const isNull = (len === 251);
						
						subCvOffset += 1; // value after length

						const colName = colNames[i];
						const fieldValue = isNull ? 'NULL' : buf.toString('utf8', subCvOffset, subCvOffset+len);
						//console.log(colName, '=', fieldValue);					
						
						formattedResults.push(`  ${colName} = ${fieldValue}`);
						if(!isNull) subCvOffset += len;
					}					
				}
			}				

			return stringifyResults() + (truncated ? '\nResults are truncated\n' : '');
		} catch(e) {			
			if(formattedResults.length > 0) {
				return stringifyResults() + '\n' + e + '\n'; // + new Error().stack.replace(/\n/g, '\n');
			}
			else {
				return HexFormatter.format(buf);
			}
		}
		
		function stringifyResults() {
			const totalCount = (rowCount - 1) + (truncated ? ' (partial results)' : '');
			for(let i = 0; i < rowCount-1; ++i) {
				formattedResults.splice(i*fieldCount+(i*2), 0, `{ /* ${i+1} of ${totalCount} */`);
				formattedResults.splice((i+1)*fieldCount+(i*2)+1, 0, `}`);					
			}
			let string = '';
			for(let i = 0; i < formattedResults.length; ++i) {
				string += formattedResults[i] + '\n';
			}
			if(string.length === 0) {
				string = 'No results';
			}
			return string;
		}
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
		if(offset+4 >= this.buf.length) return null;
		
		this.offset = offset;
		this.packetLength = this.toUInt24(offset);
		this.packetNumber = this.buf.readUInt8(offset+3);
		//console.log(`Payload Packet: number=${this.packetNumber} length=${this.packetOffset}`);

		return offset;
	}

	getOffset = () => this.offset;

	getLength = () => this.packetLength;

	getNumber = () => this.packetNumber;
}