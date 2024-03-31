import { makeAutoObservable, action } from "mobx";
import { apFileSystem } from "./APFileSystem";
import { messageQueueStore } from "./MessageQueueStore";
import { compressJSON } from "./MainTabStore";
import { filterStore } from "./FilterStore";
import { urlPathStore } from "./UrlPathStore";

export const JSON_FIELDS_DIR = 'jsonFields';
export const SCRIPTS_DIR = 'scripts';
const jsonLogScriptFileName = 'jsonLogScript';
const BRIEF_JSON_FIELDS_FILE = 'briefJsonFields.json';

export type JsonField = { name: string; value: string | number | boolean }

export class JSONLogField {
	private dir = "";
	private name = "";
	private valid = true;

	public constructor(dir: string) {
		this.dir = dir;
		makeAutoObservable(this);
	}

	public shouldShowWnenBriefChecked() {
		const checked = jsonLogStore.getBriefMap()[this.name] === true;
		return checked;
	}
	@action public async toggleBriefChecked() {
		const briefMap = jsonLogStore.getBriefMap();
		if (briefMap[this.name] === true) {
			delete briefMap[this.name];
		} else {
			briefMap[this.name] = true;
		}
		await apFileSystem.writeFile(BRIEF_JSON_FIELDS_FILE, JSON.stringify(briefMap));
	}

	public getName() {
		return this.name;
	}

	@action public async setNameAndValidate(name: string) {
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
					let obj: { [key: string]: string } = {};
					obj[key] = "";
				}
				const dup = await apFileSystem.exists(this.dir + '/' + name);
				if (!dup) {
					await apFileSystem.writeFile(this.dir + '/' + name, name);
				} else {
					this.valid = false;
				}
			} catch (e) {
				this.valid = false;
			}
		}
	}

	@action public setName(name: string) {
		this.name = name;
	}

	public isValidName() {
		return this.valid;
	}

	public getDir() {
		return this.dir;
	}
}

export const defaultScript =
	`
	// Function called to extract date, level, app name and message
	//
	// @param preJSONString: string - optional non-JSON string proceeding JSON object
	// @param jsonObject: {} - JSON log data
	// @returns {date: Date, level: string, category: string, appName: string, message: string, additionalJSON: {} }
	//
	// category is the availability zone, processor...
	// appName is the pod name, process ID...
	//
	const jsonLogScript = function (preJSONString, jsonObject) {
		let date = new Date();
		let level = 'info';
		let category = 'My-Category';
		let appName = 'My-App';
		let message = 'This is a test message';
		let additionalJSON = {};
		return { date, level, category, appName, message, additionalJSON };
	}
`;

export type LogEntry = {
	date: Date,
	level: string,
	category: string,
	appName: string,
	message: string,
	rawLine: string,
	additionalJSON: {}
};

export type SimpleFields = {
	date: string,
	level: string,
	category: string,
	appName: string,
	message: string,
	rawLine: string,
}

export default class JSONLogStore {
	private method: 'auto' | 'simple' | 'advanced' = 'simple';

	private autoFields: SimpleFields = { date: '', level: '', category: '', appName: '', message: '', rawLine: '' };
	private autoMaxFieldLevel: 1 | 2 = 1;
	private simpleFields: SimpleFields = { date: '', level: '', category: '', appName: '', message: '', rawLine: '' };

	private briefChecked = false;
	private briefMap: { [key: string]: boolean } = {};

	private rawJsonChecked = false;
	private showUtcChecked = false;

	private script = defaultScript;

	private scriptFunc = (_logEntry: string, _logentryJson: object) => {
		return { date: new Date(), level: '', category: '', appName: '', message: '', rawLine: '', additionalJSON: {} };
	};

	private fields: JSONLogField[] = [];

	private hiddenFields: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public getParsingMethod() { return this.method; }
	public async setParsingMethod(method: 'auto' | 'simple' | 'advanced') {
		this.method = method;
		await apFileSystem.writeFile(SCRIPTS_DIR + '/method', method);
	}

