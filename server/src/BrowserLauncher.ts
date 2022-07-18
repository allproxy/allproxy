const launcher = require('@james-proxy/james-browser-launcher');

export interface Browser {
    name: string,
    version: string,
    type: string,
    command: string
}

export default class BrowserLauncher {
    public static async detect(): Promise<Browser[]> {
        return new Promise((resolve) => {
            launcher.detect(function (available: Browser[]) {
                console.log('Available browsers:');
                console.dir(available);
                resolve(available);
            });
        });
    }

    public static launch(browser: Browser): Promise<number> {
        return new Promise((resolve, reject) => {
            launcher((err: any, launch: any) => {
                if (err) return reject(err);
                const options = {
                    proxy: 'localhost:8888',
                    browser: browser.name,
                    version: browser.version
                };
                launch('https://google.com/', options, (launchErr: any) => {
                    if (launchErr) return reject(launchErr);
                    resolve(0);
                });
            });
        })
    }
}