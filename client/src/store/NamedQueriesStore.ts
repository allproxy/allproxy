import { makeAutoObservable, action } from "mobx";
import FilterStore from "./FilterStore";
import { apFileSystem } from "./APFileSystem";
import { urlPathStore } from "./UrlPathStore";

export default class NamedQueriesStore {
	private isSubQuery: boolean;
	private logType: 'proxy' | 'json' = urlPathStore.getApp() === 'jlogviewer' ? 'json' : 'proxy';
	private queryList: FilterStore[] = [];

	public constructor(isSubQuery: boolean) {
		this.isSubQuery = isSubQuery;
		makeAutoObservable(this);
	}

	public isSubQueries() {
		return this.isSubQueries;
	}

	private getFileName() {
		if (this.isSubQuery) {
			return this.logType === 'json' ? 'jsonSubQueries.json' : 'proxySubQueries.json';
		} else {
			return this.logType === 'json' ? 'jsonQueries.json' : 'proxyQueries.json';
		}
	}

	public getLogType(): 'proxy' | 'json' {
		return this.logType;
	}
	@action public setLogType(logType: 'proxy' | 'json') {
		if (this.logType !== logType) {
			this.logType = logType;
			this.init();
		}
	}

	@action public changed() {
		this.save();
	}

	@action public async init() {
		this.queryList.splice(0, this.queryList.length);
		if (await apFileSystem.exists(this.getFileName())) {
			const queryListJson = await apFileSystem.readFile(this.getFileName());
			if (queryListJson) {
				const json = JSON.parse(queryListJson);
				const queries = json.map((entry: {
					name: string,
					searchFilter: string,
				}) => {
					const query = new FilterStore();
					query.setName(entry.name);
					query.setFilterNoDebounce(entry.searchFilter);
					return query;
				});
				this.queryList.push(...queries);
			}
		}
	}

	@action private save() {
		const queries = this.queryList.filter(query => query.getName().length > 0 && query.getFilter().length > 0);
		queries.sort((a, b) => a.getName().localeCompare(b.getName()));
		apFileSystem.writeFile(this.getFileName(), JSON.stringify(queries));
	}

	public getAllQueries() {
		return this.queryList;
	}

	public getQueries() {
		const queries = this.queryList.filter(query => query.getName().length > 0 && query.getFilter().length > 0);
		return queries;
	}

	@action public extend() {
		this.queryList.unshift(new FilterStore());
	}

	@action public deleteEntry(index: number) {
		this.queryList.splice(index, 1);
		this.save();
	}
}

export const namedQueriesStore = new NamedQueriesStore(false);
export const namedSubQueriesStore = new NamedQueriesStore(true);
