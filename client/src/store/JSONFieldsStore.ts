import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";

const JSON_FIELDS_DIR = 'jsonFields/';

export class JSONField {
	private name = "";
	private valid = true;

	public constructor() {
		makeAutoObservable(this);
	}

	public getName() {
		return this.name;
	}

	@action public async setName(name: string) {
		const oldName = this.name;
		this.name = name;
		if (this.valid && oldName !== '') {
			await apFileSystem.deleteFile(JSON_FIELDS_DIR + oldName);
		}

		this.valid = true;
		if (name != '') {
			try {
				// Verify that each sub-name is a valid key for an object
				for (const key of name.split('.')) {
					let obj: { [key: string]: string } = {}
					obj[key] = "";
				}
				await apFileSystem.writeFile(JSON_FIELDS_DIR + name, name);
			} catch (e) {
				this.valid = false;
			}
		}
	}

	public isValidName() {
		return this.valid;
	}
}

export default class JSONFieldsStore {
	private jsonFields: JSONField[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public async init() {
		this.jsonFields.splice(0, this.jsonFields.length);

		const fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR);
		for (const fileName of fileNames) {
			const jsonField = new JSONField();
			jsonField.setName(fileName);
			this.jsonFields.push(jsonField);
		}
	}

	public getJSONFields() {
		return this.jsonFields;
	}

	public changed() {

	}

	@action public extend() {
		this.jsonFields.unshift(new JSONField());
	}

	@action public deleteEntry(index: number) {
		const jsonField = this.jsonFields[index];
		if (jsonField.getName() != "") {
			apFileSystem.deleteFile(JSON_FIELDS_DIR + jsonField.getName());
		}
		this.jsonFields.splice(index, 1);
	}
}

export async function getJSONFields(): Promise<string[]> {
	const fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR);
	const name: string[] = [];
	for (const fileName of fileNames) {
		name.push(fileName);
	}
	return name;
}

export const jsonFieldsStore = new JSONFieldsStore();
