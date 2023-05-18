import { makeAutoObservable, action } from "mobx"

export default class DarkModeStore {
	private theme: 'dark' | 'light' = 'light';


	public constructor() {
		makeAutoObservable(this);
	}

	public getTheme() {
		return this.theme;
	}

	@action public setTheme(theme: 'dark' | 'light') {
		this.theme = theme;
	}
}

export const themeStore = new DarkModeStore();