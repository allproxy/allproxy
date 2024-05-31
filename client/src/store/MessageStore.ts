import { makeAutoObservable, action } from "mobx";
import colorPicker from '../ColorPicker';
import Message, { NO_RESPONSE } from '../common/Message';
import pickIcon, { getDisplayableUserAgent } from '../PickIcon';
import Util from '../Util';
import { LogEntry, jsonLogStore, JsonField, formatJSONRequestLabels, getJsonFieldsMap } from "./JSONLogStore";
import { compressJSON, mainTabStore } from "./MainTabStore";
import { filterStore } from "./FilterStore";
import { jsonToJsonl } from "../components/ImportJSONFileDialog";
import { importJsonLines } from "../ImportJSONFile";

export default class MessageStore {
    private index: number = 0;
    private message: Message = new Message();
    private url = '';
    private _isError = false;
    private visited = false;
    private colorObj: { color: string, iconClass: string };
    private iconClass = '';
    private tooltip = '';
    private note = '';
    private jsonFields: JsonField[] = [];
    private filtered: false | true | undefined = undefined;
    private logEntry: LogEntry = { date: new Date(), level: '', category: '', appName: '', kind: '', message: '', rawLine: '', additionalJSON: {} };

    public constructor(message: Message, auto: boolean = false) {
        let keys = Object.keys(message.requestHeaders);
        for (const key of keys) {
            const lkey = key.toLowerCase();
            if (lkey !== key) {
                message.requestHeaders[lkey] = message.requestHeaders[key];
                delete message.requestHeaders[key];
            }
        }
        keys = Object.keys(message.responseHeaders);
        for (const key of keys) {
            const lkey = key.toLowerCase();
            if (lkey !== key) {
                message.requestHeaders[lkey] = message.responseHeaders[key];
                delete message.responseHeaders[key];
            }
        }

        this.message = message;
        this.url = this.formatUrl(message.url!);
        this._isError = this.isErrorResponse(message);
        this.visited = false;
        this.colorObj = colorPicker(message);
        if (message.requestHeaders['allproxy'] === 'resend') {
            this.iconClass = 'fa fa-clone ';
            this.iconClass += ' resend-icon';
        }
        else {
            this.iconClass = pickIcon(message.proxyConfig!.protocol, this.getUserAgent());
            if (message.jsonTruncated) {
                this.iconClass = 'fa fa-file-excel';
            }
        }
        this.iconClass += ' ' + this.colorObj.iconClass;
        this.tooltip = message.method ? 'Click to resend request' : '';
        this.note = message.note;
        makeAutoObservable(this);

        if (message.protocol === 'log:') {
            this.updateJsonLog(auto ? 'auto' : undefined);
        }
    }

    public setIndex(index: number) {
        this.index = index;
    }

    public getIndex() {
        return this.index;
    }

    public isFiltered(): true | false {
        const messageStore = this as unknown as MessageStore;
        return this.filtered === undefined ? filterStore.isFilteredNoCache(messageStore) : this.filtered;
    }

    public setFiltered(filtered: true | false | undefined) {
        this.filtered = filtered;
    }

