module.exports = class HexFormatter {
	static format(buffer) {
		let hexStr = buffer.toString('hex');
		let utf8Str = buffer.toString('utf8');
		utf8Str = utf8Str.replace(/[^\x20-\x7E]/g, '.')
		let strWithNewline = '';
		let i = 0;
		let j = 0;
		let displayable = '';
		for(; i + 8 < hexStr.length; i += 8, j += 4) {
			strWithNewline += hexStr.substring(i, i+8) + ' ';
			displayable += utf8Str.substring(j, j+4);
			if(i > 0 && (i+8)%32 === 0) {
				strWithNewline += '  ' + displayable;
				displayable = '';
				strWithNewline += '\\n';
			}                  
		}

		if(i < hexStr.length) {                    
			strWithNewline += hexStr.substring(i, hexStr.length);
			if(hexStr.length  % 32 !== 0) {
				const pad = 32 - hexStr.length%32;
				strWithNewline += (' '.repeat(pad + Math.ceil((pad+1)/8)));
			}
			strWithNewline += ('  ' + displayable + utf8Str.substring(j, utf8Str.length));                  
		}

		return strWithNewline;
	}
}