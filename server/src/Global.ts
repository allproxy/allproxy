import SocketIoManager from './SocketIoManager';
import dns from 'dns';
import PortConfig from '../../common/PortConfig';

export default class Global {
  static socketIoManager: SocketIoManager;
  static useHttp2 = false;
  static portConfig: PortConfig;
  static prevNow: number = 0;
  static dupCount: number = 0;
  static inDockerContainer: boolean = false;
  static renderLogView: boolean = false;
  static proxyIsBlocked = false;

  static nextSequenceNumber(): number {
    const now = Date.now();
    if (now === Global.prevNow) {
      const dupCount = ++Global.dupCount;
      let decimal = dupCount + '';
      decimal = decimal.padStart(4, '0');
      return parseFloat(now + '.' + decimal);
    } else {
      Global.dupCount = 0;
      Global.prevNow = now;
      return now;
    }
  }

  static resolveIp(ipAddr: string | undefined): Promise<string> {
    return new Promise<string>((resolve) => {
      if (ipAddr) {
        try {
          ipAddr = ipAddr.replace('::ffff:', '');
          dns.reverse(ipAddr, (err: any, hosts: any) => {
            if (err === null && hosts.length > 0) {
              ipAddr = hosts.sort((a: string, b: string) => a.length - b.length)[0];
              const host = ipAddr!.split('.')[0]; // un-qualify host name
              if (isNaN(+host)) {
                ipAddr = host;
              }
            }
            resolve(ipAddr!);
          });
        } catch (e) {
          resolve(ipAddr);
        }
      } else {
        ipAddr = 'unknown';
        resolve(ipAddr);
      }
    });
  }
}
