import fs from 'fs';
import { Socket } from 'socket.io';
import ConsoleLog from './ConsoleLog';
import Paths from './Paths';
const rmdir = require('rimraf');

export default class APFileSystem {
    private socket: Socket;

    public constructor(socket: Socket) {
        this.socket = socket;
    }

    public listen() {
        ConsoleLog.debug('APFileSystem.listen');
        // mkdir
        this.socket.on('mkdir', (path: string) => {
            const dir = Paths.platform(Paths.getDataDir() + path);
            ConsoleLog.debug('ApFileSystem.mkdir', dir);
            fs.mkdirSync(dir)
        })

        // rmdir
        this.socket.on('rmdir', (path: string) => {
            const dir = Paths.platform(Paths.getDataDir() + path);
            ConsoleLog.debug('ApFileSystem.rmdir', dir);
            rmdir(dir, () => { });
        })

        // writeFile
        this.socket.on('writeFile', (path: string, data: string, ack: () => void) => {
            const dir = Paths.platform(Paths.getDataDir() + path);
            ConsoleLog.debug('ApFileSystem.writeFile', dir);
            fs.writeFileSync(dir, data, { flag: 'a' });
            ack();
        })

        // readDir
        this.socket.on('readDir', (path: string, callback: (files: string[]) => void) => {
            const dir = Paths.platform(Paths.getDataDir() + path);
            const files = fs.readdirSync(dir);
            ConsoleLog.debug('ApFileSystem.readDir', dir, files);
            callback(files);
        })

        // readFile
        this.socket.on('readFile', (path: string, offset: number, chunkSize: number, callback: (data: string, eof: boolean) => void) => {
            const dir = Paths.getDataDir() + Paths.platform(path);
            const fd = fs.openSync(dir, 'r');
            const data = Buffer.alloc(chunkSize);
            const read = fs.readSync(fd, data, 0, chunkSize, offset);
            const size = fs.statSync(dir).size;
            const eof = offset + chunkSize >= size;
            callback(data.subarray(0, read).toString(), eof);
            ConsoleLog.debug('ApFileSystem.readFile', dir, offset, chunkSize, eof, data.toString());
        })
    }
}