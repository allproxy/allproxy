
export default class SqlCommand {
  static toString (command: number): string {
    let str;
    switch (command) {
      case 0:
        str = 'Sleep';
        break;
      case 1:
        str = 'Quit';
        break;
      case 2:
        str = 'Use Database';
        break;
      case 3:
        str = 'Query';
        break;
      case 4:
        str = 'Field List';
        break;
      case 5:
        str = 'Create Database';
        break;
      case 6:
        str = 'Field List';
        break;
      case 7:
        str = 'Refresh';
        break;
      case 8:
        str = 'Shutdown';
        break;
      case 9:
        str = 'Statistics';
        break;
      case 10:
        str = 'Process Info';
        break;
      case 11:
        str = 'Connect';
        break;
      case 12:
        str = 'Process Kill';
        break;
      case 13:
        str = 'Debug';
        break;
      case 14:
        str = 'Ping';
        break;
      case 15:
        str = 'Time';
        break;
      case 16:
        str = 'Delayed Insert';
        break;
      case 17:
        str = 'Change User';
        break;
      case 18:
        str = 'BINLOG Dump';
        break;
      case 19:
        str = 'Table Dump';
        break;
      case 20:
        str = 'Connect Out';
        break;
      case 21:
        str = 'Register Slave';
        break;
      case 22:
        str = 'Prepare';
        break;
      case 23:
        str = 'Execute';
        break;
      case 24:
        str = 'Send Long Data';
        break;
      case 25:
        str = 'Close';
        break;
      case 26:
        str = 'Reset';
        break;
      case 27:
        str = 'Set Option';
        break;
      case 28:
        str = 'Fetch';
        break;
      case 29:
        str = 'Daemon';
        break;
      case 30:
        str = 'BINLOG Dump GTID';
        break;
      case 31:
        str = 'Reset Connection';
        break;
      default:
        str = 'Unknown Command';
        break;
    }
    return str;
  }
}
