module.exports = class MongoOpCode {
	static toString(opCode) {
		let str;
		switch(opCode) {			
			case 1:
				str = 'OP_REPLAY';
				break;
			case 2001:
				str = 'OP_UPDATE';
				break;
			case 2002:
				str = 'OP_INSERT';
				break;
			case 2003:
				str = 'OP_GET_BY_OID';
				break;
			case 2004:
				str= 'OP_QUERY';
				break;
			case 2005:
				str = 'OP_GET_MORE';
				break;
			case 2006:
				str = 'OP_DELETE';
				break;
			case 2007:
				str = 'OP_KILL_CURSORS';
				break;
			case 2013:
				str = 'OP_MSG';
				break;
			default:
				str = "Unknown Command";
				break;						
		}
		return str;
	}
}