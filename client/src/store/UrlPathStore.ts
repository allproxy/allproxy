import { makeAutoObservable } from "mobx";

export default class UrlPathStore {
	private logViewer = false;


	public constructor() {
		this.logViewer = document.location.pathname === '/jlogviewer';
		makeAutoObservable(this);
	}

	public isLogViewer() {
		return this.logViewer;
	}

	public toggleApp() {
		document.location.pathname = document.location.pathname === '/jlogviewer' ? '/allproxy' : '/jlogviewer';
	}

	public isLocalhost() {
		return document.location.host.startsWith('localhost');
	}
}

export const urlPathStore = new UrlPathStore();