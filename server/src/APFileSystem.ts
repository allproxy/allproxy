import fs from 'fs';
import { Socket } from 'socket.io';
import ConsoleLog from './ConsoleLog';
import Paths from './Paths';
import { commandExists } from './interceptors/util/fs';
const spawn = require('child_process').spawn;
const rmdir = require('rimraf');

export default class APFileSystem {
    private socket: Socket;

    public constructor(socket: Socket) {
        this.socket = socket;
    }

    private toPlatformPath(path: string) {
        if (Paths.sep() === "\\") {
            path = path.replace(/:/g, '-');
        }
        return Paths.platform(Paths.getDataDir() + path);
    }

    public listen() {
        ConsoleLog.debug('APFileSystem.listen');
        // mkdir
        this.socket.on('mkdir', (path: string) => {
            const dir = this.toPlatformPath(path);
            ConsoleLog.debug('ApFileSystem.mkdir', dir);
            fs.mkdirSync(dir)
        })

        // rmdir
        this.socket.on('rmdir', (path: string) => {
            const platformPath = this.toPlatformPath(path);
            ConsoleLog.debug('ApFileSystem.rmdir', platformPath);
            rmdir(platformPath, () => { });
        })

        // writeFile
        this.socket.on('writeFile', (path: string, data: string, ack: () => void) => {
            try {
                const file = this.toPlatformPath(path);
                ConsoleLog.debug('ApFileSystem.writeFile', file);
                fs.writeFileSync(file, data, { flag: 'a' });
            } catch (e) {
                console.log(e);
            }
            ack();
        })

        // deleteFile
        this.socket.on('deleteFile', (path: string, ack: () => void) => {
            try {
                const file = this.toPlatformPath(path);
                ConsoleLog.debug('ApFileSystem.deleteFile', file);
                fs.rmSync(file);
            } catch (e) {
                console.log(e);
            }
            ack();
        })

        // renameFile
        this.socket.on('renameFile', (oldPath: string, newPath: string, ack: () => void) => {
            try {
                const oldFile = this.toPlatformPath(oldPath);
                const newFile = this.toPlatformPath(newPath);
                ConsoleLog.debug('ApFileSystem.renameFile', oldFile, newFile);
                fs.renameSync(oldFile, newFile);
            } catch (e) {
                console.log(e);
            }
            ack();
        })

        // exists
        this.socket.on('exists', (path: string, callback: (exists: boolean) => void) => {
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
            try {
                const platformPath = this.toPlatformPath(path);
                const files = fs.readdirSync(platformPath);
                ConsoleLog.debug('ApFileSystem.readDir', platformPath, files);
                callback(files);
            } catch (e) {
                console.log(e);
            }
        })

        // grepDir - find all files in a directory with a matching string
        this.socket.on('grepDir', async (path: string, match: string, callback: (files: string[]) => void) => {
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
                console.log(e);
            }
        })

        // readFile
        this.socket.on('readFile', (path: string, offset: number, chunkSize: number, callback: (data: string, eof: boolean) => void) => {
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
                console.log(e);
            }
        })
    }
}

async function run(command: string, cwd: string): Promise<string> {
    console.log(command);
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
    console.log(response)
    return response;
}