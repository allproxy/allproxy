import { makeAutoObservable, action } from "mobx";
import { apFileSystem } from "./APFileSystem";
import { messageQueueStore } from "./MessageQueueStore";
import { snapshotStore } from "./SnapshotStore";
import { filterStore } from "./FilterStore";

export const JSON_FIELDS_DIR = 'jsonFields';
export const SCRIPTS_DIR = 'scripts';
const jsonLogScriptFileName = 'jsonLogScript';

export type JsonField = { name: string; value: string | number | boolean }

export class JSONLogField {
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

const defaultScript =
	`
	// Function called to extract date, level, app name and message
	//
	// @param preJSONString: string - optional non-JSON string proceeding JSON object
	// @param jsonObject: {} - JSON log data
	// @returns {date: Date, level: string, appName: string, message: string, additionalJSON: {} }
	//
	// appName is the pod name, process ID...
	//
	const jsonLogScript = function (preJSONString, jsonObject) {
		let date = new Date();
		let level = 'info';
		let appName = 'My-App';
		let message = 'This is a test message';
		let additionalJSON = {};
		return { date, level, appName, message, additionalJSON };
	}
`;

export type LogEntry = {
	date: Date,
	level: string,
	appName: string,
	message: string,
	additionalJSON: {}
};

export type SimpleFields = {
	date: string,
	level: string,
	appName: string,
	message: string
}

export default class JSONLogStore {
	private method: 'simple' | 'advanced' = 'simple';

	private simpleFields: SimpleFields = { date: '', level: '', appName: '', message: '' };

	private script = defaultScript;

	private scriptFunc = (_logEntry: string, _logentryJson: object) => { return { date: new Date(), level: '', appName: '', message: '', additionalJSON: {} }; };

	private fields: JSONLogField[] = [];

	private hiddenFields: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public getMethod() { return this.method; }
	public async setMethod(method: 'simple' | 'advanced') {
		this.method = method;
		await apFileSystem.writeFile(SCRIPTS_DIR + '/method', method);
	}

	public getSimpleFields() { return this.simpleFields; }
	public async setSimpleFields(field: 'date' | 'level' | 'appName' | 'message', value: string) {
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

	@action public resetScriptToDefault() {
		this.script = defaultScript;
		apFileSystem.deleteFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName);
	}
	public getScript() {
		return this.script;
	}
	@action public setScript(script: string) {
		this.script = script;
	}
	public saveScript() {
		apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, this.script);
	}
	public updateScriptFunc() {
		this.scriptFunc = this.evalScript(this.script);
	}
	public extractJSONFields(nonJson: string, jsonData: {
		[key: string]: any
	}): LogEntry {
		let logEntry: LogEntry = { date: new Date(), level: '', appName: '', message: '', additionalJSON: {} };
		if (jsonLogStore.getMethod() === 'simple') {
			const simpleFields = jsonLogStore.getSimpleFields();
			if (simpleFields.date !== '') {
				try {
					logEntry.date = new Date(simpleFields.date);
				} catch (e) { }
			}
			const setField = (field: 'level' | 'appName' | 'message') => {
				if (simpleFields[field] !== '') {
					const value = jsonData[simpleFields[field]] as string | undefined;
					if (value) {
						logEntry[field] = value;
					}
				}
			};
			setField('level');
			setField('appName');
			setField('message');

		} else {
			try {
				logEntry = this.scriptFunc(nonJson, jsonData);
			} catch (e) {
				console.log(e);
			}
			if (logEntry.date === undefined) logEntry.date = new Date();
			if (logEntry.level === undefined) logEntry.level = '';
			if (logEntry.appName === undefined) logEntry.appName = 'App_name_not_defined?';
			if (logEntry.message === undefined) logEntry.message = '';
		}
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
		const fileNames = await apFileSystem.readDir(JSON_FIELDS_DIR);
		this.fields = [];
		for (const fileName of fileNames) {
			const jsonField = new JSONLogField(JSON_FIELDS_DIR);
			jsonField.setName(fileName);
			this.fields.push(jsonField);
			this.fields.sort((a, b) => a.getName().localeCompare(b.getName()));
		}

		for (const fileName of await apFileSystem.readDir(SCRIPTS_DIR)) {
			const script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + fileName);
			switch (fileName) {
				case jsonLogScriptFileName:
					this.script = script;
					break;
			}
		}

		const initSimpleField = async (field: 'date' | 'level' | 'appName' | 'message') => {
			const exists = await apFileSystem.exists(SCRIPTS_DIR + '/' + field);
			if (exists) {
				this.simpleFields[field] = await apFileSystem.readFile(SCRIPTS_DIR + '/' + field);
			}
		};
		initSimpleField('date');
		initSimpleField('level');
		initSimpleField('appName');
		initSimpleField('message');

		const exists = await apFileSystem.exists(SCRIPTS_DIR + '/method');
		if (exists) {
			this.method = await apFileSystem.readFile(SCRIPTS_DIR + '/method') as 'simple' | 'advanced';
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

	@action public deleteEntry(index: number) {
		const jsonField = this.fields[index];
		if (jsonField.getName() != "") {
			apFileSystem.deleteFile(jsonField.getDir() + '/' + jsonField.getName());
		}
		this.fields.splice(index, 1);
	}
}

export async function updateJSONRequestLabels() {
	const selectedFields = snapshotStore.getJsonFields(snapshotStore.getSelectedSnapshotName());
	snapshotStore.setJsonFields(snapshotStore.getSelectedSnapshotName(), selectedFields);
	const messages = messageQueueStore.getMessages();
	const copy = messages.slice();
	messages.splice(0, messages.length);
	for (const message of copy) message.updateJsonLog();
	messages.push(...copy);
}

export function formatJSONRequestLabels(json: { [key: string]: any }, primaryJsonFields: string[], customJsonFields: string[]): JsonField[] {
	const jsonFields: JsonField[] = [];
	const fields = primaryJsonFields.concat(customJsonFields);
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
	if (Object.keys(json).length > 0) {
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
		if (value === undefined || (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')) return undefined;
		else return value;
	}
	return undefined;
}

function formatValue(name: string, value: string): string {
	const lname = name.toLowerCase();
	if (lname.indexOf('useragent') !== -1) {
		return value.split(' ')[0].split('/')[0];
	} else if (lname.indexOf('uri') !== -1 || lname.indexOf('url') !== -1) {
		try {
			const url = new URL(value);
			return url.pathname;
		} catch (e) {
			return value;
		}
	}
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
		if (filterStore.isFiltered(messageStore)) continue;
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
				values.push(messageStore.getLogEntry().date.toTimeString().split(' ')[0]);
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
