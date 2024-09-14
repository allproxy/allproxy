import { makeAutoObservable, action } from "mobx";
import MessageStore from './MessageStore';
import _ from 'lodash';
import { dateToHHMMSS } from "../components/Request";
import { lookupJSONField as lookupJSONField } from "./JSONLogStore";
import { messageQueueStore } from "./MessageQueueStore";
import { stringToDate } from "../components/Footer";

export default class FilterStore {
    private name = '';
    private enabled = true;
    private filter = '';
    private searchFilter = '';
    private boolString = '';
    private boolOperands: string[] = [];
    private highlightJsonFields: string[] = [];
    private _matchCase = false;
    private _regex = false;
    private _logical = true;
    private _deleteFiltered = false;
    private showErrors = false;
    private excludeTags: string[] = [];
    private _excludeMatchCase = false;
    private sideBarProtocols: Map<string, boolean> = new Map();
    private sideBarDomains: Map<string, boolean> = new Map();
    private sideBarUserAgents: Map<string, boolean> = new Map();
    private sideBarStatuses: Map<number, boolean> = new Map();

    private dedup = false;
    private dedupMap: { [key: string]: string | number | boolean } = {};
    private pendingDedupMap: { [key: string]: string | number | boolean } = {};

    private sortByKeys: string[] = [];

    private startTime: string = "";
    private endTime: string = "";
    private startDate: Date = new Date();
    private endDate: Date = new Date();

    public constructor() {
        makeAutoObservable(this);
    }

    public getStartTime() {
        return this.startTime;
    }
    public setStartTime(startTime: string) {
        this.startTime = startTime;
        if (startTime === '') {
            this.startDate = new Date();
        } else {
            this.startDate = stringToDate(this.startTime).date;
        }
    }

    public getEndTime() {
        return this.endTime;
    }
    public setEndTime(endTime: string) {
        this.endTime = endTime;
        if (endTime === '') {
            this.endDate = new Date();
        } else {
            this.endDate = stringToDate(this.endTime).date;
        }
    }

    public getName() {
        return this.name;
    }
    @action public setName(name: string) {
        this.name = name;
    }

    public getSortByKeys() {
        return this.sortByKeys;
    }

    public isEnabled() {
        return this.enabled;
    }

    @action toggleEnabled() {
        this.enabled = !this.enabled;
    }

    @action setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    public matchCase(): boolean {
        return this._matchCase;
    }

    @action public toggleMatchCase() {
        this._matchCase = !this._matchCase;
        this.filterUpdated();
    }

    @action public setMatchCase(matchCase: boolean) {
        this._matchCase = matchCase;
    }

    public regex(): boolean {
        return this._regex;
    }

    @action public toggleRegex() {
        this._regex = !this._regex;
        this.filterUpdated();
    }

    @action public setRegex(regex: boolean) {
        this._regex = regex;
    }

    public logical(): boolean {
        return this._logical;
    }

    @action public toggleLogical() {
        this._logical = !this._logical;
        this.filterUpdated();
    }

    @action public setLogical(logical: boolean) {
        this._logical = logical;
    }

    public deleteFiltered(): boolean {
        return this._deleteFiltered;
    }

    @action public toggleDeleteFiltered() {
        this._deleteFiltered = !this._deleteFiltered;
        this.filterUpdated();
    }

    public getShowErrors(): boolean {
        return this.showErrors;
    }

    @action public toggleShowErrors() {
        this.showErrors = !this.showErrors;
        this.filterUpdated();
    }

    @action public setExcludeTags(excludeList: string[]) {
        this.excludeTags = excludeList;
        this.filterUpdated();
    }

    public excludeMatchCase(): boolean {
        return this._excludeMatchCase;
    }

    @action public toggleExcludeMatchCase() {
        this._excludeMatchCase = !this._excludeMatchCase;
        this.filterUpdated();
    }

    @action public setExcludeMatchCase(matchCase: boolean) {
        this._excludeMatchCase = matchCase;
    }

    // Protocols filter
    public getSideBarProtocolIconClasses(): string[] {
        const iconClasses: string[] = [];
        this.sideBarProtocols.forEach((_, iconClass) => iconClasses.push(iconClass));
        return iconClasses;
    }

    public isSideBarProtocolChecked(iconClass: string): boolean {
        return !!this.sideBarProtocols.get(iconClass);
    }

