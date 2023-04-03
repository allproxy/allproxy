import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";

export const JSON_FIELDS_DIR = 'jsonFields';
export const LOG_CATEGORY_DIR = 'logCategories';

export class JSONLogLabel {
	private dir = "";
	private name = "";
	private valid = true;

	public constructor(dir: string) {
		this.dir = dir;
		makeAutoObservable(this);
	}

	public getName() {
		return this.name;
	}

	@action public async setName(name: string) {
		const oldName = this.name;
		this.name = name;
		if (this.valid && oldName !== '') {
			await apFileSystem.deleteFile(this.dir + '/' + oldName);
		}

		this.valid = true;
		if (name != '') {
			try {
				// Verify that each sub-name is a valid key for an object
				for (const key of name.split('.')) {
					let obj: { [key: string]: string } = {}
					obj[key] = "";
				}
				await apFileSystem.writeFile(this.dir + '/' + name, name);
			} catch (e) {
				this.valid = false;
			}
		}
	}

	public isValidName() {
		return this.valid;
	}

	public getDir() {
		return this.dir;
	}
}

export default class JSONLogStore {
	private labelsMap: { [key: string]: JSONLogLabel[] } = {
		jsonFields: [],
		logCategories: []
	} // key=dir, value=label

	public constructor() {
		makeAutoObservable(this);
	}

	public async init() {
		this.labelsMap[JSON_FIELDS_DIR].splice(0, this.labelsMap[JSON_FIELDS_DIR].length);
		this.labelsMap[LOG_CATEGORY_DIR].splice(0, this.labelsMap[LOG_CATEGORY_DIR].length);

		apFileSystem.mkdir(JSON_FIELDS_DIR);
		const fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR);
		for (const fileName of fileNames) {
			const jsonField = new JSONLogLabel(JSON_FIELDS_DIR);
			jsonField.setName(fileName);
			this.labelsMap[JSON_FIELDS_DIR].push(jsonField);
		}

		apFileSystem.mkdir(LOG_CATEGORY_DIR);
		const categoryLabels = await apFileSystem.readDir(LOG_CATEGORY_DIR);
		for (const fileName of categoryLabels) {
			const label = new JSONLogLabel(LOG_CATEGORY_DIR);
			label.setName(fileName);
			this.labelsMap[LOG_CATEGORY_DIR].push(label);
		}
	}

	public getJSONLabels(dir: string) {
		return this.labelsMap[dir];
	}

	@action public extend(dir: string) {
		this.labelsMap[dir].unshift(new JSONLogLabel(dir));
	}

	@action public deleteEntry(index: number, dir: string) {
		const jsonField = this.labelsMap[dir][index];
		if (jsonField.getName() != "") {
			apFileSystem.deleteFile(jsonField.getDir() + '/' + jsonField.getName());
		}
		this.labelsMap[dir].splice(index, 1);
	}
}

export async function getJSONFields(dir: string): Promise<string[]> {
	const fileNames = await apFileSystem.readDir(dir);
	const name: string[] = [];
	for (const fileName of fileNames) {
		name.push(fileName);
	}
	return name;
}

export const jsonFieldsStore = new JSONLogStore();
