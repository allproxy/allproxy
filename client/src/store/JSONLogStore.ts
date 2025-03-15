import { makeAutoObservable, action } from "mobx";
import { apFileSystem } from "./APFileSystem";
import { messageQueueStore } from "./MessageQueueStore";
import { compressJSON } from "./MainTabStore";
import { filterStore } from "./FilterStore";
import { urlPathStore } from "./UrlPathStore";
import { getPluginFunc } from "../Plugins";
import GTag from "../GTag";
import { DefaultSortBy } from "../components/JSONSpreadsheet";

export const JSON_FIELDS_DIR = 'jsonFields';
export const SCRIPTS_DIR = 'scripts';
const jsonLogScriptFileVersion = 'jsonLogScriptVersion';
const jsonLogScriptFileName = 'jsonLogScript';
const jsonLogScriptDefaultFileName = 'jsonLogScriptDefault';
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

export function setDefaultScript(script: string) {
	defaultScript = script;
}

export let defaultScript =
	`
// Function called to extract date, level, app name and message
//
// @param preJSONString: string - optional non-JSON string proceeding JSON object
// @param jsonObject: {} - JSON log data
// @returns {date: Date, level: string, category: string, appName: string, message: string, rawLine: string, additionalJSON: {} }
//
// category is the availability zone
// appName is the pod name
//
const extractDateLevelCategoryAppNameMessage = function (preJSONString, jsonObject) {
    let level = 'info';
    let date = new Date();
    let category = '';
    let kind = 'Kind_is_not_defined';
    let message = "Message field not defined - click '?'";
    let additionalJSON = {};
    const ignoreFields = [];
    const typeahead = [];
    // Kube object?
    if (jsonObject.kind && jsonObject.metadata) {
        kind = jsonObject.kind;
        message = jsonObject.metadata.name;
        if (jsonObject.metadata.creationTimestamp) {
            date = new Date(jsonObject.metadata.creationTimestamp);
        }
        level = '';
        additionalJSON['level'] = undefined;
        // Errors detected by the parseJson plugin?
        if (jsonObject['errors']) {
            level = 'error';
            additionalJSON['level'] = level;
        }
    }
    else { // Try to dynamically find fields
        let dateSet, levelSet, kindSet, messageSet = false;

        const fieldValues = []; // array of {field, value} pairs  

        // Recursively traverse JSON and build fieldValues array
        function traverseJson(obj) {
            for (let field in obj) {
                const value = obj[field];
                if (typeof field === 'string' && (typeof value === 'string' || typeof value === 'number')) {
                    field = field.toLowerCase();
                    fieldValues.push({ field, value });
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    traverseJson(value);
                }
            }
        }
        traverseJson(jsonObject);

        // Check each JSON field,value pair looking for date, info, kind and message
        for (const fieldValue of fieldValues) {
            const field = fieldValue.field;
            const value = fieldValue.value;

            checkForDateLevelKindMessage(field, value);

            if (dateSet && levelSet && kindSet && messageSet) break;
        }

        // Check for data, level, kind and message fields
        function checkForDateLevelKindMessage(field, value) {
            if (!dateSet) {
                if ((field.includes('time') || field.includes('date')) && isValidDate(value)) {
                    dateSet = true;
                    date = new Date(value);
                    return;
                }
            }

            if (typeof value !== 'string') return;

            if (!levelSet) {
                if (field === 'level') {
                    levelSet = true;
                    level = value;
                    if (value.startsWith('err')) typeahead.push(field + ':' + value);
                    return;
                } else if (field === 'severity') {
                    level = value;
                    return;
                } else if (field === 'error') {
                    level = 'error';
                    return;
                }
            }

            if (field === 'error' && value.length > 0) typeahead.push(field + ':*');

            if (!kindSet) {
                if (field === 'kind' || field === 'app' || field === 'appname') {
                    kindSet = true;
                    kind = value;
                    return;
                } else if (field.length <= 64 && (field.startsWith("thread") ||
                    field.startsWith('app') || field.endsWith('app'))) {
                    kind = value;
                    return;
                }
            }

            if (!messageSet) {
                if (field === 'message' || field === 'msg' || field === 'error') {
                    messageSet = true;
                    message = value;
                    return;
                } else if (field.startsWith('message')) {
                    message = value;
                    return;
                }
            }

        }

        // Returns true, if this is a valid date
        function isValidDate(value) {
            try {
                let date = new Date(value);
                if (date.toString() === 'Invalid Date' && typeof value === 'string') {
                    const tokens = value.split(':', 2);
                    if (tokens.length === 2) {
                        let d = new Date(tokens[0]);
                        date = new Date(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ':' + tokens[1]);
                    }
                }
                if (date.toString() === 'Invalid Date') return false;
            } catch (e) {
                return false;
            }
            return true;
        }
    }

    return { date, level, category, kind, message, rawLine: undefined, additionalJSON, ignoreFields, typeahead };
};
`;