	public getAutoFields() { return this.autoFields; }
	public async setAutoFields(field: 'date' | 'level' | 'category' | 'appName' | 'message' | 'rawLine', value: string) {
		this.autoFields[field] = value;
	}

	public getAutoMaxFieldLevel() { return this.autoMaxFieldLevel; }
	public setAutoMaxFieldLevel(level: 1 | 2) { this.autoMaxFieldLevel = level; }

	public getSimpleFields() { return this.simpleFields; }
	public async setSimpleFields(field: 'date' | 'level' | 'category' | 'appName' | 'message' | 'rawLine', value: string) {
		const oldValue = this.simpleFields[field];
		this.simpleFields[field] = value;
		if (oldValue !== '') {
			await apFileSystem.deleteFile(SCRIPTS_DIR + '/' + field);
		}
		await apFileSystem.writeFile(SCRIPTS_DIR + '/' + field, value);
	}

	public isFieldHidden(field: string): boolean {
		return this.hiddenFields.includes(field);
	}
	public toggleHiddenField(field: string) {
		const i = this.hiddenFields.indexOf(field);
		if (i === -1) {
			this.hiddenFields.push(field);
		} else {
			this.hiddenFields.splice(i, 1);
		}
	}

	public isBriefChecked() {
		return this.briefChecked;
	}
	@action public toggleBriefChecked() {
		this.briefChecked = !this.briefChecked;
		filterStore.filterUpdated();
	}
	public getBriefMap() {
		return this.briefMap;
	}
	public isBriefField(name: string) {
		return this.briefMap[name] === true;
	}

	public isRawJsonChecked() {
		return this.rawJsonChecked;
	}
	@action public toggleRawJsonChecked() {
		this.rawJsonChecked = !this.rawJsonChecked;
		filterStore.filterUpdated();
	}

	public isShowUtcChecked() {
		return this.showUtcChecked;
	}
	@action public toggleShowUtcChecked() {
		this.showUtcChecked = !this.showUtcChecked;
		filterStore.filterUpdated();
	}

