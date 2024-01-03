import { makeAutoObservable, action } from "mobx";
import { apFileSystem } from "./APFileSystem";
import { urlPathStore } from "./UrlPathStore";

const QUERIES_DIR = 'queries';
const QUERY_FILE = 'query.txt';

type Query = {
	query: string,
	dirName: string,
}

export default class QueryStore {
	private queries: Query[] = [];
	private applyFilter: string = '';

	public constructor() {
		makeAutoObservable(this);
	}

	public async init(fsType?: 'browserFs' | 'serverFs') {
		this.queries.splice(0, this.queries.length);
		const dirNames = await apFileSystem.readDir(QUERIES_DIR + '/', fsType);
		for (const dirName of dirNames) {
			const exists = await apFileSystem.exists(`${QUERIES_DIR}/${dirName}/${QUERY_FILE}`, fsType);
			let query = '';
			if (exists) {
				query = await apFileSystem.readFile(`${QUERIES_DIR}/${dirName}/${QUERY_FILE}`, fsType);
			}
			this.queries.push({ query, dirName });
		}
		this.queries.sort();

		if (this.queries.length === 0) {
			if (fsType !== 'serverFs' && !urlPathStore.isLocalhost() && !urlPathStore.isGitHubPages()) {
				await this.init('serverFs');
				for (let i = 0; i < this.queries.length; ++i) {
					await this.saveQuery(i, this.queries[i].query);
				}
			}
		}
	}

	public getApplyFilter() {
		return this.applyFilter;
	}
	@action setApplyFilter(filter: string) {
		this.applyFilter = filter;
	}

	public getQueries() {
		return this.queries.map(q => q.query);
	}

	public async getQueriesAsync() {
		await this.init();
		return this.queries.map(q => q.dirName);
	}

	private makeSubDirName() {
		return new Date().toLocaleString().replaceAll('/', '-');
	}

	@action public extend() {
		this.queries.unshift({ query: '', dirName: this.makeSubDirName() });
	}

	private queriesIndexOf(query: string): number {
		for (let i = 0; i < this.queries.length; ++i) {
			if (this.queries[i].query === query) {
				return i;
			}
		}
		return -1;
	}

	@action public async deleteEntry(query: string) {
		const index = this.queriesIndexOf(query);
		if (index !== -1) {
			const dirName = this.queries[index].dirName;
			if (await apFileSystem.exists(QUERIES_DIR + '/' + dirName)) {
				await apFileSystem.deleteFile(QUERIES_DIR + '/' + dirName + '/' + QUERY_FILE);
				await apFileSystem.rmdir(QUERIES_DIR + '/' + dirName);
			}
			this.queries.splice(index, 1);
		}
	}

	public async addAndSaveQuery(query: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			const dirName = this.makeSubDirName();
			this.queries.push({ query, dirName });
			this.saveQuery(this.queries.length - 1, query);
			resolve();
		});
	}

	public async saveQuery(index: number, query: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			this.queries[index].query = query;
			const subDir = this.queries[index].dirName;
			const dir = QUERIES_DIR + '/' + subDir;
			const path = dir + '/' + QUERY_FILE;
			if (!await apFileSystem.exists(dir)) {
				await apFileSystem.mkdir(dir);
			}
			if (await apFileSystem.exists(path)) {
				await apFileSystem.deleteFile(path);
			}
			await apFileSystem.writeFile(path, query);
			resolve();
		});
	}
}

export const queryStore = new QueryStore();
