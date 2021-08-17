import { makeAutoObservable, action } from "mobx"

export const PROTOCOLS = [
	'browser:',
	'grpc:',
	'http:',
	'https:',
	'log:',
	'mongo:',
	'redis:',
	'sql:',
	'tcp:',
];

export const mapProtocolToIndex: Map<string, number> =
	new Map(PROTOCOLS.map((protocol, i) => [protocol, i]));

export class MetricsByProtocol {
	protocol: string;
	requestCount: number = 0;
	responseCount: number = 0;
	totalTime: number = 0;
	maximumTime: number = 0;
	minimumTime: number = 0;

	constructor(protocol: string) {
		this.protocol = protocol;
	}
}

export default class MetricsStore {
	private metricsByProtocol: MetricsByProtocol[] = [];

	public constructor() {
		for (const protocol of PROTOCOLS) {
			this.metricsByProtocol.push(new MetricsByProtocol(protocol));
		}
		makeAutoObservable(this);
	}

	public getMetrics() {
		return this.metricsByProtocol;
	}

	@action public clear() {
		let i = 0;
		for (const protocol of PROTOCOLS) {
			this.metricsByProtocol[i++] = new MetricsByProtocol(protocol);
		}
	}
}

export const metricsStore = new MetricsStore();
