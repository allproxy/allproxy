import { makeAutoObservable, action } from "mobx"
import { pickButtonStyle } from "../PickButtonStyle";
import { apFileSystem } from "./APFileSystem";
import { messageQueueStore } from "./MessageQueueStore";
import MessageStore from "./MessageStore";
import { snapshotStore } from "./SnapshotStore";

export const JSON_FIELDS_DIR = 'jsonFields';
export const SCRIPTS_DIR = 'scripts';
const jsonLogScriptFileName = 'jsonLogScript';

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
					let obj: { [key: string]: string } = {}
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

    const additionalJSON = {};

    if (Object.keys(jsonData).length === 0) {
        const i = nonJson.indexOf('verb=');
        if (i !== -1) {
            const keyValues = nonJson.substring(i).split(' ');
            for (const kv of keyValues) {
                const parts = kv.split('=');
                if (parts.length === 2) {
                    additionalJSON[parts[0]] = parts[1];
                }
            }
        }
    }

    return { date, level, category, message, additionalJSON };
}
`

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
	private fieldNames: string[] = []

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
		const fields: string[] = [];
		for (const field of this.fields) fields.push(field.getName());
		this.fieldNames = fields;
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
		this.fieldNames = [];
		for (const fileName of fileNames) {
			const jsonField = new JSONLogField(JSON_FIELDS_DIR);
			jsonField.setName(fileName);
			this.fields.push(jsonField);
			this.fieldNames.push(fileName);
		}

		for (const fileName of await apFileSystem.readDir(SCRIPTS_DIR)) {
			const script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + fileName)
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
		return this.fieldNames;
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

export function makeJSONRequestLabels(messageStore: MessageStore): string {
	const message = messageStore.getMessage();

	let json: { [key: string]: string } = {};
	if (typeof message.responseBody === 'string') {
		json = messageStore.getLogEntry().additionalJSON;
	} else {
		json = message.responseBody;
	}
	let title = formatJSONRequestLabels(json, snapshotStore.getJsonFieldNames(snapshotStore.getSelectedSnapshotName()), jsonLogStore.getJSONFieldNames());
	if (title.length === 0) {
		// Look for embedded JSON object
		let nonJson = message.path ? message.path + ' ' : '';

		title = nonJson + JSON.stringify(message.responseBody);

		// if (title.length > 200) {
		// 	title = title.substring(0, 200) + '...';
		// }
	}

	let messageText = messageStore.getLogEntry().message;
	if (messageText !== '') {
		title = `<span class="request__msg-highlight">${messageText}</span> ` + title;
	}

	let category = messageStore.getLogEntry().category;
	if (category !== '') {
		//messageStore.setColor(categoryStyle.background);
		let labels = ''
		for (const name of category.split(' ')) {
			const categoryStyle = pickButtonStyle(name);
			labels += makeLabel(name, categoryStyle.background, categoryStyle.color);
		}
		title = labels + title;
	}

	return title;
}

function makeLabel(name: string, background: string, color: string) {
	return `<span style="color: ${color}; background:${background};padding: 0 .25rem;border-radius: .25rem;border:${background} thin solid">`
		+ name +
		'</span> ';
}

function formatJSONRequestLabels(json: { [key: string]: any }, primaryJsonFields: string[], customJsonFields: string[]): string {
	let title = '';
	const fields = primaryJsonFields.concat(customJsonFields);
	fields.forEach((field) => {
		let value: string | number | undefined = undefined;
		if (Object.keys(json).length > 0) {
			//const combos = getFieldCombos(field)
			const jsonEval = eval('json');
			if (jsonEval !== undefined) {
				const parts = field.split('.');
				for (let key of parts) {
					key = key.replaceAll('[period]', '.');
					const keys: string[] = [key];
					if (parts.length === 1) {
						const keyLowercase = key.toLowerCase();
						const keyUppercase = key.toUpperCase();
						if (key === keyLowercase) {
							keys.push(key.substring(0, 1).toUpperCase() + keyLowercase.substring(1));
						} else {
							keys.push(keyLowercase)
						}
						if (key !== keyUppercase) {
							keys.push(keyUppercase)
						}
					}

					for (const key of keys) {
						try {
							value = eval(`jsonEval["${key}"]`);
							if (value !== undefined) break;
						} catch (e) { }
					}
				}
			}
			if (value === undefined || (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')) return;

			if (field !== 'PREFIX') {
				field = field.replaceAll('[period]', '.');
				if (title.length > 0) title += ' ';
				const style = pickButtonStyle(field);
				title += makeLabel(field, style.background, style.color);
				if (typeof value === 'string') value = `"${value}"`
			}
			title += value;
		}
	})

	return title;
}

export const jsonLogStore = new JSONLogStore();
