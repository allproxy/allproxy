import net from 'net'
import tls from 'tls'

export type ConfigProtocol =
  'browser:'
  | 'grpc:'
  | 'http:'
  | 'https:'
  | 'log:'
  | 'mongo:'
  | 'redis:'
  | 'sql:'
  | 'tcp:';

export default class ProxyConfig {
  path: string = '';
  protocol: ConfigProtocol = 'http:';
  hostname: string = '';
  port: number = 0;
  recording: boolean = true;
  hostReachable: boolean = true;
  logProxyProcess?: any = undefined;
  _server?: net.Server | tls.Server;
  comment:string = '';

  static isHttpOrHttps (config: ProxyConfig): boolean {
    switch (config.protocol) {
      case 'http:':
      case 'https:':
      case 'browser:':
        return true
      default:
        return false
    }
  }
}
