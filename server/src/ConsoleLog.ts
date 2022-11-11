export default class ConsoleLog {
  static enableDebug = false;
  static enableInfo = false;

  static debug(...args: any[]) {
    if (ConsoleLog.enableDebug) console.log(...args);
  }

  static info(...args: any[]) {
    if (ConsoleLog.enableDebug || ConsoleLog.enableInfo) console.log(...args);
  }
}