    public getSideBarProtocolChecked(iconClass: string): boolean | undefined {
        return this.sideBarProtocols.get(iconClass);
    }

    @action private setSideBarProtocolChecked(iconClass: string, value: boolean) {
        this.sideBarProtocols.set(iconClass, value);
    }
    @action public toggleSideBarProtocolChecked(iconClass: string) {
        this.sideBarProtocols.set(iconClass, !this.sideBarProtocols.get(iconClass));
        this.filterUpdated();
    }

    // Statuses filter
    public getSideBarStatuses(): number[] {
        const statuses: number[] = [];
        this.sideBarStatuses.forEach((_, status) => statuses.push(status));
        return statuses;
    }

    public isSideBarStatusChecked(status: number): boolean {
        return !!this.sideBarStatuses.get(status);
    }

    public getSideBarStatusChecked(status: number): boolean | undefined {
        return this.sideBarStatuses.get(status);
    }

    @action public setSideBarStatusChecked(status: number, value: boolean) {
        this.sideBarStatuses.set(status, value);
    }
    @action public toggleSideBarStatusChecked(status: number) {
        this.sideBarStatuses.set(status, !this.sideBarStatuses.get(status));
        this.filterUpdated();
    }

    // Domains filter
    public getSideBarDomains(): string[] {
        const iconClasses: string[] = [];
        this.sideBarDomains.forEach((_, domain) => iconClasses.push(domain));
        return iconClasses;
    }

    public isSideBarDomainChecked(domain: string): boolean {
        return !!this.sideBarDomains.get(domain);
    }

    public getSideBarDomainChecked(domain: string): boolean | undefined {
        return this.sideBarDomains.get(domain);
    }

    @action public setSideBarDomainChecked(domain: string, value: boolean) {
        this.sideBarDomains.set(domain, value);
    }
    @action public toggleSideBarDomainChecked(domain: string) {
        this.sideBarDomains.set(domain, !this.sideBarDomains.get(domain));
        this.filterUpdated();
    }

    // User Agents filter
    public getSideBarUserAgents(): string[] {
        const iconClasses: string[] = [];
        this.sideBarUserAgents.forEach((_, ua) => iconClasses.push(ua));
        return iconClasses;
    }

    public isSideBarUserAgentChecked(userAgent: string): boolean {
        return !!this.sideBarUserAgents.get(userAgent);
    }

    public getSideBarUserAgentChecked(userAgent: string): boolean | undefined {
        return this.sideBarUserAgents.get(userAgent);
    }

    @action public setSideBarUserAgentChecked(userAgent: string, value: boolean) {
        this.sideBarUserAgents.set(userAgent, value);
    }
    @action public toggleSideBarUserAgentChecked(userAgent: string) {
        this.sideBarUserAgents.set(userAgent, !this.sideBarUserAgents.get(userAgent));
        this.filterUpdated();
    }

    public isDedupChecked() {
        return this.dedup;
    }
    public toggleDedupChecked() {
        this.dedup = !this.dedup;
        this.filterUpdated();
    }

    public canDedup() {
        return Object.keys(this.dedupMap).length > 0;
    }

    @action public setHighlightJsonFields(terms: string[]) {
        this.highlightJsonFields = terms;
    }
    public getHighlightJsonFields() {
        return this.highlightJsonFields;
    }

    @action public setFilterNoDebounce(filter: string) {
        this.sortByKeys = [];

        this.filter = filter;
        this.searchFilter = this.filter.trim();
        this.updateBoolString();
        this.filterUpdated();
    }

    @action public setFilter(filter: string) {
        this.filter = filter;
        this.searchFilter = this.filter;
        this.updateBoolString();
    }

    @action public filterUpdated() {
        for (const messageStore of messageQueueStore.getMessages()) {
            messageStore.setFiltered(undefined);
        }
        messageQueueStore.setScrollAction('filter');

        this.dedupMap = {};
        if (this.dedup) {
            for (const messageStore of messageQueueStore.getMessages()) {
                messageStore.isFiltered();
            }
        }
    }

    public isInvalidFilterSyntax(): boolean {
        let invalidFilterSyntax = false;
        if (this._logical && this.boolString.length > 0) {
            let boolString = this.boolString;
            for (let i = 0; i < this.boolOperands.length; ++i) {
                boolString = boolString.replace('###' + i, 'true');
            }
            //console.log(boolString);
            try {
                // eslint-disable-next-line no-eval
                eval(boolString);
                return false;
            } catch (e) {
                invalidFilterSyntax = true;
                return true;
            }
        }
        return invalidFilterSyntax;
    }

