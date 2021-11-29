import SocketIoManager from './SocketIoManager';
import dns from 'dns';
import PortConfig from '../../common/PortConfig';

export default class Global {
    static socketIoManager: SocketIoManager;
    static nextSequenceNumber: number = 0;
    static debug = false;
    static useHttp2 = false;
    static portConfig: PortConfig;

    static log (...args: any[]) {
      if (Global.debug) console.log(...args);
    }

    static resolveIp (ipAddr: string | undefined): Promise<string> {
      return new Promise<string>((resolve) => {
        if (ipAddr) {
          try {
            ipAddr = ipAddr.replace('::ffff:', '');
            dns.reverse(ipAddr, (err: any, hosts: any) => {
              if (err === null && hosts.length > 0) {
                ipAddr = hosts.sort((a:string, b:string) => a.length - b.length)[0];
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
