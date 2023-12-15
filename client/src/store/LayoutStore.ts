import { makeAutoObservable, action } from "mobx";
import { JSONFieldButtonsHeight } from "../components/JSONFieldButtons";
import { mainTabStore } from "./MainTabStore";

export default class LayoutStore {
	private verticalLayout = true;
	private nowrap = false;

	public constructor() {
		makeAutoObservable(this);
	}

	public isNowrap() {
		return this.nowrap;
	}
	@action toggleNowrap() {
		this.nowrap = !this.nowrap;
	}

	public isVertical() {
		return this.verticalLayout;
	}
	@action public setVertical(verticalLayout: boolean) {
		this.verticalLayout = verticalLayout;
	}

	@action public toggleVertical() {
		this.verticalLayout = !this.verticalLayout;
	}

	public flexDirection() {
		return this.verticalLayout ? 'row' : 'column';
	}

	public requestContainer(unselected: boolean) {
		const width = this.verticalLayout && !unselected ? `calc((${this.maxWidth()})/2)` : `calc(${this.maxWidth()})`;
		const height = this.verticalLayout ? `calc(${this.maxHeight()})`
			: unselected ? `calc(${this.maxHeight()})` : `calc((${this.maxHeight()})/2)`;
		return { width, height };
	}

	public responseContainer(unselected: boolean) {
		const width = unselected ? '0px' : this.verticalLayout ? `calc((${this.maxWidth()})/2)` : `calc(${this.maxWidth()})`;
		const deltaHeight = '1rem'; //this.verticalLayout ? '6rem' : '11rem';
		const height = this.verticalLayout ? `calc(${this.maxHeight()} - ${deltaHeight})`
			: unselected ? `0px` : `calc((${this.maxHeight()} - ${deltaHeight})/2)`;
		return { width, height };
	}

	public calcMaxHeight() {
		return `calc(${this.maxHeight()})`;
	}

	public calcMaxWidth() {
		return `calc(${this.maxWidth()})`;
	}

	private maxHeight = () => {
		const jsonFieldButtonsHeight = mainTabStore.getJsonFields(mainTabStore.getSelectedTabName()).length > 0 ? JSONFieldButtonsHeight + 'px' : '0px';
		return `100vh - 9rem - ${jsonFieldButtonsHeight}`;
	};

	private maxWidth = () => {
		return `100vw - 13rem`; // must match App.css side-bar {width: 13rem;}
	}
}