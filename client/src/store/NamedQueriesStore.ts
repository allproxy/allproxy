import { makeAutoObservable, action } from "mobx";
import FilterStore from "./FilterStore";
import { apFileSystem } from "./APFileSystem";
import { urlPathStore } from "./UrlPathStore";

const proxyQueriesFile = 'proxyQueries.json';
const jsonQueriesFile = 'jsonQueries.json';

export default class NamedQueriesStore {
	private logType: 'proxy' | 'json' = urlPathStore.isLogViewer() ? 'json' : 'proxy';
	private queryList: FilterStore[] = [];
	private filePath: string = urlPathStore.isLogViewer() ? jsonQueriesFile : proxyQueriesFile;

	public constructor() {
		makeAutoObservable(this);
	}

	public getLogType(): 'proxy' | 'json' {
		return this.logType;
	}
	@action public setLogType(logType: 'proxy' | 'json') {
		if (this.logType !== logType) {
			console.log(logType);
			this.logType = logType;
			this.filePath = logType === 'proxy' ? proxyQueriesFile : jsonQueriesFile;
			this.init();
		}
	}

	@action public changed() {
		this.save();
	}

	@action public async init() {
		this.queryList.splice(0, this.queryList.length);
		const queryListJson = await apFileSystem.readFile(this.filePath);
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
		console.log(this.queryList);
	}

	@action private save() {
		const queries = this.queryList.filter(query => query.getName().length > 0 && query.getFilter().length > 0);
		queries.sort((a, b) => a.getName().localeCompare(b.getName()));
		apFileSystem.writeFile(proxyQueriesFile, JSON.stringify(queries));
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

export const namedQueriesStore = new NamedQueriesStore();
