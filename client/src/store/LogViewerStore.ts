import { makeAutoObservable } from "mobx";

export default class LogViewerStore {
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
}

export const logViewerStore = new LogViewerStore();