    private updateBoolString() {
        this.boolString = '';
        this.boolOperands.splice(0, this.boolOperands.length);
        let argNum = 0;
        let filter = this.filter;
        if (filter.includes(' AND ') || filter.includes(' OR ')) {
            filter = filter.split(' AND ').join(' && ').split(' OR ').join(' || ');
        }
        if (filter.includes(' !') || filter.startsWith('!')
            || filter.includes(' -') || filter.startsWith('-')
            || filter.includes('&&')
            || filter.includes('||')) {
            let operand = '';
            for (let i = 0; i < filter.length; ++i) {
                let c1 = filter.substr(i, 1);
                let c2 = i < filter.length - 1 ? filter.substr(i + 1, 1) : '';
                let nonOperand = '';
                if (((c1 === '!' || c1 === '-') && i === 0) || c1 === '(' || c1 === ')') {
                    if (c1 === '-') c1 = '!';
                    nonOperand = c1;
                }
                if (c1 === ' ' && (c2 === '!' || c2 === '-')) {
                    ++i;
                    nonOperand = '!';
                }
                if (c1 === '&' && c2 === '&') {
                    ++i;
                    nonOperand = '&&';
                }
                if (c1 === '|' && c2 === '|') {
                    ++i;
                    nonOperand = '||';
                }
                if (nonOperand.length > 0) {
                    operand = operand.trim();
                    if (operand.length > 0) {
                        this.boolString += '###' + argNum++;
                        this.boolOperands.push(operand);
                        operand = '';
                    }
                    this.boolString += nonOperand;
                }
                else {
                    operand += c1;
                }
            }

            if (operand.length > 0) {
                this.boolString += '###' + argNum++;
                this.boolOperands.push(operand.trim());
            }
        }
    }

    public getFilter() {
        return this.filter;
    }

    public isFiltered(messageStore: MessageStore, isBreakpoint?: boolean): boolean {
        if (isBreakpoint) return this.isFilteredNoCache(messageStore, isBreakpoint);
        return messageStore.isFiltered();
    }

    public isFilteredNoCache(messageStore: MessageStore, isBreakpoint?: boolean): boolean {
        const doReturn = (filtered: boolean): boolean => {
            if (!isBreakpoint) messageStore.setFiltered(filtered);
            for (const key in this.pendingDedupMap) {
                if (!filtered) {
                    this.dedupMap[key] = this.pendingDedupMap[key];
                }
                delete this.pendingDedupMap[key];
            }
            return filtered;
        };

        if (!isBreakpoint) {
            // Protocols filter
            const iconClass = messageStore.getIconClass();
            if (filterStore.getSideBarProtocolChecked(iconClass) === undefined) {
                filterStore.setSideBarProtocolChecked(iconClass, true);
            }
            if (this.isSideBarProtocolChecked(iconClass) === false) return doReturn(true);

            // Status filter
            const status = messageStore.getMessage().status;
            if (status) {
                if (filterStore.getSideBarStatusChecked(status) === undefined) {
                    filterStore.setSideBarStatusChecked(status, true);
                }
                if (this.isSideBarStatusChecked(status) === false) return doReturn(true);
            }

            // Domains filter
            const domain = messageStore.getDomain();
            if (domain) {
                if (filterStore.getSideBarDomainChecked(domain) === undefined) {
                    filterStore.setSideBarDomainChecked(domain, true);
                }
                if (this.isSideBarDomainChecked(domain) === false) return doReturn(true);
            }

            // User Agents filter
            let ua = messageStore.getUserAgentDisplayable();
            if (ua) {
                if (filterStore.getSideBarUserAgentChecked(ua) === undefined) {
                    filterStore.setSideBarUserAgentChecked(ua, true);
                }
                if (this.isSideBarUserAgentChecked(ua) === false) return doReturn(true);
            }
        }

        if (this.showErrors && !messageStore.isError() && !messageStore.isNoResponse()) return doReturn(true);

        // Check exclude tags
        if (this.excludeTags.length > 0 && this.isMessageExcluded(messageStore)) return doReturn(true);

        if (this.searchFilter.length === 0 && this.startTime === '' && this.endTime === '') return doReturn(false);
        if (this._logical && this.boolString.length > 0) {
            let boolString = this.boolString;
            for (let i = 0; i < this.boolOperands.length; ++i) {
                const filtered = this.isMessageFiltered(this.boolOperands[i], messageStore);
                boolString = boolString.replace('###' + i, (filtered ? 'false' : 'true'));
            }
            //console.log(boolString);
            try {
                // eslint-disable-next-line no-eval
                return doReturn(!eval(boolString));
            } catch (e) {
                return doReturn(false);
            }
        }
        else {
            return doReturn(this.isMessageFiltered(this.searchFilter, messageStore));
        }
    }

