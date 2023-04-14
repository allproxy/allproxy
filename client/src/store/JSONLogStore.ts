import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";

export const JSON_FIELDS_DIR = 'jsonFields';
export const SCRIPTS_DIR = 'scripts';
const jsonLogScriptFileName = 'jsonLogScript';

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
	private labels: JSONLogLabel[] = [];

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
		this.labels = [];
		for (const fileName of fileNames) {
			const jsonField = new JSONLogLabel(JSON_FIELDS_DIR);
			jsonField.setName(fileName);
			this.labels.push(jsonField);
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

	public getJSONLabels() {
		return this.labels;
	}

	public getJSONLabelNames(): string[] {
		const fields: string[] = [];
		for (const label of this.labels) fields.push(label.getName());
		return fields;
	}

	@action public extend() {
		this.labels.unshift(new JSONLogLabel(JSON_FIELDS_DIR));
	}

	@action public deleteEntry(index: number) {
		const jsonField = this.labels[index];
		if (jsonField.getName() != "") {
			apFileSystem.deleteFile(jsonField.getDir() + '/' + jsonField.getName());
		}
		this.labels.splice(index, 1);
	}
}

export const jsonLogStore = new JSONLogStore();