    @action protected async updateJsonLog2(json: { [key: string]: any }, method: 'auto' | 'simple' | 'advanced' | 'plugin') {
        if (method === 'auto') {
            let newFields: JsonField[] = [];
            for (const key in json) {
                if (key === jsonLogStore.getAutoFields().date) continue;
                if (key === jsonLogStore.getAutoFields().level) continue;
                if (key === jsonLogStore.getAutoFields().category) continue;
                if (key === jsonLogStore.getAutoFields().kind) continue;
                if (key === jsonLogStore.getAutoFields().message) continue;
                let value = json[key];
                if (typeof value === 'object' && jsonLogStore.getAutoMaxFieldLevel() === 2) {
                    if (Array.isArray(value)) {
                        value = compressJSON(value);
                        newFields.push({ name: key, value: value });
                    } else {
                        for (const key2 in value as { [key: string]: any }) {
                            let value2 = value[key2];
                            if (typeof value2 === 'object') {
                                value2 = compressJSON(value2);
                            }
                            if (typeof value2 === 'string' || typeof value2 === 'boolean' || typeof value2 === 'number') {
                                newFields.push({ name: key + '.' + key2, value: value2 });
                            }
                        }
                    }
                } else if (typeof value === 'object') {
                    value = compressJSON(value);
                    newFields.push({ name: key, value: value });
                } else if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
                    newFields.push({ name: key, value: value });
                }
            }
            this.setJsonFields(newFields);
        } else {
            const newJsonFields = formatJSONRequestLabels(json, jsonLogStore.getJSONFieldNames());

            const oldJsonFields = this.getJsonFields();
            let updateRequired = true;
            if (oldJsonFields.length === newJsonFields.length) {
                updateRequired = false;
                for (let i = 0; i < oldJsonFields.length; ++i) {
                    if (oldJsonFields[i].name !== newJsonFields[i].name && oldJsonFields[i].name !== newJsonFields[i].name) {
                        updateRequired = true;
                        break;
                    }
                }
            }

            if (updateRequired) this.setJsonFields(newJsonFields);
        }
    }

    public getJsonFields() {
        return this.jsonFields;
    }
    @action setJsonFields(jsonFields: JsonField[]) {
        this.jsonFields = jsonFields;
    }

    public getAllJsonFieldsMap(): { [key: string]: JsonField } {
        const jsonFields: { [key: string]: JsonField } = {};

        const message = this.getMessage();
        let json: { [key: string]: string } = {};
        if (typeof message.responseBody === 'string') {
            json = this.logEntry.additionalJSON;
        } else {
            json = {
                ...this.logEntry.additionalJSON,
                ...message.responseBody
            };
        }

        const allJsonFieldsMap = getJsonFieldsMap(json);
        for (const key in allJsonFieldsMap) {
            for (const jsonField of allJsonFieldsMap[key]) {
                jsonFields[jsonField.name] = jsonField;
            }
        }
        return jsonFields;
    }

    public hasNote() {
        return this.getNote() !== undefined && this.getNote().length > 0;
    }

    public getNote(): string {
        return this.note;
    }
    @action setNote(note: string) {
        this.note = note;
        this.message.note = note;
    }

    public getMessage(): Message {
        return this.message!;
    }

    public getUrl(): string {
        return this.url;
    }

    @action public setUrl(url: string) {
        this.url = url;
    }

    public isNoResponse(): boolean {
        return this.message.responseBody === NO_RESPONSE;
    }

    public isError(): boolean {
        return this._isError;
    }

    public getColor(): string {
        return this.colorObj.color;
    }

    public setColor(color: string) {
        this.colorObj = { iconClass: '', color };
    }

    public getIconClass(): string {
        return this.iconClass;
    }

    public getDomain(): string | undefined {
        return this.message.requestHeaders['host'];
    }

    public getTooltip(): string {
        return this.tooltip;
    }

    public getVisited(): boolean {
        return this.visited;
    }

    public getRequestClient(): string | undefined {
        let ip = this.message.clientIp;
        if (ip === undefined || ip === '127.0.0.1' || ip === '::1' || ip?.indexOf('loopback') !== -1) {
            ip = getDisplayableUserAgent(this.getUserAgent());
        }
        return ip;
    }

    @action public setVisited(value: boolean) {
        this.visited = value;
    }

    public isRequestBodyJson() {
        return this.message.requestBody
            && typeof this.message.requestBody === 'object'
            && (this.message.protocol === 'http:' || this.message.protocol === 'https:');
    }

    public getRequestTooltip(): string {
        if (this.message.protocol === "log:") {
            return JSON.stringify(this.message.responseBody, null, 2);
        }
        else {
            return this.getRequestBody();
        }
    }

    public getRequestBody(): string {
        let body = this.message.method && this.message.method.length > 0 ? this.url + '\n' : '';

        if (this.message.requestBody) {
            let jsonBody = (this.message.requestBody as any);
            if (jsonBody['allproxy_inner_body']) {
                body += jsonBody['allproxy_inner_body'];
            }
            else if (
                typeof this.message.requestBody === 'string' &&
                this.message.requestHeaders['content-type'] &&
                this.message.requestHeaders['content-type'].includes('application/x-www-form-urlencoded')) {
                const params = this.message.requestBody.split('&');
                body += JSON.stringify(params, null, 2);
            } else if (typeof this.message.requestBody === 'string') {
                body += this.message.requestBody as string;
            } else {
                body += JSON.stringify(this.message.requestBody, null, 2);
            }
            // body = Util.fixNewlines(body);
        }
        return body;
    }

    private getUserAgent(): string {
        return this.message.requestHeaders && this.message.requestHeaders["user-agent"] ? this.message.requestHeaders["user-agent"] : "";
    }

    public getUserAgentDisplayable(): string | undefined {
        return getDisplayableUserAgent(this.getUserAgent());
    }

    public isHttpOrHttps() {
        return this.message.protocol === 'http:'
            || this.message.protocol === 'https:';
    }

    public isGrpc(): boolean {
        return this.message.proxyConfig?.protocol === 'grpc:';
    }

    public getGrpcStatus(): number {
        const status = this.message.responseHeaders['grpc-status'];
        return status ? Number(status) : 0;
    }

    public getGrpcMessage(): string {
        const grpcMessage = this.message.responseHeaders['grpc-message'];
        return grpcMessage ? grpcMessage : '';
    }

    private formatUrl(urlStr: string): string {
        //var url = urlStr.indexOf('?') !== -1 ? urlStr.split('?')[0] : urlStr;
        let url = unescape(urlStr);
        url = Util.fixNewlines(url);
        return url.split(/\s+/).join(' ');
    }

    private isErrorResponse(message: Message): boolean {
        // Set error class to make text red
        return message.status >= 400
            || (message.proxyConfig?.protocol === 'grpc:'
                && message.responseHeaders['grpc-status']
                && Number(message.responseHeaders['grpc-status']) > 0)
            || ((message.protocol === 'mysql:')
                && message.status !== 0)
            || Util.isGraphQlError(message);
    }

    public async updateJsonLog(method: 'auto' | 'simple' | 'advanced' | 'plugin' = jsonLogStore.getParsingMethod()) {
        const message = this.getMessage();
        const responseBody = message.responseBody;
        if (typeof responseBody === 'string') {
            this.logEntry = jsonLogStore.extractJSONFields(responseBody, {}, method);
        } else {
            this.logEntry = jsonLogStore.extractJSONFields(message.path, responseBody, method);
        }

        let json: { [key: string]: string } = {};
        if (typeof message.responseBody === 'string') {
            json = this.logEntry.additionalJSON;
        } else {
            json = {
                ...this.logEntry.additionalJSON,
                ...message.responseBody
            };
        }
        this.updateJsonLog2(json, method);
    }

    @action public getLogEntry() {
        return this.logEntry;
    }

    public canSplitJsonLogMessage() {
        if (this.message.protocol === 'log:') {
            if (typeof this.message.responseBody !== 'string') {
                for (const key in this.message.responseBody) {
                    if (Array.isArray(this.message.responseBody[key]) &&
                        typeof this.message.responseBody[key][0] === 'object') return true;
                }
            }
        }
        return false;
    }

    public splitJsonLogMessage() {
        function getTabName(json: { [key: string]: any }): string {
            let tabName = '';
            for (const key in json) {
                if (Array.isArray(json[key]) && typeof json[key][0] === 'object') {
                    tabName = key;
                    if (json[key].length === 1) {
                        tabName += '.' + getTabName(json[key][0]);
                    }
                    break;
                }
            }
            console.log('tabName:', tabName);
            return tabName;
        }

        if (typeof this.message.responseBody !== 'string') {
            mainTabStore.setUpdating(true, 'Splitting JSON Message...');
            const jsonLines = jsonToJsonl(JSON.stringify(this.message.responseBody), true);
            const lines = jsonLines.split('\n');
            const tabName = getTabName(this.message.responseBody);
            mainTabStore.importTab(tabName, importJsonLines(tabName, lines));
            mainTabStore.setUpdating(false);
        }
    }
}