    private isJsonKeyValueMatch(key: string, value: string, operator: string, json: { [key: string]: any }): boolean {
        for (const jsonField of lookupJSONField(json, key)) {
            if (!this.sortByKeys.includes(key)) {
                this.sortByKeys.push(key);
            }

            if (this.isKeyValueMatch(key, value, operator, jsonField.value)) {
                return true;
            }
        }
        return false;
    }

    private isKeyValueMatch(key: string, value: string, operator: string, jsonValue: any) {
        function exit(rc: boolean) {
            // deprecated
            // if (rc) {
            //     mainTabStore.addJsonSearchField(mainTabStore.getSelectedTabName(), key);
            // }
            return rc;
        }

        //console.log(key, value, operator, jsonValue);
        if (value === '*' && (operator === '==' || operator === '===')) {
            if (this.dedup && this.dedupMap[key] === jsonValue) {
                //console.log(key, jsonValue);
                return exit(false); // filter duplicate
            }
            this.pendingDedupMap[key] = jsonValue;
            return exit(true);
        }

        if (typeof jsonValue === 'number') {
            const float = parseFloat(value);
            if (!isNaN(float)) {
                return exit(eval(jsonValue + operator + float));
            }
            const int = parseInt(value);
            if (!isNaN(int)) {
                return exit(eval(jsonValue + operator + int));
            }
            return exit(false);
        } else if (typeof jsonValue === 'string') {
            if (operator === '==') {
                return exit(jsonValue.toLowerCase().includes(value.toLowerCase()));
            } else if (operator === '===') {
                return exit(jsonValue === value);
            } else {
                // const evalString = "'" + jsonValue + "'" + operator + "'" + value + "'";
                // return eval(evalString);
            }
        } else if (typeof jsonValue === 'boolean') {
            if (operator === '==' || operator === '===') {
                return exit(jsonValue && value === 'true' ||
                    !jsonValue && value === 'false');
            }
        }
        return exit(false);
    }

    private parseKeyValue(operand: string): { key: string, value: string | undefined }[] {
        const keyValues: { key: string, value: string | undefined }[] = [];
        const firstColon = operand.indexOf(':');
        const lastColon = operand.lastIndexOf(':');
        let colon = firstColon;
        if (firstColon !== lastColon) {
            const firstPeriod = operand.indexOf('.');
            if (firstPeriod > firstColon && firstPeriod < lastColon) {
                colon = lastColon;
            }
        }
        keyValues.push(getKeyValue(colon));
        if (colon !== lastColon) {
            keyValues.push(getKeyValue(lastColon));
        }

        function getKeyValue(i: number) {
            if (i !== -1 && operand.length > i + 1) {
                const key = operand.substring(0, i);
                let value = operand.substring(i + 1);
                return { key, value };
            } else {
                return { key: operand, value: undefined };
            }
        }
        return keyValues;
    }

