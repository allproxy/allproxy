import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import proxyConfigStore from './ProxyConfigStore';

export default class FilterStore {
    private filter: string = '';
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
    }

    public isFiltered(message: Message) {

        if (this.filter.length === 0) return false;

        if(this.isMatch(this.filter, message.url!)) return false;
        if(this.isMatch(this.filter, message.clientIp!)) return false;
        if(this.isMatch(this.filter, message.endpoint)) return false;
        if(message.requestBody && this.isMatch(this.filter, JSON.stringify(message.requestBody))) return false;
        if(message.responseHeaders && this.isMatch(this.filter, JSON.stringify(message.responseBody))) return false;

		return true;
    }

	private isMatch(needle: string, haystack: string) {
        if(haystack === undefined) return false;

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