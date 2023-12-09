import { Socket } from "socket.io-client";

const CHUNKSIZE = 500000;

export default class APFileSystem {
    private socket?: Socket = undefined;

    public setSocket(socket: Socket) {
        this.socket = socket;
    }

    // mkdir
    public mkdir(path: string) {
        this.socket?.emit('mkdir', path);
    }

    // rmdir
    public rmdir(path: string) {
        this.socket?.emit('rmdir', path);
    }

    // writeFile
    public async writeFile(path: string, data: string): Promise<void> {
        return new Promise<void>(async (resolve1) => {
            for (let offset = 0; offset < data.length; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    const chunk = data.substring(offset, Math.min(offset + CHUNKSIZE, data.length));
                    this.socket?.emit('writeFile',
                        path,
                        chunk,
                        () => resolve2(0)
                    );
                });
            }
            resolve1();
        });
    }

    // appendFile
    public async appendFile(path: string, data: string): Promise<void> {
        return new Promise<void>(async (resolve1) => {
            for (let offset = 0; offset < data.length; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    const chunk = data.substring(offset, Math.min(offset + CHUNKSIZE, data.length));
                    this.socket?.emit('appendFile',
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
    public async deleteFile(path: string): Promise<void> {
        return new Promise<void>((resolve) => {
            this.socket?.emit('deleteFile', path, () => {
                resolve();
            });
        });
    }

    // renameFile
    public async renameFile(oldPath: string, newPath: string): Promise<void> {
        return new Promise<void>((resolve) => {
            this.socket?.emit('renameFile', oldPath, newPath, () => {
                resolve();
            });
        });
    }

    // exists
    public async exists(path: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            setTimeout(() => resolve(false), 5000);
            this.socket?.emit('exists', path, (exists: boolean) => {
                resolve(exists);
            });
        });
    }

    // readdir
    public async readDir(path: string): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            this.socket?.emit('readDir', path, (files: string[]) => {
                resolve(files);
            });
        });
    }

    public async grepDir(path: string, match: string): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            this.socket?.emit('grepDir', path, match, (files: string[]) => {
                resolve(files);
            });
        });
    }

    // readFile
    public async readFile(path: string): Promise<string> {
        const chunks: string[] = [];
        return new Promise<string>(async (resolve1) => {
            let done = false;
            for (let offset = 0; !done; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    this.socket?.emit('readFile', path, offset, CHUNKSIZE, (chunk: string, eof: boolean) => {
                        chunks.push(chunk);
                        done = eof;
                        //console.log('readFile', offset, chunk.length, chunks.length, eof);
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