    public isJSONFieldOperandMatch(jsonField: string, jsonValue: string): string | false {
        if (this.searchFilter.length === 0 && this.highlightJsonFields.length === 0) return false;
        const jsonFieldLower = jsonField.toLowerCase();
        const jsonValueLower = jsonValue.toLowerCase();
        const operands = this.boolOperands.length > 0 ? this.boolOperands : [this.searchFilter];
        operands.push(...this.highlightJsonFields);
        for (let operand of operands) {
            const operandKeyValues = this.parseKeyValue(operand);
            for (const operandKeyValue of operandKeyValues) {
                if (operandKeyValue.value !== undefined) {
                    let match = false;
                    const operandKeyLower = operandKeyValue.key.toLowerCase();
                    if (operandKeyValue.key.substring(0, 1) === '*') {
                        match = jsonField.endsWith(operandKeyLower.substring(1));
                    } else {
                        match = jsonFieldLower === operandKeyLower || jsonFieldLower.endsWith('.' + operandKeyLower);
                    }
                    if (match) {
                        const out = this.parseValue(operandKeyValue.value);
                        const operator = out.operator;
                        const value = out.value;
                        if (this.isKeyValueMatch(operandKeyValue.key, value, operator, jsonValue)) {
                            return value;
                        } else {
                            return false;
                        }
                    }
                    if (operandKeyValue.key === '*' && jsonValueLower === operandKeyValue.value) return operandKeyValue.value;
                } else {
                    if (operand.startsWith('"') && operand.endsWith('"')) {
                        operand = operand.substring(1, operand.length - 1);
                    }
                    if (operand.length < 3) continue;
                    const operandLower = operand.toLowerCase();
                    const tokens = jsonFieldLower.split('.');
                    const lastField = tokens[tokens.length - 1];
                    if (jsonFieldLower === operandLower ||
                        lastField.startsWith(operandLower) ||
                        jsonFieldLower.endsWith(operandLower)) return operand;
                    if (jsonValueLower.startsWith(operandLower)) return operand;
                    if (jsonValueLower.endsWith(operandLower)) return operand;
                    if (jsonValueLower === operandLower) return operand;
                    if (jsonValueLower.includes(operandLower)) return operand;
                }
            }
        }
        return false;
    }

    // @returns operator
    private parseValue(value: string): { value: string, operator: string } {
        let operator: string;
        if (value.startsWith('>') || value.startsWith('<')) {
            operator = value.substring(0, 1);
            value = value.substring(1);
            if (value.startsWith('=')) {
                operator += value.substring(0, 1);
                value = value.substring(1);
            }
        } else if (value.startsWith('==')) {
            operator = value.substring(0, 2);
            value = value.substring(2);
            if (value.startsWith('=')) {
                operator += value.substring(0, 1);
                value = value.substring(1);
            }
        } else {
            operator = '==';
        }
        return { value, operator };
    }

