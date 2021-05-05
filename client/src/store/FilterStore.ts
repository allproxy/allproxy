import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import MessageStore from './MessageStore';

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

    public getFilter() {
        return this.filter;
    }

    public isFiltered(messageStore: MessageStore) {

        if (this.filter.length === 0) return false;
        const message = messageStore.getMessage();
        if (this.isMatch(message.clientIp!+'->'+message.serverHost)) return false;
        if (this.isMatch(message.endpoint)) return false;
        if (this.isMatch(messageStore.getUrl())) return false;
        if (this.isMatch(JSON.stringify(message.requestHeaders))) return false;
        if (this.isMatch(JSON.stringify(message.responseHeaders))) return false;
        if(this.isMatch(messageStore.getRequestBody())) return false;
        if (message.responseBody && this.isMatch(JSON.stringify(message.responseBody))) return false;


		return true;
    }

	private isMatch(haystack: string) {
        if (haystack === undefined) return false;

        const needle = this.filter;

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