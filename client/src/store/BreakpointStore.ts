import { makeAutoObservable, action } from "mobx"
import Message from "../common/Message";
import FilterStore from "./FilterStore";
import MessageStore from "./MessageStore";
import { socketStore } from "./SocketStore";

const LOCAL_STORAGE = 'allproxy-breakpoints';

export default class BreakpointStore {
	private breakpointList: FilterStore[] = [];
	private _editing = false;

	private messageStore: MessageStore | null = null;
	private breakpointCallback: any;

	public constructor() {
		makeAutoObservable(this);
	}

	@action public editing(editing: boolean) {
		this._editing = editing;
	}

	@action public changed() {
		this.save();
	}

	@action public init() {
		const breakpointListJson = localStorage.getItem(LOCAL_STORAGE);
		if (breakpointListJson) {
			const breakpointList = JSON.parse(breakpointListJson);
			this.breakpointList = breakpointList.map((entry: {
				enabled: boolean,
				searchFilter: string,
				_matchCase: boolean,
				_regex: boolean,
				_logical: boolean
			}) => {
				const breakpoint = new FilterStore();
				breakpoint.setEnabled(entry.enabled);
				breakpoint.setFilterNoDebounce(entry.searchFilter);
				breakpoint.setRegex(entry._regex);
				breakpoint.setMatchCase(!!entry._matchCase);
				breakpoint.setLogical(!!entry._logical);
				return breakpoint;
			})
		} else {
			this.breakpointList = [];
		}
		this.emitBreakpoint();
	}

	@action private save() {
		const breakpointList = this.breakpointList.filter(breakpoint => breakpoint.getFilter().length > 0);
		localStorage.setItem(LOCAL_STORAGE, JSON.stringify(breakpointList));
		this.emitBreakpoint();
	}

	private emitBreakpoint() {
		const enabledBreakpoint = this.breakpointList.find(breakpoint => breakpoint.isEnabled());
		socketStore.emitBreakpoint(enabledBreakpoint !== undefined);
	}

	public findMatchingBreakpoint(message: Message): FilterStore | null {
		if (this.breakpointList.length === 0 || this._editing) return null;
		for (const breakpoint of this.breakpointList) {
			if (breakpoint.isEnabled() && !breakpoint.isFiltered(new MessageStore(message))) {
				return breakpoint;
			}
		}
		return null;
	}

	public getBreakpointList() {
		return this.breakpointList;
	}

	public getBreakpointCount(): number {
		return this.breakpointList.filter(b => b.isEnabled()).length
	}

	@action public extend() {
		this.breakpointList.push(new FilterStore());
	}

	@action public deleteEntry(index: number) {
		this.breakpointList.splice(index, 1);
		this.save();
	}

	@action public openBreakpointResponseModal(messageStore: MessageStore, callback: any) {
		this.messageStore = messageStore;
		this.breakpointCallback = callback;
	}

	@action public closeBreakpointResponseModal() {
		const message = this.messageStore!.getMessage();
		message!.modified = true;
		this.breakpointCallback(message);
		this.messageStore = null;
	}

	public getMessageStore() {
		return this.messageStore;
	}

}

export const breakpointStore = new BreakpointStore();
