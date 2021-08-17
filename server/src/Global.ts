import SocketIoManager from './SocketIoManager';

export default class Global {
    static socketIoManager: SocketIoManager;
    static nextSequenceNumber: number = 0;
    static debug = false;

    static log(...args: any[]) {
        if (Global.debug) {
            console.log(args.join(' '));
        }
    }

    static error(...args: any[]) {
        if (Global.debug) {
            console.error('error: ' + args.join(' '));
        }
    }
}