import { Socket } from "socket.io-client";
import FS from '@isomorphic-git/lightning-fs';
import { urlPathStore } from "./UrlPathStore";
import { defaultScript, jsonLogStore, setDefaultScript } from "./JSONLogStore";
import { sessionStore } from "./SessionStore";

const CHUNKSIZE = 500000;

const defaultFsType: 'browserFs' | 'serverFs' = !urlPathStore.isLocalhost() || urlPathStore.isGitHubPages() || process.env.NODE_ENV !== "production" ? 'browserFs' : 'serverFs';
const fs = new FS(urlPathStore.isLocalhost() ? 'allproxy' : document.location.hostname).promises;

export async function initApFileSystem() {
    log(defaultFsType, 'initApFileSystem');
    await mkdirIfRequired('/intercept');
    await mkdirIfRequired('/proto');
    await mkdirIfRequired('/bin');
    await mkdirIfRequired('/sessions');
    await mkdirIfRequired('/jsonFields');
    await mkdirIfRequired('/scripts');
    await mkdirIfRequired('/queries');
    if (urlPathStore.isLocalhost()) return;
    if (urlPathStore.isGitHubPages()) await fetchApFileSystem();
}

async function mkdirIfRequired(dir: string) {
    try {
        log(defaultFsType, 'mkdirIfRequired', dir);
        await fs.mkdir(dir);
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
            fs.mkdir('/' + path);
        } else {
            this.socket?.emit('mkdir', path);
        }
    }

    // rmdir
    public async rmdir(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType) {
        log(fsType, 'rmdir', path);
        if (fsType === 'browserFs') {
            fs.rmdir('/' + path);
        } else {
            this.socket?.emit('rmdir', path);
        }
    }

    // writeFile
    public async writeFile(path: string, data: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<void> {
        log(fsType, 'writeFile', path);
        if (fsType === 'browserFs') {
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
        log(fsType, 'exists?', path);
        if (fsType === 'browserFs') {
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
            if (!this.isConnected()) {
                resolve(false);
            } else {
                setTimeout(() => resolve(false), 5000);
                this.socket?.emit('exists', path, (exists: boolean) => {
                    log(fsType, 'exists - ' + exists, path);
                    resolve(exists);
                });
            }
        });
    }

    // readdir
    public async readDir(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<string[]> {
        log(fsType, 'readDir...', path);
        if (fsType === 'browserFs') {
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

    public async grepDir(path: string, match: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<{ file: string, match: string }[]> {
        const result: { file: string, match: string }[] = [];
        if (fsType === 'browserFs') {
            for (const sessionName of await this.readDir(path)) {
                const matchString = await sessionStore.searchSession(sessionName, match);
                if (matchString !== '') {
                    result.push({ file: path + '/' + sessionName, match: matchString });
                }
            }
            return result;
        } else {
            return new Promise<{ file: string, match: string }[]>((resolve) => {
                this.socket?.emit('grepDir', path, match, (files: string[]) => {
                    for (const file of files) {
                        result.push({ file, match: '' });
                    }
                    resolve(result);
                });
            });
        }
    }

    // readFile
    public async readFile(path: string, fsType: 'browserFs' | 'serverFs' = defaultFsType): Promise<string> {
        if (fsType === 'browserFs') {
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

async function fetchApFileSystem() {
    const url = document.location.href.split('#')[0] + 'apFileSystem.json';
    const response = await fetch(url);
    if (response.status === 200) {
        const json = await response.json();

        // jsonFields
        const fields = await apFileSystem.readDir('/jsonFields');
        if (fields.length === 0) {
            for (const field of json.jsonFields) {
                await apFileSystem.writeFile('/jsonFields/' + field, field);
            }
            await apFileSystem.writeFile('/briefJsonFields.json', json.briefJsonFields);
        }

        // scripts
        if (!await apFileSystem.exists('/scripts/method')) await apFileSystem.writeFile('/scripts/method', json.method);
        if (!await apFileSystem.exists('/scripts/jsonLogScript') || await apFileSystem.readFile('/scripts/jsonLogScript') === defaultScript) {
            await apFileSystem.writeFile('/scripts/jsonLogScript', json.jsonLogScript);
            setDefaultScript(json.jsonLogScript);
        }

        // Queries
        const queries = await apFileSystem.readDir('/queries');
        if (queries.length === 0) {
            for (const dir in json.queries) {
                await apFileSystem.mkdir('/queries/' + dir);
                await apFileSystem.writeFile('/queries/' + dir + '/query.txt', json.queries[dir].query);
            }
        }

        let jsonQueries = [];
        if (await apFileSystem.exists('/jsonQueries.json')) {
            jsonQueries = JSON.parse(await apFileSystem.readFile('/jsonQueries.json'));
        }
        if (jsonQueries.length === 0) await apFileSystem.writeFile('/jsonQueries.json', json.jsonQueries);

        let jsonSubQueries = [];
        if (await apFileSystem.exists('/jsonSubQueries.json')) {
            jsonSubQueries = JSON.parse(await apFileSystem.readFile('/jsonSubQueries.json'));
        }
        if (jsonSubQueries.length === 0) await apFileSystem.writeFile('/jsonSubQueries.json', json.jsonSubQueries);

        // Update
        await jsonLogStore.init();
    }
}

export const apFileSystem = new APFileSystem();