	@action public async resetScriptToDefault() {
		this.script = defaultScript;
		await apFileSystem.deleteFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName);
	}
	public getScript() {
		return this.script;
	}
	@action public setScript(script: string) {
		this.script = script;
	}
	@action public async saveScript() {
		await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, this.script);
	}
	@action public updateScriptFunc() {
		this.scriptFunc = this.evalScript(this.script);
	}

	private parseDate(value: string | number): Date | undefined {
		let date: Date | undefined = undefined;
		try {
			date = new Date(value);
			if (date.toString() === 'Invalid Date' && typeof value === 'string') {
				const tokens = value.split(':', 2);
				if (tokens.length === 2) {
					let d = new Date(tokens[0]);
					date = new Date(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ':' + tokens[1]);
				}
			}
		} catch (e) {
		}
		return date;
	}

	@action public extractJSONFields(nonJson: string,
		jsonData: { [key: string]: any },
		method: 'auto' | 'simple' | 'advanced'
	): LogEntry {

		const setAutoField = (field: 'date' | 'level' | 'category' | 'appName' | 'message' | 'rawLine') => {
			if (this.getAutoFields()[field].length === 0) {
				if (field === 'date') {
					let dateKey = '';
					for (const key in jsonData) {
						const keyLc = key.toLowerCase();
						if (keyLc.indexOf('time') !== -1 || keyLc.indexOf('date') !== -1) {
							const value = jsonData[key];
							if (typeof value === 'string' || typeof value === 'number') {
								const date = this.parseDate(value);
								if (date) {
									dateKey = key;
									break;
								}
							}
						}
					}
					this.setAutoFields(field, dateKey);
				} else if (field === 'level') {
					let levelKey = '';
					for (const key in jsonData) {
						const keyLc = key.toLowerCase();
						if (keyLc === 'level' || keyLc === 'severity') {
							levelKey = key;
							break;
						}
					}
					this.setAutoFields(field, levelKey);
				} else if (field === 'message') {
					let messageKey = '';
					for (const key in jsonData) {
						const keyLc = key.toLowerCase();
						if (keyLc === 'message' || keyLc === 'msg') {
							messageKey = key;
							break;
						}
					}
					this.setAutoFields(field, messageKey);
				} else {
					this.setAutoFields(field, field);
				}
			}

			const key = this.getAutoFields()[field];
			if (key.length !== 0) {
				const value = jsonData[key];
				if (field === 'date') {
					const date = this.parseDate(value);
					if (date) {
						logEntry.date = date;
					}
				} else {
					if (value) {
						logEntry[field] = jsonData[key];
					}
				}
			}
		};

		let logEntry: LogEntry = { date: new Date(), level: '', category: '', appName: '', message: '', rawLine: '', additionalJSON: {} };
		switch (method) {
			case 'auto':
				setAutoField('date');
				setAutoField('level');
				setAutoField('category');
				setAutoField('appName');
				setAutoField('message');
				logEntry.rawLine = JSON.stringify(jsonData);
				break;
			case 'simple':
				const simpleFields = jsonLogStore.getSimpleFields();
				if (simpleFields.date !== '') {
					const value = getJSONValue(jsonData, simpleFields.date);
					if (typeof value === 'string') {
						const date = this.parseDate(value);
						if (date) {
							logEntry.date = date;
						}
					}
				}
				const setField = (field: 'level' | 'category' | 'appName' | 'message' | 'rawLine') => {
					if (simpleFields[field] !== '') {
						const value = getJSONValue(jsonData, simpleFields[field]);
						if (typeof value === 'string' || typeof value === 'number') {
							logEntry[field] = value + '';
						}
					}
				};
				setField('level');
				setField('category');
				setField('appName');
				setField('message');
				logEntry.rawLine = JSON.stringify(jsonData);
				break;
			case 'advanced':
				try {
					logEntry = this.scriptFunc(nonJson, jsonData);
				} catch (e) {
					console.log(e);
				}
				if (logEntry.date === undefined) logEntry.date = new Date();
				if (logEntry.level === undefined) logEntry.level = '';
				if (logEntry.category === undefined) logEntry.category = '';
				if (logEntry.appName === undefined) logEntry.appName = 'appName is required';
				if (logEntry.message === undefined) logEntry.message = '';
				if (logEntry.rawLine === undefined) logEntry.rawLine = JSON.stringify(jsonData);
				break;
		}
		if (typeof logEntry.level === 'number') logEntry.level = logEntry.level + '';
		return logEntry;
	}

	public evalScript(script: string) {
		let scriptNoComments = '';
		for (const line of script.split('\n')) {
			const lineTrim = line.trim();
			if (lineTrim.length > 0 && !lineTrim.startsWith('//')) {
				scriptNoComments += line;
			}
		}
		const i = scriptNoComments.indexOf('function');
		const func = scriptNoComments.substring(i);
		let f = this.scriptFunc;
		eval('f = ' + func);
		return f;
	}

	public async init() {
		if (await apFileSystem.exists(BRIEF_JSON_FIELDS_FILE)) {
			const briefJsonFields = await apFileSystem.readFile(BRIEF_JSON_FIELDS_FILE);
			if (briefJsonFields.length > 0) {
				this.briefMap = JSON.parse(briefJsonFields);
			}
		} else if (!urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages()) {
			if (await apFileSystem.exists(BRIEF_JSON_FIELDS_FILE, 'serverFs')) {
				const briefJsonFields = await apFileSystem.readFile(BRIEF_JSON_FIELDS_FILE, 'serverFs');
				if (briefJsonFields.length > 0) {
					this.briefMap = JSON.parse(briefJsonFields);
					await apFileSystem.writeFile(BRIEF_JSON_FIELDS_FILE, briefJsonFields);
				}
			}
		}

		let fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR);
		if (fileNames.length === 0 && !urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages()) {
			fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR, 'serverFs');
			for (const fileName of fileNames) {
				await apFileSystem.writeFile(JSON_FIELDS_DIR + '/' + fileName, fileName);
			}
		}
		this.fields = [];
		for (const fileName of fileNames) {
			const jsonField = new JSONLogField(JSON_FIELDS_DIR);
			jsonField.setName(fileName);
			this.fields.push(jsonField);
			this.fields.sort((a, b) => a.getName().localeCompare(b.getName()));
		}

		if (await apFileSystem.exists(SCRIPTS_DIR + '/' + jsonLogScriptFileName)) {
			this.script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName);
		}
		if (!urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages() && this.script === defaultScript) {
			if (await apFileSystem.exists(SCRIPTS_DIR + '/' + jsonLogScriptFileName, 'serverFs')) {
				this.script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, 'serverFs');
				await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, this.script);
			}
		}

		const initSimpleField = async (field: 'date' | 'level' | 'category' | 'appName' | 'message' | 'rawLine') => {
			const exists = await apFileSystem.exists(SCRIPTS_DIR + '/' + field);
			if (exists) {
				this.simpleFields[field] = await apFileSystem.readFile(SCRIPTS_DIR + '/' + field);
			} else if (!urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages()) {
				const exists = await apFileSystem.exists(SCRIPTS_DIR + '/' + field, 'serverFs');
				if (exists) {
					this.simpleFields[field] = await apFileSystem.readFile(SCRIPTS_DIR + '/' + field, 'serverFs');
					await apFileSystem.writeFile(SCRIPTS_DIR + '/' + field, this.simpleFields[field]);
				}
			}
		};
		initSimpleField('date');
		initSimpleField('level');
		initSimpleField('category');
		initSimpleField('appName');
		initSimpleField('message');

		const exists = await apFileSystem.exists(SCRIPTS_DIR + '/method');
		if (exists) {
			const method = await apFileSystem.readFile(SCRIPTS_DIR + '/method') as 'auto' | 'simple' | 'advanced';
			if (method) {
				this.method = method;
			}
		} else if (!urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages()) {
			const exists = await apFileSystem.exists(SCRIPTS_DIR + '/method', 'serverFs');
			if (exists) {
				const method = await apFileSystem.readFile(SCRIPTS_DIR + '/method', 'serverFs') as 'auto' | 'simple' | 'advanced';
				if (method) {
					this.method = method;
					await apFileSystem.writeFile(SCRIPTS_DIR + '/method', method);
				}
			}
		}
	}

	public getJSONFields() {
		return this.fields;
	}

	@action public setJSONFieldNames(fields: string) {
		for (; this.fields.length > 0;) {
			const field = this.fields.pop();
			if (field) field.setNameAndValidate(''); // Delete
		}
		this.fields.splice(0, this.fields.length);
		for (const field of fields.split('\n')) {
			const newField = new JSONLogField(JSON_FIELDS_DIR);
			newField.setNameAndValidate(field); // Create
			this.fields.push(newField);
		}
	}

	public getJSONFieldNames(): string[] {
		return this.fields.map(field => field.getName());
	}

	@action public extend() {
		this.fields.unshift(new JSONLogField(JSON_FIELDS_DIR));
	}

	@action public async deleteEntry(index: number) {
		const jsonField = this.fields[index];
		if (jsonField.getName() !== "") {
			await apFileSystem.deleteFile(jsonField.getDir() + '/' + jsonField.getName());
		}
		this.fields.splice(index, 1);
	}
}

