import ProxyConfigs from './ProxyConfigs';

const DEBUG = false;

export default class Global {
    static proxyConfigs: ProxyConfigs;
    static nextSequenceNumber: number = 0;

    static log(...args: any[]) {
        if (DEBUG) {
            console.log(args);
        }
    }

    static error(...args: any[]) {
        if (DEBUG) {
            console.error(args);
        }
    }
}