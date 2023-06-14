import { makeAutoObservable, action } from "mobx"
import MessageStore from './MessageStore';
import _ from 'lodash';
import { messageQueueStore } from "./MessageQueueStore";
import { dateToHHMMSS } from "../components/Request";

export default class FilterStore {
    private enabled = true;
    private filter = '';
    private searchFilter = '';
    private boolString = '';
    private boolOperands: string[] = [];
    private resetScroll = false;
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

    public constructor() {
        makeAutoObservable(this);
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

    public shouldResetScroll() {
        return this.resetScroll;
    }

    @action public setResetScroll(value: boolean) {
        this.resetScroll = value;
    }

    public matchCase(): boolean {
        return this._matchCase;
    }

    @action public toggleMatchCase() {
        this._matchCase = !this._matchCase;
    }

    @action public setMatchCase(matchCase: boolean) {
        this._matchCase = matchCase;
    }

    public regex(): boolean {
        return this._regex;
    }

    @action public toggleRegex() {
        this._regex = !this._regex;
    }

    @action public setRegex(regex: boolean) {
        this._regex = regex;
    }

    public logical(): boolean {
        return this._logical;
    }

    @action public toggleLogical() {
        this._logical = !this._logical;
    }

    @action public setLogical(logical: boolean) {
        this._logical = logical;
    }

    public deleteFiltered(): boolean {
        return this._deleteFiltered;
    }

    @action public toggleDeleteFiltered() {
        this._deleteFiltered = !this._deleteFiltered;
    }

    public getShowErrors(): boolean {
        return this.showErrors;
    }

    @action public toggleShowErrors() {
        this.showErrors = !this.showErrors;
        if (!this.showErrors && this.filter.length === 0) {
            this.resetScroll = true;
        }
    }

    @action public setExcludeTags(excludeList: string[]) {
        this.excludeTags = excludeList;
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
        if (this.filter.length > 0 && filter.length === 0 && !this.showErrors) {
            this.resetScroll = true;
        }

        this.filter = filter;
        this.searchFilter = this.filter;
        this.updateBoolString();
        messageQueueStore.setFreeze(false);
    }

    @action public setFilter(filter: string) {
        if (this.filter.length > 0 && filter.length === 0) {
            this.resetScroll = true;
        }

        this.filter = filter;

        const debounce = _.debounce(() => {
            this.searchFilter = this.filter;
            this.updateBoolString();
            messageQueueStore.setFreeze(false);
        }, 500);

        debounce();
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
        if (filter.includes('!')
            || filter.includes('&&')
            || filter.includes('||')) {
            let operand = '';
            for (let i = 0; i < filter.length; ++i) {
                let c1 = filter.substr(i, 1);
                let c2 = i < filter.length - 1 ? filter.substr(i + 1, 1) : '';
                let nonOperand = '';
                if ((c1 === '!' && i === 0) || c1 === '(' || c1 === ')') nonOperand = c1;
                if (c1 === ' ' && c2 === '!') {
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
                    this.boolString += nonOperand.replace('-', '!');
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
            messageStore.setFiltered(filtered);
            return filtered;
        }

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

    private isMessageFiltered(needle: string, messageStore: MessageStore) {
        const message = messageStore.getMessage();
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
