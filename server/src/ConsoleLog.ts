export default class ConsoleLog {
  static enableDebug = true;
  static enableInfo = true;

  static debug(...args: any[]) {
    if (ConsoleLog.enableDebug) console.log(...args);
  }

  static info(...args: any[]) {
    if (ConsoleLog.enableDebug || ConsoleLog.enableInfo) console.log(...args);
  }
}