export type LogEntry = {
	date: Date,
	level: string,
	category: string,
	appName: string, // deprecated
	kind: string,
	message: string,
	rawLine: string,
	additionalJSON: {},
	ignoreFields: string[],
	typeahead: string[],
};

export type SimpleFields = {
	date: string,
	level: string,
	category: string,
	appName: string, // deprecated
	kind: string,
	message: string,
	rawLine: string,
}

export default class JSONLogStore {
	private method: 'auto' | 'simple' | 'advanced' | 'plugin' = 'advanced';

	private autoFields: SimpleFields = { date: '', level: '', category: '', appName: '', kind: '', message: '', rawLine: '' };
	private autoMaxFieldLevel: 1 | 2 = 1;
	private simpleFields: SimpleFields = { date: '', level: '', category: '', appName: '', kind: '', message: '', rawLine: '' };

	private briefChecked = true;
	private briefMap: { [key: string]: boolean } = {};

	private rawJsonChecked = false;
	private showUtcChecked = false;

	private script = defaultScript;
	private rerenderEditor = 0;

	private scriptFunc = (_logEntry: string, _logentryJson: object) => {
		return { date: new Date(), level: '', category: '', appName: '', kind: '', message: '', rawLine: '', additionalJSON: {}, ignoreFields: [], typeahead: [] };
	};

	private typeaheadMap: { [key: string]: boolean } = {};

	private fields: JSONLogField[] = [];

	private hiddenFields: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public getTypeahead() {
		return Object.keys(this.typeaheadMap).sort();
	}
	public setTypeahead(ta: string) {
		this.typeaheadMap[ta] = true;
	}

	public getParsingMethod() { return this.method; }
	public async setParsingMethod(method: 'auto' | 'simple' | 'advanced' | 'plugin') {
		this.method = method;
		await apFileSystem.writeFile(SCRIPTS_DIR + '/method', method);
		GTag.pageView('JSON Parse Method: ' + method);
	}

	public getAutoFields() { return this.autoFields; }
	public async setAutoFields(field: 'date' | 'level' | 'category' | 'kind' | 'message' | 'rawLine', value: string) {
		this.autoFields[field] = value;
	}

	public getAutoMaxFieldLevel() { return this.autoMaxFieldLevel; }
	public setAutoMaxFieldLevel(level: 1 | 2) { this.autoMaxFieldLevel = level; }

	public getSimpleFields() { return this.simpleFields; }
	public async setSimpleFields(field: 'date' | 'level' | 'category' | 'kind' | 'message' | 'rawLine', value: string) {
		const oldValue = this.simpleFields[field];
		this.simpleFields[field] = value;
		if (oldValue !== '') {
			await apFileSystem.deleteFile(SCRIPTS_DIR + '/' + field);
		}
		await apFileSystem.writeFile(SCRIPTS_DIR + '/' + field, value);
		GTag.pageView('setSimpleFields ' + field + ' ' + value);
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
		return this.briefChecked && jsonLogStore.getParsingMethod() !== 'auto' && jsonLogStore.getParsingMethod() !== 'simple';
	}
	@action public toggleBriefChecked() {
		this.briefChecked = !this.briefChecked;
		filterStore.filterUpdated();
		GTag.pageView('More Detail Checked: ' + this.briefChecked + '');
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
		GTag.pageView('Show Raw JSON Checked: ' + this.rawJsonChecked + '');
	}

	public isShowUtcChecked() {
		return this.showUtcChecked;
	}
	@action public toggleShowUtcChecked() {
		this.showUtcChecked = !this.showUtcChecked;
		filterStore.filterUpdated();
		GTag.pageView('UTC Time Checked: ' + this.showUtcChecked + '');
	}

