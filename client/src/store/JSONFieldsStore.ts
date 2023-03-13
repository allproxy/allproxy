import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";

const JSON_FIELDS_DIR = 'jsonFields/';

export class JSONField {
	private enabled = true;
	private name = "";
	private valid = true;

	public constructor() {
		makeAutoObservable(this);
	}

	public isEnabled() {
		return this.enabled;
	}

	@action public setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	@action public async toggleEnabled() {
		this.enabled = !this.enabled;
		await apFileSystem.writeFile(JSON_FIELDS_DIR + this.name, this.enabled ? "true" : "false");
	}

	public getName() {
		return this.name;
	}

	@action public async setName(name: string) {
		if (this.valid && this.name !== '') {
			await apFileSystem.deleteFile(JSON_FIELDS_DIR + this.name);
			this.name = '';
		}

		this.valid = true;
		if (name != '') {
			try {
				// Verify that each sub-name is a valid key for an object
				for (const key of name.split('.')) {
					let obj: { [key: string]: string } = {}
					obj[key] = "";
				}
				await apFileSystem.writeFile(JSON_FIELDS_DIR + name, this.enabled ? "true" : "false");
			} catch (e) {
				this.valid = false;
			}
		}
		this.name = name;
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
			const enabled = await apFileSystem.readFile(JSON_FIELDS_DIR + fileName);
			console.log('init', enabled, fileName);
			jsonField.setName(fileName);
			jsonField.setEnabled(enabled === "true");
			this.jsonFields.push(jsonField);
		}
	}

	public getJSONFields() {
		return this.jsonFields;
	}

	public changed() {

	}

	@action public extend() {
		this.jsonFields.push(new JSONField());
	}

	@action public deleteEntry(index: number) {
		const jsonField = this.jsonFields[index];
		apFileSystem.rmdir(JSON_FIELDS_DIR + jsonField.getName());
		this.jsonFields.splice(index, 1);
	}
}

export async function getEnabledJSONFields(): Promise<string[]> {
	const fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR);
	const name: string[] = [];
	for (const fileName of fileNames) {
		const enabled = await apFileSystem.readFile(JSON_FIELDS_DIR + fileName);
		if (enabled) name.push(fileName);
	}
	return name;
}

export const jsonFieldsStore = new JSONFieldsStore();
