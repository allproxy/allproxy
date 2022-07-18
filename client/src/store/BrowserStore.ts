import { action, makeAutoObservable } from "mobx"
import { socketStore } from "./SocketStore";

export interface Browser {
	name: string,
	version: string,
	type: string,
	command: string
}

export default class BrowserStore {
	private browsers: Browser[] = [];

	public constructor() {
		makeAutoObservable(this);
		this.detectBrowsers();
	}

	@action private detectBrowsers() {
		socketStore.emitDetectBrowsers()
			.then((browsers) => {
				this.browsers = browsers.filter(browser => browser.name !== 'safari');
			})
	}

	public getBrowsers() {
		return this.browsers;
	}

	public launchBrowser(browser: Browser) {
		socketStore.emitLaunchBrowser(browser);
	}
}

export const browserStore = new BrowserStore();
