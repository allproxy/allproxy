import { Socket } from "socket.io-client";
import FS from '@isomorphic-git/lightning-fs';
import { urlPathStore } from "./UrlPathStore";

const CHUNKSIZE = 500000;

const defaultFsType: 'browserFs' | 'serverFs' = !urlPathStore.isLocalhost() || process.env.NODE_ENV !== "production" ? 'browserFs' : 'serverFs';
const fs = new FS('allproxy').promises;

let once = false;
async function init() {
    if (once) return;
    try {
        await fs.mkdir('/intercept');
        await fs.mkdir('/proto');
        await fs.mkdir('/bin');
        await fs.mkdir('/sessions');
        await fs.mkdir('/jsonFields');
        await fs.mkdir('/scripts');
        await fs.mkdir('/queries');
        once = true;
    } catch (e) { }
}

function log(...args: any[]) {
    if (process.env.NODE_ENV === 'development') console.log(...args);
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
    public async mkdir(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType) {
        log(fsType, 'mkdir', path);
        if (fsType === 'browserFs') {
            await init();
            fs.mkdir('/' + path);
        } else {
            this.socket?.emit('mkdir', path);
        }
    }

    // rmdir
    public async rmdir(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType) {
        log(fsType, 'rmdir', path);
        if (fsType === 'browserFs') {
            await init();
            fs.rmdir('/' + path);
        } else {
            this.socket?.emit('rmdir', path);
        }
    }

    // writeFile
    public async writeFile(path: string, data: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<void> {
        log(fsType, 'writeFile', path);
        if (fsType === 'browserFs') {
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
    public async deleteFile(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<void> {
        log(fsType, 'deleteFile', path);
        if (fsType === 'browserFs') {
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
    public async renameFile(oldPath: string, newPath: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<void> {
        log(fsType, 'renameFile', oldPath, newPath);
        if (fsType === 'browserFs') {
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
    public async exists(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<boolean> {
        if (fsType === 'browserFs') {
            await init();
            try {
                await fs.stat('/' + path);
                log(fsType, 'exists - true', path);
                return true;
            } catch (e) {
                log(fsType, 'exists - false', path);
                return false;
            }
        }
        return new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 5000);
            this.socket?.emit('exists', path, (exists: boolean) => {
                log(fsType, 'exists - ' + exists, path);
                resolve(exists);
            });
        });
    }

    // readdir
    public async readDir(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<string[]> {
        if (fsType === 'browserFs') {
            await init();
            const files = fs.readdir('/' + path);
            log(fsType, 'readDir', path, files);
            return files;
        }
        return new Promise<string[]>((resolve) => {
            this.socket?.emit('readDir', path, (files: string[]) => {
                log(fsType, 'readDir', path, files);
                resolve(files);
            });
        });
    }

    public async grepDir(path: string, match: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<string[]> {
        if (fsType === 'browserFs') {
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
    public async readFile(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<string> {
        if (fsType === 'browserFs') {
            await init();
            const data = (await fs.readFile('/' + path)).toString();
            log(fsType, 'readFile', path, data);
            return data;
        }
        const chunks: string[] = [];
        return new Promise<string>(async (resolve1) => {
            let done = false;
            for (let offset = 0; !done; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    this.socket?.emit('readFile', path, offset, CHUNKSIZE, (chunk: string, eof: boolean) => {
                        chunks.push(chunk);
                        done = eof;
                        //log(fsType,'readFile', offset, chunk.length, chunks.length, eof);
                        resolve2(0);
                    });
                });
            }
            const data = chunks.join('');
            log(fsType, 'readFile', path, data);
            resolve1(data);
        });
    }
}

export const apFileSystem = new APFileSystem();