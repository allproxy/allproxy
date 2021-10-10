import { makeAutoObservable, action } from "mobx"
import { ConfigProtocol } from "../common/ProxyConfig";
import { ConfigProtocols } from "./SettingsStore";

export const mapProtocolToIndex: Map<ConfigProtocol, number> =
	new Map(Object.values(ConfigProtocols).map((protocol, i) => [protocol, i]));

export class MetricsByProtocol {
	protocol: ConfigProtocol;
	requestCount: number = 0;
	responseCount: number = 0;
	totalTime: number = 0;
	maximumTime: number = 0;
	minimumTime: number = 0;

	constructor(protocol: ConfigProtocol) {
		this.protocol = protocol;
	}
}

export default class MetricsStore {
	private metricsByProtocol: MetricsByProtocol[] = [];

	public constructor() {
		for (const protocol of Object.values(ConfigProtocols)) {
			this.metricsByProtocol.push(new MetricsByProtocol(protocol));
		}
		makeAutoObservable(this);
	}

	public getMetrics(): MetricsByProtocol[] {
		return this.metricsByProtocol;
	}

	@action public clear() {
		let i = 0;
		for (const protocol of Object.values(ConfigProtocols)) {
			this.metricsByProtocol[i++] = new MetricsByProtocol(protocol);
		}
	}
}

export const metricsStore = new MetricsStore();
