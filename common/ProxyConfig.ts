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
  | 'mysql:'
  | 'tcp:';

export default class ProxyConfig {
  isSecure: boolean = false;
  path: string = '';
  protocol: ConfigProtocol = 'http:';
  hostname: string = '';
  port: number = 0;
  recording: boolean = true;
  hostReachable: boolean = true;
  logProxyProcess?: any = undefined;
  _server?: net.Server | tls.Server;
  comment:string = '';
}
