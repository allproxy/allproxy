import { buildInterceptors, Interceptor, shutdownInterceptors } from "./interceptors";
import Paths from "./Paths";
import { getAvailableBrowsers } from "./interceptors/browsers";
import { getCertContent } from "./GenerateCertKey";
import Launcher from "@httptoolkit/browser-launcher";
import { Dictionary } from "lodash";
import { HtkConfig } from './interceptors/config'

let config: HtkConfig;
let interceptors: Dictionary<Interceptor>;

export default class BrowserLauncher {
    public static init() {
        config = getConfig();
        interceptors = buildInterceptors(config);
    }

    public static async detect(): Promise<Launcher.Browser[]> {
        return new Promise((resolve) => {
            getAvailableBrowsers(config.configPath)
                .then((browsers) => {
                    const terminal = interceptors['fresh-terminal'];
                    if (terminal) {
                        browsers.push({
                            profile: 'terminal',
                            type: 'terminal',
                            name: 'terminal',
                            command: 'tbd',
                            version: 'unknown',
                        });
                    }
                    console.log(browsers);
                    resolve(browsers);
                });
        });
    }

    public static launch(browser: Launcher.Browser) {
        const name = browser.type.replace('msedge', 'edge');
        const id = 'fresh-' + name;
        const interceptor = interceptors[id];
        interceptor.activate(8888);
    }

    public static shutdown() {
        shutdownInterceptors(Object.values(interceptors));
    }
}

function getConfig() {
    return {
        configPath: Paths.getDataDir(),
        authToken: undefined,
        https: {
            keyPath: Paths.keysDirAndSlash() + 'ca.private.key',
            certPath: Paths.certsDirAndSlash() + 'ca.pem',
            certContent: getCertContent(),
            keyLength: 2048,
        }
    }
}