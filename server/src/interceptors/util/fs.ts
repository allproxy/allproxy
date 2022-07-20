import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import rimraf from 'rimraf';
import { lookpath } from 'lookpath';

import { isErrorLike } from './error';

export const statFile = promisify(fs.stat);
export const readFile = promisify(fs.readFile);
export const readDir = promisify(fs.readdir);
export const readLink = promisify(fs.readlink);
export const deleteFile = promisify(fs.unlink);
export const checkAccess = promisify(fs.access);
export const chmod = promisify(fs.chmod);
export const mkDir = promisify(fs.mkdir);
export const writeFile = promisify(fs.writeFile);
export const renameFile = promisify(fs.rename);
export const copyFile = promisify(fs.copyFile);

export const canAccess = (path: string) => checkAccess(path).then(() => true).catch(() => false);

// Takes a path, follows any links present (if possible) until we reach a non-link file. This
// does *not* check that the final path is accessible - it just removes any links en route.
// This will return undefined if a target path does not resolve at all.
export const getRealPath = async (targetPath: string): Promise<string | undefined> => {
    while (true) {
        try {
            const linkTarget = await readLink(targetPath);
            // Links are often relative, so we need to resolve them against the link parent directory:
            targetPath = path.resolve(path.dirname(targetPath), linkTarget);
        } catch (e: any) {
            // Target file does not exist:
            if (e.code === 'ENOENT') return undefined;
            // Not a link, or some other error:
            else return targetPath;
        }
    }
};

export const deleteFolder = promisify(rimraf);

export const ensureDirectoryExists = (path: string) =>
    checkAccess(path).catch(() => mkDir(path, { recursive: true }));

export const commandExists = (path: string): Promise<boolean> =>
    lookpath(path).then((result) => result !== undefined);

// export const createTmp = (options: tmp.Options = {}) => new Promise<{
//     path: string,
//     fd: number,
//     cleanupCallback: () => void
// }>((resolve, reject) => {
//     tmp.file(options, (err, path, fd: number, cleanupCallback) => {
//         if (err) return reject(err);
//         resolve({ path, fd, cleanupCallback });
//     });
// });

export const moveFile = async (oldPath: string, newPath: string) => {
    try {
        await renameFile(oldPath, newPath);
    } catch (e) {
        if (isErrorLike(e) && e.code === 'EXDEV') {
            // Cross-device - can't rename files across partions etc.
            // In that case, we fallback to copy then delete:
            await copyFile(oldPath, newPath);
            await deleteFile(oldPath);
        }
    }
};