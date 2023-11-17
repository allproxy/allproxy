import { makeAutoObservable, action } from "mobx";
import MessageStore, { MessageStoreBase } from './MessageStore';
import _ from 'lodash';
import { messageQueueStore } from "./MessageQueueStore";
import { dateToHHMMSS } from "../components/Request";
import { getJSONValue } from "./JSONLogStore";
import { snapshotStore } from "./SnapshotStore";

export default class FilterStore {
    private enabled = true;
    private filter = '';
    private searchFilter = '';
    private boolString = '';
    private boolOperands: string[] = [];
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

    private sortByKeys: string[] = [];

    public constructor() {
        makeAutoObservable(this);
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
    }

    @action public setFilterNoDebounce(filter: string) {
        this.sortByKeys = [];

        this.filter = filter;
        this.searchFilter = this.filter;
        this.updateBoolString();
        this.filterUpdated();
        messageQueueStore.setFreeze(false);
    }

    @action public filterUpdated() {
        for (const messageStore of messageQueueStore.getMessages()) {
            messageStore.setFiltered(undefined);
        }

        if (messageQueueStore.getScrollToSeqNum() === null && messageQueueStore.getHighlightSeqNum() !== null) {
            messageQueueStore.setScrollToSeqNum(messageQueueStore.getHighlightSeqNum());
        } else {
            const i = snapshotStore.getSelectedSnapshotIndex();
            snapshotStore.getScrollTop()[i] = 0;
            snapshotStore.getScrollTopIndex()[i] = 0;
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

        if (this.searchFilter.length === 0) return doReturn(false);
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
        const jsonValue = getJSONValue(json, key);
        if (jsonValue === undefined) return false;

        if (!this.sortByKeys.includes(key)) {
            this.sortByKeys.push(key);
        }

        if (value === '*' && (operator === '==' || operator === '===')) {
            return true;
        }

        if (typeof jsonValue === 'number') {
            const float = parseFloat(value);
            if (!isNaN(float)) {
                return eval(jsonValue + operator + float);
            }
            const int = parseInt(value);
            if (!isNaN(int)) {
                return eval(jsonValue + operator + int);
            }
            return false;
        } else if (typeof jsonValue === 'string') {
            if (operator === '==') {
                return jsonValue.toLowerCase().includes(value.toLowerCase());
            } else if (operator === '===') {
                console.log(jsonValue, value);
                return jsonValue === value;
            } else {
                // const evalString = "'" + jsonValue + "'" + operator + "'" + value + "'";
                // return eval(evalString);
            }
        } else if (typeof jsonValue === 'boolean') {
            if (operator === '==' || operator === '===') {
                return jsonValue && value === 'true' ||
                    !jsonValue && value === 'false';
            }
        }
        return false;
    }

    private parseKeyValue(operand: string) {
        const i = operand.lastIndexOf(':');
        if (i !== -1 && operand.length > i + 1) {
            const key = operand.substring(0, i);
            let value = operand.substring(i + 1);
            return { key, value };
        } else {
            return { key: operand, value: undefined };
        }
    }

    public isJSONFieldOperandMatch(jsonField: string, jsonValue: string): boolean {
        if (this.searchFilter.length === 0) return false;
        const jsonFieldLower = jsonField.toLowerCase();
        const jsonValueLower = jsonValue.toLowerCase();
        const operands = this.boolOperands.length > 0 ? this.boolOperands : [this.searchFilter];
        for (const operand of operands) {
            const keyValue = this.parseKeyValue(operand);
            if (keyValue.value !== undefined) {
                if (jsonFieldLower === keyValue.key.toLowerCase()) return true;
                if (keyValue.key === '*' && jsonValueLower === keyValue.value) return true;
            } else {
                if (jsonFieldLower.endsWith(operand.toLowerCase())) return true;
                if (jsonValueLower === operand.toLowerCase()) return true;
            }
        }
        return false;
    }

    private isMessageFiltered(needle: string, messageStore: MessageStore) {
        const message = messageStore.getMessage();

        // Check for JSON key:value syntax
        const keyValue = this.parseKeyValue(needle);
        if (keyValue.value !== undefined) {
            const key = keyValue.key;
            let value = keyValue.value;
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
            if (key === 'cat' && (operator === '==' || operator === '===')) {
                if (messageStore.getLogEntry().category.startsWith(value)) return false;
            }
            if (key === 'app' && (operator === '==' || operator === '===')) {
                if (messageStore.getLogEntry().appName.startsWith(value)) return false;
            }
            if (typeof message.requestBody !== 'string') {
                if (key === '*' && JSON.stringify(message.requestBody).indexOf(`:"${value}"`) !== -1) {
                    return false;
                } else {
                    if (this.isJsonKeyValueMatch(key, value, operator, message.requestBody as { [key: string]: any })) return false;
                }
            }
            if (typeof message.responseBody !== 'string') {
                if (key === '*' && JSON.stringify(message.responseBody).indexOf(`:"${value}"`) !== -1) {
                    return false;
                } else {
                    if (this.isJsonKeyValueMatch(key, value, operator, message.responseBody as { [key: string]: any })) return false;
                }
            }
            if (this.isJsonKeyValueMatch(key, value, operator, messageStore.getLogEntry().additionalJSON)) return false;
            return true;
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
        }
        if (message.responseBody && this.isMatch(needle, this.stringify(message.responseBody))) return false;
        if (messageStore.hasNote() && this.isMatch(needle, messageStore.getNote())) return false;
        return true;
    }

    private stringify(o: string | {}) {
        return typeof o !== 'string' ? JSON.stringify(o) : o;
    }

    private isMessageExcluded(messageStore: MessageStoreBase) {
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
