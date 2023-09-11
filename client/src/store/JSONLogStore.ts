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
// Sample function used to extract level category and message from log entry
// @param nonJson: string - non-JSON string
// @param jsonData: {} - JSON data
// @returns {date: <Date>, level: "error | warn | info", category: "category...",n message: "message...", additionalJSON: {}}
function(nonJson, jsonData) {
    let date = new Date();
    let level = jsonData && jsonData.level ? jsonData.level : 'info';
    let category = '';
    let message = '';
    if (jsonData.MESSAGE) message = jsonData.MESSAGE;
    else if (jsonData.message) message = jsonData.message;
    else if (jsonData.msg) message = jsonData.msg;

    function parsePod(pod) {
        const podParts = pod.split('-');
        if (podParts.length > 1) {
            podParts.pop();
        }
        return podParts.join('-');
    }

    if (jsonData._file) {
        if (jsonData.msg_timestamp) {
            date = new Date(jsonData.msg_timestamp);
        } else if (jsonData._ts) {
            date = new Date(jsonData._ts);
        }

        if (jsonData.pod) {
            category = parsePod(jsonData.pod);
        } else if (jsonData._file) {
            if (jsonData._host) {
                category = jsonData._host + ' ';
            }
            category += parsePod(jsonData._file);
        }
    } else {
        const tokens = nonJson.split(' ', 5);
        if (tokens.length >= 3) {
            date = new Date(tokens.slice(0, 3).join(' '));
        }
        if (jsonData.msg_timestamp) {
            date = new Date(jsonData.msg_timestamp);
        } else if (jsonData._ts) {
            date = new Date(jsonData._ts);
        }
        if (tokens.length >= 4) {
            let pod = tokens[3];
            if (pod.startsWith('mzone')) {
                if (tokens.length >= 5) {
                    pod = tokens[4];
                    category = tokens[3] + ' ';
                }
            }
            category += parsePod(pod);
        }
    }
    if (jsonData.Worker !== undefined) {
        category += ' worker' + jsonData.Worker;
    }

    let additionalJSON = {};

    if (Object.keys(jsonData).length === 0) {
        const i = nonJson.indexOf('verb=');
        if (i !== -1) {
            const keyValues = nonJson.substring(i).split(' ');
            for (const kv of keyValues) {
                const parts = kv.split('=');
                additionalJSON[parts[0]] = parts[1];
            }
        }
    } else if (category.indexOf('sys.journal') !== -1 && jsonData.message !== undefined) {
        additionalJSON = JSON.parse(jsonData.message);
        if (additionalJSON.msg !== undefined) message = additionalJSON.msg;
    }

    return { date, level, category, message, additionalJSON };
}
`;

export type LogEntry = {
	date: Date,
	level: string,
	category: string,
	message: string,
	additionalJSON: {}
};

export default class JSONLogStore {
	private script = defaultScript;

	private scriptFunc = (_logEntry: string, _logentryJson: object) => { return { date: new Date(), level: '', category: '', message: '', additionalJSON: {} }; };

	private fields: JSONLogField[] = [];

	public constructor() {
		makeAutoObservable(this);
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
	public callScriptFunc(nonJson: string, jsonData: object): LogEntry {
		let logEntry: LogEntry = { date: new Date(), level: '', category: '', message: '', additionalJSON: {} };
		try {
			logEntry = this.scriptFunc(nonJson, jsonData);
		} catch (e) {
			console.log(e);
		}
		return logEntry;
	}

	public evalScript(script: string) {
		let f = this.scriptFunc;
		eval('f = ' + script);
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
	for (const message of messageQueueStore.getMessages()) message.updateJsonLog();
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
		const tokens = value.split('?')[0].split('/');
		let value2 = tokens.pop() as string;
		if (tokens.length > 0) {
			value2 = tokens.pop() + '/' + value2;
		}
		return value2 as string;
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
