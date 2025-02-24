import { makeAutoObservable } from "mobx";
import GTag from "../GTag";

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
		GTag.initialize();
		makeAutoObservable(this);
	}

	public isGitHubPages() {
		const githubPagesTest = document.location.search && document.location.search.includes('pages.github');
		return githubPagesTest || document.location.hostname.includes('github.io') || document.location.hostname.includes('pages.github');
	}

	public getKind() {
		return this.app;
	}

	public getGitHubUrl() {
		switch (this.app) {
			case 'allproxy':
				return 'https://github.com/allproxy/allproxy';
			case 'mitmproxy':
				return 'https://github.com/allproxy/mitmproxy-ui';
			case 'jlogviewer':
				if (this.isGitHubPages()) {
					return 'https://' + document.location.hostname.replace('pages.', '') + '/' + document.location.pathname;
				} else {
					return 'https://github.com/allproxy/json-log-viewer';
				}
		}
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
		GTag.initialize();
	}

	public isLocalhost() {
		return document.location.host.startsWith('localhost');
	}
}

export const urlPathStore = new UrlPathStore();