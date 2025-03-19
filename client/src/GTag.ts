import ReactGA from 'react-ga4';

export default class GTag {
    public static initialize() {

        GTag.doInit();

        setTimeout(() => {
            async function doPageView() {
                const { urlPathStore } = await import('./store/UrlPathStore');
                if (urlPathStore.isGitHubPages()) {
                    GTag.pageView('Package: Github Pages App');
                } else {
                    const { socketStore } = await import('./store/SocketStore');
                    const type = await socketStore.emitGetInstallType();
                    GTag.pageView('Package: ' + type);
                }
            }
            doPageView();

            // Initialize gtag once every hour
            setInterval(() => {
                GTag.doInit();
                GTag.pageView('Initializing GTAG every hour');
            }, 1000 * 60 * 60);
        }, 1000);
    }

    private static doInit() {
        const path = document.location.pathname;
        if (path.includes('jsonlogs')) {
            ReactGA.initialize('G-K9M5MG60BK');
        } else if (path.includes('json-log-viewer') || path.includes('jlogviewer')) {
            ReactGA.initialize('G-LXBMLPXTGQ');
        } else if (path.includes('mitmproxy')) {
            ReactGA.initialize('G-JBBB8K7GRR');
        } else {
            ReactGA.initialize('G-H1NDQRZW8J');
        }
    }

    public static pageView(title: string) {
        setTimeout(() => ReactGA.event('page_view', {
            page_title: process.env.REACT_APP_VERSION + ' ' + title
        }));
    }

    public static search(searchTerm: string) {
        setTimeout(() => ReactGA.event('search', {
            search_term: searchTerm
        }));
    }

    public static exception(description: string, fatal: boolean) {
        setTimeout(() => ReactGA.event('exception', {
            description, fatal
        }));
    }
}