	@action public async resetScriptToDefault() {
		this.script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptDefaultFileName);
		jsonLogStore.setScript(this.script);
		await apFileSystem.deleteFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName);
		await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, this.script);
		this.rerenderEditor++;
		await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileVersion, '0');
		GTag.pageView('resetScriptToDefault');
	}
	@action public getRerenderEditor() {
		return this.rerenderEditor;
	}

	public getScript() {
		return this.script;
	}
	@action public setScript(script: string) {
		this.script = script;
	}
	@action public async saveScript() {
		const defaultScript = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptDefaultFileName);
		const currentScript = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName);
		if (this.script !== currentScript && this.script !== defaultScript) {
			await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, this.script);
			const version = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptFileVersion);
			const newVersion = parseInt(version) + 1;
			await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileVersion, newVersion + '');
			GTag.pageView('saveScript ' + newVersion);
		}
	}
	@action public async updateScriptFunc() {
		if (this.method === 'plugin') {
			this.scriptFunc = getPluginFunc("parseJSON");
		} else {
			this.scriptFunc = this.evalScript(this.script);
		}
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
			if (date.toString() === 'Invalid Date') date = undefined;
		} catch (e) {
		}
		return date;
	}

	@action public extractJSONFields(nonJson: string,
		jsonData: { [key: string]: any },
		method: 'auto' | 'simple' | 'advanced' | 'plugin'
	): LogEntry {

		const setAutoField = (field: 'date' | 'level' | 'category' | 'kind' | 'message' | 'rawLine') => {
			if (this.getAutoFields()[field].length === 0) {
				if (field === 'date') {
					let dateKey = '';
					const findDate = (jsonData: { [key: string]: any }, objectName: string) => {
						for (const key in jsonData) {
							if (typeof jsonData[key] === 'object') {
								const k = objectName ? objectName + '.' + key : key;
								findDate(jsonData[key], k);
							} else {
								const keyLc = key.toLowerCase();
								if (keyLc.indexOf('time') !== -1 || keyLc.indexOf('date') !== -1) {
									const value = jsonData[key];
									if (typeof value === 'string' || typeof value === 'number') {
										const date = this.parseDate(value);
										if (date) {
											dateKey = objectName ? objectName + '.' + key : key;
											this.setAutoFields(field, dateKey);
											break;
										}
									}
								}
							}
						}
					};
					findDate(jsonData, '');
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
				const jsonFields = lookupJSONField(jsonData, key);
				const value = jsonFields.length === 0 ? undefined : jsonFields[0].value;
				if (field === 'date') {
					if (typeof value === 'string' || typeof value === 'number') {
						const date = this.parseDate(value);
						if (date) {
							logEntry.date = date;
						}
					}
				} else {
					if (value) {
						logEntry[field] = value + '';
					}
				}
			}
		};

		let logEntry: LogEntry = { date: new Date(), level: '', category: '', appName: '', kind: '', message: '', rawLine: '', additionalJSON: {}, ignoreFields: [], typeahead: [] };
		switch (method) {
			case 'auto':
				setAutoField('date');
				setAutoField('level');
				setAutoField('category');
				setAutoField('kind');
				setAutoField('message');
				logEntry.rawLine = Object.keys(jsonData).length === 0 ? nonJson : JSON.stringify(jsonData);
				break;
			case 'simple':
				const simpleFields = jsonLogStore.getSimpleFields();
				if (simpleFields.date !== '') {
					for (const jsonField of lookupJSONField(jsonData, simpleFields.date)) {
						if (jsonField && typeof jsonField.value === 'string') {
							const date = this.parseDate(jsonField.value);
							if (date) {
								logEntry.date = date;
								break;
							}
						}
					}
				}
				const setField = (field: 'level' | 'category' | 'kind' | 'message' | 'rawLine') => {
					if (simpleFields[field] !== '') {
						for (const jsonField of lookupJSONField(jsonData, simpleFields[field])) {
							if (typeof jsonField.value === 'string' || typeof jsonField?.value === 'number') {
								logEntry[field] = jsonField.value + '';
								break;
							}
						}
					}
				};
				setField('level');
				setField('category');
				setField('kind');
				setField('message');
				logEntry.rawLine = Object.keys(jsonData).length === 0 ? nonJson : JSON.stringify(jsonData);
				break;
			case 'advanced':
			case 'plugin':
				try {
					logEntry = this.scriptFunc(nonJson, jsonData);
					// Deprecated kind is specified?
					if (typeof logEntry.appName === 'string' && logEntry.appName.length > 0) {
						logEntry.kind = logEntry.appName;
					}
				} catch (e) {
					console.log(e);
				}

				if (logEntry.date === undefined ||
					!(logEntry.date instanceof Date) ||
					logEntry.date.toString() === 'Invalid Date') {
					logEntry.date = new Date();
					for (const field in jsonData) {
						const value = jsonData[field];
						if (typeof value === 'string' || typeof value === 'number') {
							const date = this.parseDate(value);
							if (date) {
								logEntry.date = date;
								break;
							}
						}
					}
				}
				if (logEntry.level === undefined) logEntry.level = '';
				if (logEntry.category === undefined) logEntry.category = '';
				if (logEntry.kind === undefined) logEntry.kind = '';
				if (logEntry.message === undefined) logEntry.message = '';
				else if (typeof logEntry.message === 'object') {
					logEntry.message = JSON.stringify(logEntry.message);
				}
				if (logEntry.rawLine === undefined) logEntry.rawLine = '';
				if (logEntry.rawLine === '') logEntry.rawLine = Object.keys(jsonData).length === 0 ? nonJson : JSON.stringify(jsonData);
				if (logEntry.typeahead === undefined) logEntry.typeahead = [];
				break;
		}
		if (typeof logEntry.level === 'number') logEntry.level = logEntry.level + '';
		return logEntry;
	}

	public evalScript(script: string) {
		try {
			let scriptNoComments = '';
			for (const line of script.split('\n')) {
				const lineTrim = line.trim();
				if (lineTrim.length > 0 && !lineTrim.startsWith('//')) {
					if (lineTrim.includes('//')) {
						scriptNoComments += line.split('//')[0];
					} else {
						scriptNoComments += line;
					}
				}
			}
			const i = scriptNoComments.indexOf('function');
			const func = scriptNoComments.substring(i);
			let f = this.scriptFunc;
			eval('f = ' + func);
			return f;
		} catch (e) {
			console.error(e);
		}
		return this.scriptFunc;
	}

	public async init() {
		return new Promise<void>(async (resolve) => {
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
			const fields: JSONLogField[] = [];
			for (const fileName of fileNames) {
				const jsonField = new JSONLogField(JSON_FIELDS_DIR);
				jsonField.setName(fileName);
				fields.push(jsonField);
				fields.sort((a, b) => a.getName().localeCompare(b.getName()));
			}
			this.fields = fields;

			if (await apFileSystem.exists(SCRIPTS_DIR + '/' + jsonLogScriptFileName)) {
				this.script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName);
			}
			if (!urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages() && this.script === defaultScript) {
				if (await apFileSystem.exists(SCRIPTS_DIR + '/' + jsonLogScriptFileName, 'serverFs')) {
					this.script = await apFileSystem.readFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, 'serverFs');
					await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptFileName, this.script);
				}
			}
			if (!await apFileSystem.exists(SCRIPTS_DIR + '/' + jsonLogScriptDefaultFileName)) {
				await apFileSystem.writeFile(SCRIPTS_DIR + '/' + jsonLogScriptDefaultFileName, this.script);
			}

			const initSimpleField = async (field: 'date' | 'level' | 'category' | 'appName' | 'kind' | 'message' | 'rawLine') => {
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
			initSimpleField('kind');
			initSimpleField('appName'); // deprecated
			initSimpleField('message');
			if (this.simpleFields.appName !== '' && this.simpleFields.kind === '') {
				this.simpleFields.kind = this.simpleFields.appName;
			}

			const exists = await apFileSystem.exists(SCRIPTS_DIR + '/method');
			if (exists) {
				const method = await apFileSystem.readFile(SCRIPTS_DIR + '/method') as 'auto' | 'simple' | 'advanced' | 'plugin';
				if (method) {
					this.method = method;
				}
			} else if (!urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages()) {
				const exists = await apFileSystem.exists(SCRIPTS_DIR + '/method', 'serverFs');
				if (exists) {
					const method = await apFileSystem.readFile(SCRIPTS_DIR + '/method', 'serverFs') as 'auto' | 'simple' | 'advanced' | 'plugin';
					if (method) {
						this.method = method;
						await apFileSystem.writeFile(SCRIPTS_DIR + '/method', method);
					}
				}
			}
			resolve();
		});
	}

	public getJSONFields() {
		return this.fields;
	}

	public getJSONFieldNames(): string[] {
		return this.fields.map(field => field.getName());
	}

	@action public extend() {
		this.fields.unshift(new JSONLogField(JSON_FIELDS_DIR));
	}

	@action public async deleteEntry(index: number) {
		const jsonField = this.fields[index];
		this.fields.splice(index, 1);
		if (jsonField.getName() !== "") {
			if (await apFileSystem.exists(jsonField.getDir() + '/' + jsonField.getName())) {
				await apFileSystem.deleteFile(jsonField.getDir() + '/' + jsonField.getName());
			}
		}
	}
}