export async function updateJSONRequestLabels() {
	const messages = messageQueueStore.getMessages();
	const copy = messages.slice();
	messages.splice(0, messages.length);
	for (const message of copy) message.updateJsonLog();
	messages.push(...copy);
}

export function formatJSONRequestLabels(json: { [key: string]: any }, jsonSearchFields: string[], customJsonFields: string[]): JsonField[] {
	const jsonFields: JsonField[] = [];
	const fields = jsonSearchFields.concat(customJsonFields);
	fields.forEach((field) => {
		if (Object.keys(json).length > 0) {
			let value = getJSONValue(json, field);
			if (value === undefined) return;

			if (field !== 'PREFIX') {
				field = field.replaceAll('[.]', '.');
				if (typeof value === 'string') {
					value = formatValue(field, value);
				}
				jsonFields.push({ name: field, value: value });
			}
		}
	});

	return jsonFields;
}

export function getJSONValue(json: { [key: string]: any }, field: string): undefined | string | number | boolean {
	if (json && Object.keys(json).length > 0) {
		let value: string | number | undefined = undefined;
		value = eval('json');
		if (value !== undefined) {
			const parts = field.replaceAll('[.]', '[period]').split('.');
			for (let key of parts) {
				key = key.replaceAll('[period]', '.');
				const keys: string[] = [key];
				if (parts.length === 1) {
					const keyLowercase = key.toLowerCase();
					const keyUppercase = key.toUpperCase();
					if (key === keyLowercase) {
						keys.push(key.substring(0, 1).toUpperCase() + keyLowercase.substring(1));
					} else {
						keys.push(keyLowercase);
					}
					if (key !== keyUppercase) {
						keys.push(keyUppercase);
					}
				}

				let found = false;
				for (const k of keys) {
					let value2;
					try {
						// Array?
						if (k.endsWith(']')) {
							value2 = eval(`value.${k}`);
						} else {
							value2 = eval(`value["${k}"]`);
						}
					} catch (e) { }
					if (value2 !== undefined) {
						value = value2;
						found = true;
						break;
					}
				}
				if (!found) {
					value = undefined;
					break;
				}
			}
		}
		if (typeof value === 'object') {
			value = compressJSON(value);
		}
		if (value === undefined || (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')) return undefined;
		else return value;
	}
	return undefined;
}

function formatValue(_name: string, value: string): string {
	// const lname = name.toLowerCase();
	// if (lname.indexOf('useragent') !== -1) {
	// 	return value.split(' ')[0].split('/')[0];
	// } else if (lname.indexOf('uri') !== -1 || lname.indexOf('url') !== -1) {
	// 	try {
	// 		const url = new URL(value);
	// 		return url.pathname;
	// 	} catch (e) {
	// 		return value;
	// 	}
	// }
	// Remove double quotes
	if (value.charAt(0) === '"') {
		value = value.substring(1);
	}
	if (value.charAt(value.length - 1) === '"') {
		value = value.substring(0, value.length - 1);
	}
	return value;
}

export function getJsonFieldValues(fields: string[]): string[] {
	const outputValues: string[] = [];
	type Values = string[];
	const valueArray: Values[] = [];
	for (const messageStore of messageQueueStore.getMessages()) {
		if (messageStore.isFiltered()) continue;
		const message = messageStore.getMessage();
		let json: { [key: string]: string } = {};
		if (typeof message.responseBody === 'string') {
			json = messageStore.getLogEntry().additionalJSON;
		} else {
			json = {
				...messageStore.getLogEntry().additionalJSON,
				...message.responseBody
			};
		}

		const values: Values = [];
		for (const field of fields) {
			if (field === 'Time') {
				if (jsonLogStore.isShowUtcChecked()) {
					values.push(messageStore.getLogEntry().date.toISOString().split('T')[1]);
				} else {
					values.push(messageStore.getLogEntry().date.toTimeString().split(' ')[0]);
				}
			} else if (field === 'Level') {
				values.push(messageStore.getLogEntry().level);
			} else if (field === 'Message') {
				values.push(messageStore.getLogEntry().message);
			} else {
				let value = getJSONValue(json, field);
				if (value === undefined) {
					values.push('');
				} else {
					values.push(value + '');
				}
			}
		}
		if (values.join('').length > 0) {
			valueArray.push(values);
		}
	}
	if (valueArray.length > 0) {
		valueArray.unshift([...fields]);
		const lenOfFields: number[] = [];
		for (let i = 0; i < fields.length; ++i)	lenOfFields[i] = 0;
		for (const values of valueArray) {
			for (let i = 0; i < values.length; ++i) {
				lenOfFields[i] = Math.max(lenOfFields[i], values[i].length);
			}
		}
		for (const values of valueArray) {
			let value = '';
			for (let i = 0; i < values.length; ++i) {
				if (i > 0) value += ' ';
				value += values[i] + ' '.repeat(lenOfFields[i] - values[i].length + 1);
			}
			outputValues.push(value);
		}
	}

	if (outputValues.length === 0) {
		outputValues.push('No matching JSON field found.');
	}
	return outputValues;
}

export const jsonLogStore = new JSONLogStore();
