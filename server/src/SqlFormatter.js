const sqlFormatter = require('sql-formatter');
const assert = require('assert')

module.exports = class SqlFormatter{
	static query(buffer) {
		let str = SqlFormatter._format(buffer);
		return sqlFormatter.format(str.split('\\n').join(' ')).split('\n').join('\\n');
	}

	static results(buf) {			
		let formattedResults = '\n';
		let cvOffset = getNextCvOffset(0); // next vector
		if(cvOffset === null) return this._format(buf); // must not be a SELECT

		const rowCount = buf.readUInt8(4); // number of rows	

		let colNames = [];
		for(let i = 0; i < rowCount; ++i) {									
			let subCvOffset = cvOffset + 4; // offset to data in vector		
			for(let j = 0; j < 5; ++j) { // 5th sub vector is column name
				subCvOffset += buf.readUInt8(subCvOffset) + 1; // next sub vector
			}
			colNames.push(buf.toString('utf8', subCvOffset+1, subCvOffset+1+buf.readUInt8(subCvOffset)));

			cvOffset = getNextCvOffset(cvOffset); // next vector			
		}
		//console.log(colNames);
		
		// Skip EOF markers
		for(let len = buf.readUInt8(cvOffset + 4); 
			len === 254; 
			cvOffset = getNextCvOffset(cvOffset), len = buf.readUInt8(cvOffset + 4));

		// Get values for each columns		
		let subCvOffset = cvOffset + 4; // offset to first sub vector
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
		
		return JSON.stringify(formattedResults,null,2).replace(/\n/g, '\n');

		function toUInt24(offset) {
			return buf.readUInt8(offset) + (buf.readUInt8(offset+1)<<8) + (buf.readUInt8(offset+2)<<16);
		}

		function getNextCvOffset(offset) {
			const cvOffset = offset + toUInt24(offset) + 4;
			if(cvOffset >= buf.length) return null;
			//console.log('next CV length:', toUInt24(cvOffset));
			return cvOffset;
		}
	}

	static _format(buffer) {
		let str = buffer.toString('utf8').replace(/\n/g, '\\n');
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