export async function updateJSONRequestLabels() {
	const messages = messageQueueStore.getMessages();
	const copy = messages.slice();
	messages.splice(0, messages.length);
	for (const message of copy) message.updateJsonLog();
	messages.push(...copy);
}

export function formatJSONRequestLabels(json: { [key: string]: any }, fields: string[]): JsonField[] {
	const jsonFields: JsonField[] = [];
	fields.forEach((field) => {
		if (Object.keys(json).length > 0) {
			for (let jsonField of lookupJSONField(json, field, 'exact')) {
				if (field !== 'PREFIX') {
					field = field.replaceAll('[.]', '.');
					if (typeof jsonField.value === 'string') {
						jsonField.value = formatValue(field, jsonField.value);
					}
					jsonFields.push({ name: field, value: jsonField.value });
				}
			}
		}
	});

	return jsonFields;
}


let jsonCacheEntries: { json: { [key: string]: string }, jsonFieldsMap: { [key: string]: JsonField[] } }[] = [];

export function getJsonFieldsMap(json: { [key: string]: string }): { [key: string]: JsonField[] } {
	for (const entry of jsonCacheEntries) {
		if (json === entry.json) {
			return entry.jsonFieldsMap;
		}
	}

	const jsonFieldsMap: { [key: string]: JsonField[] } = {};
	const addJsonFields = (prevField: string, json: { [key: string]: string }) => {
		for (const curField in json) {
			const value = json[curField];
			let name = prevField === '' ? curField : prevField + '.' + curField;
			if (typeof value === 'object') {
				const compressed = compressJSON(value);
				jsonFieldsMap[name.toLowerCase()] = [{ name, value: compressed }];
				const unqualified = '*' + curField.toLowerCase();
				if (jsonFieldsMap[unqualified] === undefined) {
					jsonFieldsMap[unqualified] = [{ name, value: compressed }];
				} else {
					jsonFieldsMap[unqualified].push({ name, value: compressed });
				}
				if (!Array.isArray(value)) {
					addJsonFields(name, value);
				} else {
					const a = value as any;
					for (let i = 0; i < a.length; ++i) {
						const name2 = name + '[' + i + ']';
						if (typeof a[i] === 'object') {
							addJsonFields(name2, a[i]);
						} else {
							jsonFieldsMap[name2] = [{ name: name2, value: a[i] }];
						}
					}
				}
			} else {
				jsonFieldsMap[name.toLowerCase()] = [{ name, value }];

				// Unqualified field name is not defined yet?
				const unqualified = '*' + curField.toLowerCase();
				if (jsonFieldsMap[unqualified] === undefined) {
					jsonFieldsMap[unqualified] = [{ name, value }];
				} else {
					jsonFieldsMap[unqualified].push({ name, value });
				}
			}
		}
	};

	addJsonFields('', json);

	if (jsonCacheEntries.length > 5) {
		jsonCacheEntries.shift();
	}
	jsonCacheEntries.push({ json, jsonFieldsMap });

	//console.log(jsonFields);
	return jsonFieldsMap;
}

