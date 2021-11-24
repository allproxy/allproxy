export default class MongoOpCode {
  static OP_REPLAY = 'OP_REPLAY';
  static OP_UPDATE = 'OP_UPDATE';
  static OP_INSERT = 'OP_INSERT';
  static OP_GET_BY_OID = 'OP_GET_BY_OID';
  static OP_QUERY = 'OP_QUERY';
  static OP_GET_MORE = 'OP_GET_MORE';
  static OP_DELETE = 'OP_DELETE';
  static OP_KILL_CURSORS = 'OP_KILL_CURSORS';
  static OP_MSG = 'OP_MSG';

  static toString (opCode: number): string {
    let str;
    switch (opCode) {
      case 1:
        str = MongoOpCode.OP_REPLAY;
        break;
      case 2001:
        str = MongoOpCode.OP_UPDATE;
        break;
      case 2002:
        str = MongoOpCode.OP_INSERT;
        break;
      case 2003:
        str = MongoOpCode.OP_GET_BY_OID;
        break;
      case 2004:
        str = MongoOpCode.OP_QUERY;
        break;
      case 2005:
        str = MongoOpCode.OP_GET_MORE;
        break;
      case 2006:
        str = MongoOpCode.OP_DELETE;
        break;
      case 2007:
        str = MongoOpCode.OP_KILL_CURSORS;
        break;
      case 2013:
        str = MongoOpCode.OP_MSG;
        break;
      default:
        str = 'Unknown Command';
        break;
    }
    return str;
  }
}
