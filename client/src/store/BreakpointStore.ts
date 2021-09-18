import { makeAutoObservable, action, reaction } from "mobx"
import Message from "../common/Message";
import FilterStore from "./FilterStore";
import MessageStore from "./MessageStore";

const LOCAL_STORAGE = 'anyproxy-breakpoints';

export default class BreakpointStore {
	private breakpointList: FilterStore[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	@action public init() {
		const breakpointListJson = localStorage.getItem(LOCAL_STORAGE);
		if (breakpointListJson) {
			const breakpointList = JSON.parse(breakpointListJson);
			this.breakpointList = breakpointList.map((entry: { searchFilter: string, _matchCase: boolean, _logical: boolean }) => {
				const breakpoint = new FilterStore();
				breakpoint.setFilter(entry.searchFilter);
				breakpoint.setMatchCase(!!entry._matchCase);
				breakpoint.setLogical(!!entry._logical);
				return breakpoint;
			})
		} else {
			this.breakpointList = [];
		}
	}

	@action public save() {
		const breakpointList = this.breakpointList.filter(breakpoint => breakpoint.getFilter().length > 0);
		localStorage.setItem(LOCAL_STORAGE, JSON.stringify(breakpointList));
	}

	private isMatch(needle: string, haystack: string): boolean {
		if (needle.includes('.*')) {
			return haystack.toLowerCase().search(needle.toLowerCase()) !== -1;
		} else {
			return needle.toLowerCase() === haystack.toLowerCase();
		}
	}

	public findMatchingBreakpoint(message: Message): FilterStore | null {
		if (this.breakpointList.length === 0) return null;
		for(const breakpoint of this.breakpointList) {
			if(breakpoint.isEnabled() && !breakpoint.isFiltered(new MessageStore(message))) {
				return breakpoint;
			}
		}
		return null;
	}

	public getBreakpointList() {
		return this.breakpointList;
	}

	@action public extend() {
		this.breakpointList.push(new FilterStore());
	}

	@action public deleteEntry(index: number) {
		this.breakpointList.splice(index, 1);
	}
 }

reaction(() => breakpointStore, () => {
	breakpointStore.save();
});

export const breakpointStore = new BreakpointStore();