type Exact = 'exact' | 'any';
export function lookupJSONField(json: { [key: string]: any }, field: string, exact: Exact = 'any'): JsonField[] {
	if (json && Object.keys(json).length > 0) {
		const jsonFieldsMap = getJsonFieldsMap(json);
		const fieldLower = field.toLowerCase();
		//console.log(field);
		//console.log(jsonFields);
		let jsonFields = jsonFieldsMap[fieldLower];
		if (jsonFields === undefined && exact === 'any') {
			jsonFields = jsonFieldsMap['*' + fieldLower];
		}
		//console.log(jf);
		if (jsonFields) {
			return jsonFields;
		}
	}
	return [];
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

export function getJsonSpreadsheetLines(fields: string[], sortBy: string): { lines: string[], dupCountMap: { [key: string]: number } } {
	const outputValues: string[] = [];
	type Values = string[];
	let valueArray: Values[] = [];
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
				const jsonFields = lookupJSONField(json, field);
				if (jsonFields.length === 0) jsonFields.push({ name: field, value: 'undefined' });
				for (const jsonField of jsonFields) {
					values.push(jsonField.value + '');
				}
			}
		}
		if (values.join('').length > 0) {
			valueArray.push(values);
		}
	}

	if (valueArray.length > 0) {
		if (sortBy !== DefaultSortBy) {
			const i = fields.indexOf(sortBy);
			valueArray = valueArray.sort((a, b) => (a[i] + '').localeCompare(b[i] + ''));
		}
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

	const dupCountMap: { [key: string]: number } = {};
	for (const line of outputValues) {
		if (dupCountMap[line]) {
			dupCountMap[line]++;
		} else {
			dupCountMap[line] = 1;
		}
	}

	if (outputValues.length === 0) {
		outputValues.push('No matching JSON field found.');
	}
	return { lines: outputValues, dupCountMap };
}

export const jsonLogStore = new JSONLogStore();
