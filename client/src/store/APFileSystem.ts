import { Socket } from "socket.io-client";


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
    public writeFile(path: string, data: string) {
        this.socket?.emit('writeFile', path, data);
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
        return new Promise<string>((resolve) => {
            this.socket?.emit('readFile', path, (data: string) => {
                resolve(data);
            });
        })
    }
}

export const apFileSystem = new APFileSystem()