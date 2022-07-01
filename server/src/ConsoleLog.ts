export default class ConsoleLog {
  static enableDebug = false;
  static enableInfo = false;

  static debug(...args: any[]) {
    if (ConsoleLog.enableDebug) ConsoleLog.info(...args);
  }

  static info(...args: any[]) {
    if (ConsoleLog.enableDebug || ConsoleLog.enableInfo) ConsoleLog.info(...args);
  }
}