    private isMessageFiltered(needle: string, messageStore: MessageStore) {
        const message = messageStore.getMessage();

        // Time filter
        if (this.startTime !== '') {
            if (message.protocol === 'log:') {
                if (messageStore.getLogEntry().date < this.startDate) return true;
            } else {
                if (new Date(message.timestamp) < this.startDate) return true;
            }
        }
        if (this.endTime !== '') {
            if (message.protocol === 'log:') {
                if (messageStore.getLogEntry().date > this.endDate) return true;
            } else {
                if (new Date(message.timestamp) > this.endDate) return true;
            }
        }

        if (message.proxyConfig && this.isMatch(needle, message.proxyConfig.protocol)) return false;
        if (this.isMatch(needle, message.protocol)) return false;
        if (message.protocol !== 'log:') {
            if (this.isMatch(needle,
                message.status + ' ' + message.method
                + ' '
                + message.clientIp! + '->' + message.serverHost
                + ' '
                + messageStore.getUrl())) return false;
            if (this.isMatch(needle, message.endpoint)) return false;
            if (this.isMatch(needle, JSON.stringify(message.requestHeaders))) return false;
            if (this.isMatch(needle, JSON.stringify(message.responseHeaders))) return false;
            if (this.isMatch(needle, messageStore.getRequestBody())) return false;
        } else {
            try {
                if (this.isMatch(needle, dateToHHMMSS(messageStore.getLogEntry().date))) return false;
            } catch (e) { }
            if (this.isMatch(needle, messageStore.getLogEntry().kind)) return false;
            if (this.isMatch(needle, messageStore.getLogEntry().category)) return false;
        }
        if (message.responseBody && this.isMatch(needle, this.stringify(message.responseBody))) return false;
        if (messageStore.hasNote() && this.isMatch(needle, messageStore.getNote())) return false;

        // Check for JSON key:value syntax
        const keyValues = this.parseKeyValue(needle);
        for (const keyValue of keyValues) {
            if (keyValue.value !== undefined) {
                const key = keyValue.key;
                let value = keyValue.value;
                const out = this.parseValue(value);
                const operator = out.operator;
                value = out.value;

                if (typeof message.responseBody !== 'string') {
                    if (key === '*' && JSON.stringify(message.responseBody).indexOf(`:"${value}"`) !== -1) {
                        return false;
                    } else {
                        if (this.isJsonKeyValueMatch(key, value, operator, message.responseBody as { [key: string]: any })) return false;
                    }
                }

                if (message.protocol === 'log:') {
                    if (this.isJsonKeyValueMatch(key, value, operator, messageStore.getLogEntry().additionalJSON)) return false;

                    if (key === 'cat' && (operator === '==' || operator === '===')) {
                        if (messageStore.getLogEntry().category.startsWith(value)) return false;
                    }
                    if (key === 'app' && (operator === '==' || operator === '===')) {
                        if (messageStore.getLogEntry().kind.startsWith(value)) return false;
                    }
                } else {
                    if (message.requestBody && typeof message.requestBody === 'object') {
                        if (key === '*' && JSON.stringify(message.requestBody).indexOf(`:"${value}"`) !== -1) {
                            return false;
                        } else {
                            if (this.isJsonKeyValueMatch(key, value, operator, message.requestBody as { [key: string]: any })) return false;
                        }
                    }
                    if (typeof message.requestHeaders === 'object') {
                        if (key === '*' && JSON.stringify(message.requestHeaders).indexOf(`:"${value}"`) !== -1) {
                            return false;
                        } else {
                            if (this.isJsonKeyValueMatch(key, value, operator, message.requestHeaders as { [key: string]: any })) return false;
                        }
                    }
                    if (typeof message.responseHeaders === 'object') {
                        if (key === '*' && JSON.stringify(message.responseHeaders).indexOf(`:"${value}"`) !== -1) {
                            return false;
                        } else {
                            if (this.isJsonKeyValueMatch(key, value, operator, message.responseHeaders as { [key: string]: any })) return false;
                        }
                    }
                    if (message.status !== undefined) {
                        if (key === 'status') {
                            if (this.isKeyValueMatch(key, value, operator, message.status)) {
                                return false;
                            }
                        }
                    }
                    if (message.method !== undefined) {
                        if (key === 'method') {
                            if (this.isKeyValueMatch(key, value, operator, message.method)) {
                                return false;
                            }
                        }
                    }
                    if (message.serverHost && message.serverHost.length > 0) {
                        if (key === 'host') {
                            if (this.isKeyValueMatch(key, value, operator, message.serverHost)) {
                                return false;
                            }
                        }
                    }
                    if (message.url) {
                        if (key === 'url') {
                            if (this.isKeyValueMatch(key, value, operator, message.url)) {
                                return false;
                            }
                        }
                    }
                }

                return true;
            }
        }

        return true;
    }

    private stringify(o: string | {}) {
        return typeof o !== 'string' ? JSON.stringify(o) : o;
    }

    private isMessageExcluded(messageStore: MessageStore) {
        const message = messageStore.getMessage();
        if (message.proxyConfig && this.isExcluded(message.proxyConfig.protocol)) return true;
        if (this.isExcluded(message.protocol)) return true;
        if (message.protocol !== 'log:') {
            if (this.isExcluded(
                message.status + ' ' + message.method
                + ' '
                + message.clientIp! + '->' + message.serverHost
                + ' '
                + messageStore.getUrl())) return true;
            if (this.isExcluded(message.endpoint)) return true;
            if (this.isExcluded(JSON.stringify(message.requestHeaders))) return true;
            if (this.isExcluded(JSON.stringify(message.responseHeaders))) return true;
            if (this.isExcluded(messageStore.getRequestBody())) return true;
        } else {
            if (message.responseBody && this.isExcluded(this.stringify(message.responseBody))) return true;
        }
        return false;
    }

    private isExcluded(haystack: string | undefined): boolean {
        if (haystack === undefined) return false;
        if (!this._excludeMatchCase) {
            haystack = haystack.toLowerCase();
        }

        for (let needle of this.excludeTags) {
            if (!this._excludeMatchCase) {
                needle = needle.toLowerCase();
            }
            if (haystack.indexOf(needle) !== -1) {
                return true;
            }
        }
        return false;
    }

    private isMatch(needle: string, haystack: string | undefined): boolean {
        if (haystack === undefined) return false;
        if (!this._matchCase) {
            needle = needle.toLowerCase();
            haystack = haystack.toLowerCase();
        }

        if (this._regex) {
            return haystack.search(needle) !== -1;
        }
        else {
            return haystack.indexOf(needle) !== -1;
        }
    }
}

export const filterStore = new FilterStore();
