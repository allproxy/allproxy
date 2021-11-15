import { makeAutoObservable, action } from "mobx"
import PortConfig from '../common/PortConfig';


class PortConfigStore {
	private portConfig: PortConfig;

	constructor(portConfig: PortConfig) {
		this.portConfig = portConfig;
		makeAutoObservable(this);
	}

	@action public setConfig(portConfig: PortConfig) {
		portConfigStore.portConfig = portConfig;
	}

	public getConfig() {
		return this.portConfig;
	}
}

let portConfigStore: PortConfigStore = new PortConfigStore(new PortConfig());
export default portConfigStore;