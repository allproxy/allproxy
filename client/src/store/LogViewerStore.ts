import { makeAutoObservable } from "mobx";

export default class LogViewerStore {
	private logViewer = false;


	public constructor() {
		this.logViewer = document.location.pathname === '/logviewer' || document.location.pathname === '/jlogviewer';
		makeAutoObservable(this);
	}

	public isLogViewer() {
		return this.logViewer;
	}
}

export const logViewerStore = new LogViewerStore();