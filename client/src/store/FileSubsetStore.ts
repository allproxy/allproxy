import { makeAutoObservable, action } from "mobx";

export const subsetFieldName = '_app';
export const timeFieldName = 'msg_timestamp';

export default class FileSubsetStore {
	private subsetList: { filterValue: string, fileSize: number, startTime: string, endTime: string }[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	@action public async init(fileName: string) {
		const { socketStore } = await import("./SocketStore");
		this.subsetList = await socketStore.emitGetSubsets(fileName, timeFieldName);
	}

	public getSubsets() {
		return this.subsetList;
	}

	@action public newSubset(subset: { filterValue: string, fileSize: number, startTime: string, endTime: string }) {
		this.subsetList.unshift(subset);
	}
}

export async function areSubsetsSupported(fileName: string) {
	const { socketStore } = await import("./SocketStore");
	const promise1 = socketStore.emitIsFileInDownloads(fileName);
	const promise2 = socketStore.emitJsonFieldExists(fileName, subsetFieldName);
	const promise3 = socketStore.emitJsonFieldExists(fileName, timeFieldName);
	const result = await promise1 && await promise2 && await promise3;
	return result;
}

export async function createNewSubset(fileName: string, filterValues: string[], timeFieldName: string) {
	const { socketStore } = await import("./SocketStore");
	const fileSize = await socketStore.emitNewSubset(fileName, subsetFieldName, filterValues, timeFieldName);
	return fileSize;
}
