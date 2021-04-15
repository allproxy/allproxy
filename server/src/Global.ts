import ProxyConfigs from './ProxyConfigs';
export default class Global {
    static proxyConfigs: ProxyConfigs;
    static nextSequenceNumber: number = 0;
}