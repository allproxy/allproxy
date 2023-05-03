import { makeAutoObservable, action } from "mobx"
import { JSONFieldButtonsHeight } from "../components/JSONFieldButtons";
import { snapshotStore } from "./SnapshotStore";

export default class LayoutStore {
	private verticalLayout = true;

	public constructor() {
		makeAutoObservable(this);
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
		const height = this.verticalLayout ? `calc(${this.maxHeight()})`
			: unselected ? `0px` : `calc((${this.maxHeight()})/2)`;
		return { width, height };
	}

	public calcMaxHeight() {
		return `calc(${this.maxHeight()})`;
	}

	public calcMaxWidth() {
		return `calc(${this.maxWidth()})`;
	}

	private maxHeight = () => {
		const jsonFieldButtonsHeight = snapshotStore.getJsonFields(snapshotStore.getSelectedSnapshotName()).length > 0 ? JSONFieldButtonsHeight + 'px' : '0px';
		return `100vh - 4rem - ${jsonFieldButtonsHeight}`
	};

	private maxWidth = () => {
		return `100vw - 11rem`;
	}
}