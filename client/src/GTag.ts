import ReactGA from 'react-ga4';

export default class GTag {
    public static initialize() {
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

        setTimeout(() => {
            const doPageView = async () => {
                const { urlPathStore } = await import('./store/UrlPathStore');
                if (urlPathStore.isGitHubPages()) {
                    this.pageView('Package: Github Pages App');
                } else {
                    const { socketStore } = await import('./store/SocketStore');
                    const type = await socketStore.emitGetInstallType();
                    this.pageView('Package: ' + type);
                }
            };
            doPageView();
        }, 1000);
    }

    public static pageView(title: string) {
        if (!ReactGA.isInitialized) this.initialize();
        ReactGA.event('page_view', {
            page_title: title
        });
    }

    public static search(searchTerm: string) {
        if (!ReactGA.isInitialized) this.initialize();
        setTimeout(() => ReactGA.event('search', {
            search_term: searchTerm
        }));
    }

    public static exception(description: string, fatal: boolean) {
        if (!ReactGA.isInitialized) this.initialize();
        setTimeout(() => ReactGA.event('exception', {
            description, fatal
        }));
    }
}