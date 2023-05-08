import { makeAutoObservable, action } from "mobx"
import { apFileSystem } from "./APFileSystem";

const QUERIES_DIR = 'queries';
const QUERY_FILE = 'query.txt';

export default class QueryStore {
	private queryFileNames: string[] = [];
	private queries: string[] = [];

	public constructor() {
		makeAutoObservable(this);
	}

	public async init() {
		this.queryFileNames.splice(0, this.queryFileNames.length);
		this.queries.splice(0, this.queries.length);

		const dirNames = await apFileSystem.readDir(QUERIES_DIR + '/');
		for (const dirName of dirNames) {
			this.queryFileNames.push(dirName);
			const exists = await apFileSystem.exists(`${QUERIES_DIR}/${dirName}/${QUERY_FILE}`);
			let query = '';
			if (exists) {
				query = await apFileSystem.readFile(`${QUERIES_DIR}/${dirName}/${QUERY_FILE}`);
			}
			this.queries.push(query);
		}
		this.queries.sort();
	}

	public getQueries() {
		return this.queries;
	}

	@action public extend() {
		this.queries.unshift('');
		this.queryFileNames.unshift(new Date().toLocaleString().replaceAll('/', '-'));
	}

	@action public deleteEntry(index: number) {
		const fileName = this.queryFileNames[index];
		apFileSystem.rmdir(QUERIES_DIR + '/' + fileName);
		this.queryFileNames.splice(index, 1);
		this.queries.splice(index, 1);
	}

	public async addAndSaveQuery(query: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			this.queries.unshift(query);
			this.queryFileNames.unshift(new Date().toLocaleString().replaceAll('/', '-'));
			this.saveQuery(this.queries.length - 1, query);
			resolve();
		})
	}

	public async saveQuery(index: number, query: string): Promise<void> {
		return new Promise<void>(async (resolve) => {
			this.queries[index] = query;
			const subDir = this.queryFileNames[index];
			const dir = QUERIES_DIR + '/' + subDir;
			const path = dir + '/' + QUERY_FILE;
			await apFileSystem.mkdir(dir);
			if (await apFileSystem.exists(path)) {
				await apFileSystem.deleteFile(path);
			}
			await apFileSystem.writeFile(path, query);
			resolve();
		})
	}
}

export const queryStore = new QueryStore();
