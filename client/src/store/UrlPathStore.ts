import { makeAutoObservable } from "mobx";

export default class UrlPathStore {
	private app: 'allproxy' | 'mitmproxy' | 'jlogviewer' = 'allproxy';


	public constructor() {
		if (this.isGitHubPages()) {
			this.app = 'jlogviewer';
		} else {
			switch (document.location.pathname) {
				case '/jlogviewer':
					this.app = 'jlogviewer';
					break;
				case '/mitmproxy':
					this.app = 'mitmproxy';
					break;
				default:
					this.app = 'allproxy';
					break;
			}
		}
		makeAutoObservable(this);
	}

	public isGitHubPages() {
		return document.location.hostname.includes('github.io') || document.location.hostname.includes('pages.github');
	}

	public getApp() {
		return this.app;
	}

	public setApp(app: 'allproxy' | 'mitmproxy' | 'jlogviewer') {
		switch (app) {
			case 'jlogviewer':
				document.location.pathname = '/jlogviewer';
				break;
			case 'mitmproxy':
				document.location.pathname = '/mitmproxy';
				break;
			default:
				document.location.pathname = '/allproxy';
				break;
		}
	}

	public isLocalhost() {
		return document.location.host.startsWith('localhost');
	}
}

export const urlPathStore = new UrlPathStore();