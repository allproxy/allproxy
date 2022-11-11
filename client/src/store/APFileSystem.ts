import { Socket } from "socket.io-client";

const CHUNKSIZE = 32000;

export default class APFileSystem {
    private socket?: Socket = undefined;

    public setSocket(socket: Socket) {
        this.socket = socket
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
    public async writeFile(path: string, data: string) {
        for (let offset = 0; offset < data.length; offset += CHUNKSIZE) {
            await new Promise((resolve) => {
                const chunk = data.substring(offset, Math.min(offset + CHUNKSIZE, data.length));
                this.socket?.emit('writeFile',
                    path,
                    chunk,
                    () => resolve(0)
                );
            })
        }
    }

    // readdir
    public async readDir(path: string): Promise<string[]> {
        return new Promise<string[]>((resolve) => {
            this.socket?.emit('readDir', path, (files: string[]) => {
                resolve(files);
            });
        });
    }

    // readFile
    public async readFile(path: string): Promise<string> {
        let data: Buffer = Buffer.from('');
        return new Promise<string>(async (resolve1) => {
            let done = false;
            for (let offset = 0; !done; offset += CHUNKSIZE) {
                await new Promise((resolve2) => {
                    this.socket?.emit('readFile', path, offset, CHUNKSIZE, (chunk: string, eof: boolean) => {
                        data = Buffer.concat([data, Buffer.from(chunk)]);
                        done = eof;
                        resolve2(0);
                    });
                })
            }
            resolve1(data.toString());
        })
    }
}

export const apFileSystem = new APFileSystem()