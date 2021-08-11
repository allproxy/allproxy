import { makeAutoObservable, action } from "mobx"
import MessageStore from './MessageStore';
import _ from 'lodash';

export default class FilterStore {
    private filter = '';
    private invalidFilterSyntax = false;
    private searchFilter = '';
    private boolString = '';
    private boolOperands: string[] = [];
    private resetScroll = false;

    public constructor() {
		makeAutoObservable(this);
    }

    public shouldResetScroll() {
        return this.resetScroll;
    }

    @action public setResetScroll(value: boolean) {
        this.resetScroll = value;
    }

    @action public setFilter(filter: string) {
        if (this.filter.length > 0 && filter.length === 0) {
            this.resetScroll = true;
        }

        this.filter = filter;

        const debounce = _.debounce(() => {
            this.searchFilter = this.filter;
            this.updateBoolString();
        }, 500);

        debounce();
    }

    public isInvalidFilterSyntax(): boolean {
        return this.invalidFilterSyntax;
    }

    private updateBoolString() {
        this.boolString = '';
        this.boolOperands.splice(0, this.boolOperands.length);
        let argNum = 0;
        if (this.filter.includes('!')
            || this.filter.includes('&&')
            || this.filter.includes('||')) {
            let operand = '';
            for (let i = 0; i < this.filter.length; ++i) {
                let c1 = this.filter.substr(i, 1);
                let c2 = i < this.filter.length - 1 ? this.filter.substr(i + 1, 1) : '';
                let nonOperand = '';
                if (c1 === '!' || c1 === '(' || c1 === ')') nonOperand = c1;
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

    public isFiltered(messageStore: MessageStore) {
        this.invalidFilterSyntax = false;
        if (this.searchFilter.length === 0) return false;
        if (this.boolString.length > 0) {
            let boolString = this.boolString;
            for (let i = 0; i < this.boolOperands.length; ++i) {
                const filtered = this.isMessageFiltered(this.boolOperands[i], messageStore);
                boolString = boolString.replace('###'+i, (filtered ? 'false' : 'true'));
            }
            //console.log(boolString);
            try {
                return !eval(boolString);
            } catch (e) {
                this.invalidFilterSyntax = true;
                return true;
            }
        }
        else {
            return this.isMessageFiltered(this.searchFilter, messageStore);
        }
    }

    private isMessageFiltered(needle: string, messageStore: MessageStore) {
        const message = messageStore.getMessage();
        if (this.isMatch(needle, message.clientIp!+'->'+message.serverHost)) return false;
        if (this.isMatch(needle, message.endpoint)) return false;
        if (this.isMatch(needle, messageStore.getUrl())) return false;
        if (this.isMatch(needle, JSON.stringify(message.requestHeaders))) return false;
        if (this.isMatch(needle, JSON.stringify(message.responseHeaders))) return false;
        if(this.isMatch(needle, messageStore.getRequestBody())) return false;
        if (message.responseBody && this.isMatch(needle, JSON.stringify(message.responseBody))) return false;
    	return true;
    }

	private isMatch(needle: string, haystack: string) {
        if (haystack === undefined) return false;
        if(needle === needle.toLowerCase()) {
            haystack = haystack.toLowerCase();
        }

        if(needle.indexOf('.*') !== -1) {
            return haystack.search(needle) !== -1;
        }
        else {
            return haystack.indexOf(needle) !== -1;
        }
    }
}

export const filterStore = new FilterStore();