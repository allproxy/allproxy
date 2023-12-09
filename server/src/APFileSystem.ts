import fs from 'fs';
import { Socket } from 'socket.io';
import ConsoleLog from './ConsoleLog';
import Paths from './Paths';
import { commandExists } from './interceptors/util/fs';
const spawn = require('child_process').spawn;
const rmdir = require('rimraf');

export function dateToHHMMSS(d: Date) {
    if (isNaN(d.getMonth()) || isNaN(d.getDate())) {
        return "Invalid Date";
    }
    const monthDay = d.getMonth() + 1 + '/' + d.getDate();
    return monthDay + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
}

export default class APFileSystem {
    private socket: Socket;

    public constructor(socket: Socket) {
        this.socket = socket;
        this.log('constructor');
    }

    private log(method: string, ...args: any[]) {
        if (process.env.FILE_SYSTEM_LOG === '1') {
            const time = dateToHHMMSS(new Date());
            const u = this.socket.handshake.url;
            const urlPath = u.includes('allproxy') || u.includes('jlogviewer') ? u : '';
            console.log(time, this.socket.handshake.address, urlPath, method, ...args);
        }
    }

    private toPlatformPath(path: string) {
        if (Paths.sep() === "\\") {
            path = path.replace(/:/g, '-');
        }
        return Paths.platform(Paths.getDataDir() + path);
    }

    public listen() {
        this.log('listen');
        ConsoleLog.debug('APFileSystem.listen');
        // mkdir
        this.socket.on('mkdir', (path: string) => {
            this.log('mkdir', path);
            const dir = this.toPlatformPath(path);
            ConsoleLog.debug('ApFileSystem.mkdir', dir);
            fs.mkdirSync(dir);
        })

        // rmdir
        this.socket.on('rmdir', (path: string) => {
            this.log('rmdir', path);
            const platformPath = this.toPlatformPath(path);
            ConsoleLog.debug('ApFileSystem.rmdir', platformPath);
            rmdir(platformPath, () => { });
        })

        // writeFile
        this.socket.on('appendFile', (path: string, data: string, ack: () => void) => {
            this.log('appendFile', path);
            try {
                const file = this.toPlatformPath(path);
                ConsoleLog.debug('ApFileSystem.appendFile', file);
                fs.writeFileSync(file, data, { flag: 'a' });
            } catch (e) {
                console.log('afFileSystem.appendFile', e);
            }
            ack();
        })

        // writeFile
        this.socket.on('writeFile', (path: string, data: string, ack: () => void) => {
            this.log('writeFile', path);
            try {
                const file = this.toPlatformPath(path);
                ConsoleLog.debug('ApFileSystem.writeFile', file);
                fs.writeFileSync(file, data, { flag: 'w' });
            } catch (e) {
                console.log('afFileSystem.writeFile', e);
            }
            ack();
        })

        // deleteFile
        this.socket.on('deleteFile', (path: string, ack: () => void) => {
            this.log('deleteFile', path);
            try {
                const file = this.toPlatformPath(path);
                ConsoleLog.debug('ApFileSystem.deleteFile', file);
                fs.rmSync(file);
            } catch (e) {
                console.log('afFileSystem.deleteFile', e);
            }
            ack();
        })

        // renameFile
        this.socket.on('renameFile', (oldPath: string, newPath: string, ack: () => void) => {
            this.log('renameFile', oldPath, newPath);
            try {
                const oldFile = this.toPlatformPath(oldPath);
                const newFile = this.toPlatformPath(newPath);
                ConsoleLog.debug('ApFileSystem.renameFile', oldFile, newFile);
                fs.renameSync(oldFile, newFile);
            } catch (e) {
                console.log('afFileSystem.renameFile', e);
            }
            ack();
        })

        // exists
        this.socket.on('exists', (path: string, callback: (exists: boolean) => void) => {
            //this.log('exists', path);
            try {
                const platformPath = this.toPlatformPath(path);
                ConsoleLog.debug('ApFileSystem.exists', platformPath);
                callback(fs.existsSync(platformPath));
            } catch (e) {
                callback(false);
            }
        })

        // readDir
        this.socket.on('readDir', (path: string, callback: (files: string[]) => void) => {
            this.log('readDir', path);
            try {
                const platformPath = this.toPlatformPath(path);
                const files = fs.readdirSync(platformPath);
                ConsoleLog.debug('ApFileSystem.readDir', platformPath, files);
                callback(files);
            } catch (e) {
                console.log('afFileSystem.readDir', e);
            }
        })

        // grepDir - find all files in a directory with a matching string
        this.socket.on('grepDir', async (path: string, match: string, callback: (files: string[]) => void) => {
            this.log('grepDir', path, match);
            try {
                const subDir = Paths.platform(path);

                let output: string;
                if (await commandExists('parallel')) {
                    output = await run(`find ${subDir} -type f -print0 | parallel -0 grep -l -m 1 ${match} {}`, Paths.getDataDir());
                } else {
                    output = await run(`find ${subDir} -type f -exec grep -l -m 1 ${match} {} +`, Paths.getDataDir());
                }

                const files = output.toString().split('\n')

                ConsoleLog.debug('ApFileSystem.grepDir', subDir, match, files);
                callback(files);
            } catch (e) {
                console.log('afFileSystem.grepDir', e);
            }
        })

        // readFile
        this.socket.on('readFile', (path: string, offset: number, chunkSize: number, callback: (data: string, eof: boolean) => void) => {
            if (offset === 0) this.log('readFile', path);
            try {
                const file = this.toPlatformPath(path);
                const mode = 'win32' ? 'r' : 444;
                const fd = fs.openSync(file, mode);
                const data = Buffer.alloc(chunkSize);
                const read = fs.readSync(fd, data, 0, chunkSize, offset);
                fs.closeSync(fd);
                const size = fs.statSync(file).size;
                const eof = offset + chunkSize >= size;
                callback(data.subarray(0, read).toString(), eof);
                ConsoleLog.debug('ApFileSystem.readFile', file, offset, chunkSize, eof, data.toString());
            } catch (e) {
                console.log('afFileSystem.readFile', e);
            }
        })
    }
}

async function run(command: string, cwd: string): Promise<string> {
    //console.log(command);
    let response = ''
    await new Promise(resolve => {
        const tokens = command.split(' ');
        const p = spawn(tokens[0], tokens.slice(1), { cwd, shell: true })
        p.stdout.on('data', (data: Buffer) => {
            //console.log(data.toString());
            response += data.toString();
        })
        p.stderr.on('data', (data: Buffer) => {
            console.error(data.toString());
        })
        p.on('exit', resolve)
    })
    //console.log(response)
    return response;
}