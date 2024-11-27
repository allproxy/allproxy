import { createTheme } from "@material-ui/core";
import { makeAutoObservable, action } from "mobx";

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

	public getThemeProvider() {
		const p = createTheme({
			palette: {
				type: this.theme
			},
		});
		console.log(p);
		return p;
	}
}

export const themeStore = new DarkModeStore();