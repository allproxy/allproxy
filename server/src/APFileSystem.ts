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
            const dir = Paths.getDataDir() + path;
            ConsoleLog.debug('ApFileSystem.mkdir', dir);
            fs.mkdirSync(dir)
        })

        // rmdir
        this.socket.on('rmdir', (path: string) => {
            const dir = Paths.getDataDir() + path;
            ConsoleLog.debug('ApFileSystem.rmdir', dir);
            rmdir(dir, () => { });
        })

        // writeFile
        this.socket.on('writeFile', (path: string, data: string) => {
            const dir = Paths.getDataDir() + path;
            ConsoleLog.debug('ApFileSystem.writeFile', dir);
            fs.writeFileSync(dir, data);
        })

        // readDir
        this.socket.on('readDir', (path: string, callback: (files: string[]) => void) => {
            const dir = Paths.getDataDir() + path;
            const files = fs.readdirSync(dir);
            ConsoleLog.debug('ApFileSystem.readDir', dir, files);
            callback(files);
        })

        // readFile
        this.socket.on('readFile', (path: string, callback: (data: string) => void) => {
            const dir = Paths.getDataDir() + path;
            const data = fs.readFileSync(dir);
            callback(data.toString());
            ConsoleLog.debug('ApFileSystem.readFile', dir, data);
        })
    }
}