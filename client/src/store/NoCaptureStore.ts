import { makeAutoObservable, action } from "mobx"

const LOCAL_STORAGE = 'middleman-no-capture';

export default class NoCaptureStore {
	private clientList: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	@action public init() {
		const clientList = localStorage.getItem(LOCAL_STORAGE);
		if (clientList) {
			this.clientList = JSON.parse(clientList);
		} else {
			this.clientList = [];
		}
	}

	@action public save() {
		const clientList = this.clientList.filter(client => client.length > 0);
		localStorage.setItem(LOCAL_STORAGE, JSON.stringify(clientList));
	}

	public contains(client: string): boolean {
		return this.clientList.find(name => name.toLocaleLowerCase() === client.toLocaleLowerCase()) === undefined;
	}

	public getClientList() {
		return this.clientList;
	}

	@action public extend() {
		this.clientList.push('');
	}

	@action public deleteEntry(index: number) {
		this.clientList.splice(index, 1);
	}

	@action public updateEntry(index: number, value: string) {
		this.clientList[index] = value;
	}
 }

export const noCaptureStore = new NoCaptureStore();
