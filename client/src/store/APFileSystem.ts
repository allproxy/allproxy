import { Socket } from "socket.io-client";
import FS from '@isomorphic-git/lightning-fs';
import { urlPathStore } from "./UrlPathStore";

const CHUNKSIZE = 500000;

const fsType: 'browserFs' | 'serverFs' = !urlPathStore.isLocalhost() || process.env.NODE_ENV !== "production" ? 'browserFs' : 'serverFs';
const fs = new FS('allproxy').promises;

let once = false;
async function init() {
    if (once) return;
    try {
        await fs.mkdir(`/intercept`);
        await fs.mkdir(`/proto`);
        await fs.mkdir(`/bin`);
        await fs.mkdir(`/sessions`);
        await fs.mkdir(`/jsonFields`);
        await fs.mkdir(`/scripts`);
        await fs.mkdir(`/queries`);
        once = true;
    } catch (e) { }
}

function log(...args: any[]) {
    if (false) console.log(...args);
}

export default class APFileSystem {
    private socket?: Socket = undefined;

    public setSocket(socket: Socket) {
        this.socket = socket;
    }

    public isConnected() {
        return this.socket?.connected;
    }

    // mkdir
    public async mkdir(path: string, useFsType: 'browserFs' | 'serverFs' = fsType) {
        log('mkdir', path);
        if (useFsType === 'browserFs') {
            await init();
            fs.mkdir('/' + path);
        } else {
            this.socket?.emit('mkdir', path);
        }
    }

    // rmdir
    public async rmdir(path: string, useFsType: 'browserFs' | 'serverFs' = fsType) {
        log('rmdir', path);
        if (useFsType === 'browserFs') {
            await init();
            fs.rmdir('/' + path);
        } else {
            this.socket?.emit('rmdir', path);
        }
    }

    // writeFile
    public async writeFile(path: string, data: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<void> {
        log('writeFile', path);
        if (useFsType === 'browserFs') {
            await init();
            return fs.writeFile('/' + path, data);
        }
        return new Promise<void>(async (resolve1) => {
            for (let offset = 0; offset < data.length; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    const chunk = data.substring(offset, Math.min(offset + CHUNKSIZE, data.length));
                    const operation = offset === 0 ? 'writeFile' : 'appendFile';
                    this.socket?.emit(operation,
                        path,
                        chunk,
                        () => resolve2(0)
                    );
                });
            }
            resolve1();
        });
    }

    // deleteFile
    public async deleteFile(path: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<void> {
        log('deleteFile', path);
        if (useFsType === 'browserFs') {
            await init();
            return fs.unlink('/' + path);
        }
        return new Promise<void>((resolve) => {
            this.socket?.emit('deleteFile', path, () => {
                resolve();
            });
        });
    }

    // renameFile
    public async renameFile(oldPath: string, newPath: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<void> {
        log('renameFile', oldPath, newPath);
        if (useFsType === 'browserFs') {
            await init();
            return fs.rename('/' + oldPath, '/' + newPath);
        }
        return new Promise<void>((resolve) => {
            this.socket?.emit('renameFile', oldPath, newPath, () => {
                resolve();
            });
        });
    }

    // exists
    public async exists(path: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<boolean> {
        log('exists', path);
        if (useFsType === 'browserFs') {
            await init();
            try {
                await fs.stat('/' + path);
                log('file exists');
                return true;
            } catch (e) {
                return false;
            }
        }
        return new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 5000);
            this.socket?.emit('exists', path, (exists: boolean) => {
                resolve(exists);
            });
        });
    }

    // readdir
    public async readDir(path: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<string[]> {
        log('readDir', path);
        if (useFsType === 'browserFs') {
            await init();
            return fs.readdir('/' + path);
        }
        return new Promise<string[]>((resolve) => {
            this.socket?.emit('readDir', path, (files: string[]) => {
                resolve(files);
            });
        });
    }

    public async grepDir(path: string, match: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<string[]> {
        if (useFsType === 'browserFs') {
            await init();
            return [];
        }
        return new Promise<string[]>((resolve) => {
            this.socket?.emit('grepDir', path, match, (files: string[]) => {
                resolve(files);
            });
        });
    }

    // readFile
    public async readFile(path: string, useFsType: 'browserFs' | 'serverFs' = fsType): Promise<string> {
        log('readFile', path);
        if (useFsType === 'browserFs') {
            await init();
            return (await fs.readFile('/' + path)).toString();
        }
        const chunks: string[] = [];
        return new Promise<string>(async (resolve1) => {
            let done = false;
            for (let offset = 0; !done; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    this.socket?.emit('readFile', path, offset, CHUNKSIZE, (chunk: string, eof: boolean) => {
                        chunks.push(chunk);
                        done = eof;
                        //log('readFile', offset, chunk.length, chunks.length, eof);
                        resolve2(0);
                    });
                });
            }
            const data = chunks.join('');
            resolve1(data);
        });
    }
}

export const apFileSystem = new APFileSystem();