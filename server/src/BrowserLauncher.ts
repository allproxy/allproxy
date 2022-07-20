import { buildInterceptors, Interceptor, shutdownInterceptors } from "./interceptors";
import Paths from "./Paths";
import { getAvailableBrowsers } from "./interceptors/browsers";
import { getCertContent } from "./GenerateCertKey";
import Launcher from "@httptoolkit/browser-launcher";
import { Dictionary } from "lodash";

let interceptors: Dictionary<Interceptor>;

export default class BrowserLauncher {
    public static async detect(): Promise<Launcher.Browser[]> {
        return new Promise((resolve) => {
            const config = getConfig();
            console.log(config);
            interceptors = buildInterceptors(config);
            console.log(interceptors);
            getAvailableBrowsers(config.configPath)
                .then((browsers) => {
                    console.log(browsers);
                    resolve(browsers);
                });
        });
    }

    public static launch(browser: Launcher.Browser) {
        const id = 'fresh-' + browser.type;
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