import * as path from 'path';
import { promisify } from 'util';

import getBrowserLauncherCb from '@httptoolkit/browser-launcher';
import {
    LaunchOptions,
    Launch,
    BrowserInstance,
    Browser,
    update as updateBrowserCacheCb
} from '@httptoolkit/browser-launcher';

import { delay } from './util/promise';
import { isErrorLike } from './util/error';
import { readFile, deleteFile } from './util/fs';

const getBrowserLauncher = promisify(getBrowserLauncherCb);
const updateBrowserCache: (configPath: string) => Promise<unknown> = promisify(updateBrowserCacheCb);

const browserConfigPath = (configPath: string) => path.join(configPath, 'browsers.json');

export { BrowserInstance, Browser };

export async function checkBrowserConfig(configPath: string) {
    // It's not clear why, but sometimes the browser config can become corrupted, so it's not valid JSON
    // If that happens browser-launcher can hit issues. To avoid that entirely, we check it here on startup.

    const browserConfig = browserConfigPath(configPath);

    try {
        const rawConfig = await readFile(browserConfig, 'utf8');
        JSON.parse(rawConfig);
    } catch (error) {
        if (isErrorLike(error) && error.code === 'ENOENT') return;
        console.warn(`Failed to read browser config cache from ${browserConfig}, clearing.`, error);

        return deleteFile(browserConfig).catch((err) => {
            // There may be possible races around here - as long as the file's gone, we're happy
            if (isErrorLike(err) && err.code === 'ENOENT') return;

            console.error('Failed to clear broken config file:', err);
        });
    }
}

let launcher: Promise<Launch> | undefined;

function getLauncher(configPath: string) {
    const browserConfig = browserConfigPath(configPath);
    launcher = getBrowserLauncher(browserConfig);

    launcher!.then(async () => {
        // Async after first creating the launcher, we trigger a background cache update.
        // This can be *synchronously* expensive (spawns 10s of procs, 10+ms sync per
        // spawn on unix-based OSs) so defer briefly.
        await delay(2000);
        try {
            await updateBrowserCache(browserConfig);
            //console.log('Browser cache updated');
            // Need to reload the launcher after updating the cache:
            launcher = getBrowserLauncher(browserConfig);
        } catch (e) {
            console.error(e)
        }
    });

    // Reset & retry if this fails somehow:
    launcher!.catch((e) => {
        console.error(e);
        launcher = undefined;
    });

    return launcher;
}

export const getAvailableBrowsers = async (configPath: string) => {
    return (await getLauncher(configPath))!.browsers;
};

export { LaunchOptions };

export const launchBrowser = async (url: string, options: LaunchOptions, configPath: string) => {
    const launcher = await getLauncher(configPath);
    const browserInstance = await promisify(launcher!)(url, options);

    browserInstance.process.on('error', (e) => {
        // If nothing else is listening for this error, this acts as default
        // fallback error handling: log & report & don't crash.
        if (browserInstance.process.listenerCount('error') === 1) {
            console.error('Browser launch error');
            console.error(e);
        }
    });

    return browserInstance;
};