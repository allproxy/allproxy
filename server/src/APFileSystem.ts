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

    private dirPath(path: string) {
        if (Paths.sep() === "\\") {
            path = path.replace(/:/g, '-');
        }
        return Paths.platform(Paths.getDataDir() + path);
    }

    public listen() {
        ConsoleLog.debug('APFileSystem.listen');
        // mkdir
        this.socket.on('mkdir', (path: string) => {
            const dir = this.dirPath(path);
            ConsoleLog.debug('ApFileSystem.mkdir', dir);
            fs.mkdirSync(dir)
        })

        // rmdir
        this.socket.on('rmdir', (path: string) => {
            const dir = this.dirPath(path);
            ConsoleLog.debug('ApFileSystem.rmdir', dir);
            rmdir(dir, () => { });
        })

        // writeFile
        this.socket.on('writeFile', (path: string, data: string, ack: () => void) => {
            const dir = this.dirPath(path);
            ConsoleLog.debug('ApFileSystem.writeFile', dir);
            fs.writeFileSync(dir, data, { flag: 'a' });
            ack();
        })

        // deleteFile
        this.socket.on('deleteFile', (path: string, ack: () => void) => {
            const dir = this.dirPath(path);
            ConsoleLog.debug('ApFileSystem.deleteFile', dir);
            fs.rmSync(dir);
            ack();
        })

        // renameFile
        this.socket.on('renameFile', (oldPath: string, newPath: string, ack: () => void) => {
            const oldFile = this.dirPath(oldPath);
            const newFile = this.dirPath(newPath);
            ConsoleLog.debug('ApFileSystem.renameFile', oldFile, newFile);
            fs.renameSync(oldFile, newFile);
            ack();
        })

        // mkdir
        this.socket.on('exists', (path: string, callback: (exists: boolean) => void) => {
            const dir = this.dirPath(path);
            ConsoleLog.debug('ApFileSystem.exists', dir);
            callback(fs.existsSync(dir));
        })

        // readDir
        this.socket.on('readDir', (path: string, callback: (files: string[]) => void) => {
            const dir = this.dirPath(path);
            const files = fs.readdirSync(dir);
            ConsoleLog.debug('ApFileSystem.readDir', dir, files);
            callback(files);
        })

        // readFile
        this.socket.on('readFile', (path: string, offset: number, chunkSize: number, callback: (data: string, eof: boolean) => void) => {
            const dir = this.dirPath(path);
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