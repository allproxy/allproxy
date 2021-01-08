const sqlFormatter = require('sql-formatter');

module.exports = class SqlFormatter{
	static query(buffer) {
		let str = SqlFormatter._format(buffer);
		return sqlFormatter.format(str.split('\\n').join(' ')).split('\n').join('\\n');
	}

	static results(buffer) {		
		return SqlFormatter._format(buffer);
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