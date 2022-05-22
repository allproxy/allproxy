import ProxyConfig from './ProxyConfig';

export const NO_RESPONSE = 'No Response';
export enum MessageType {
  // eslint-disable-next-line no-unused-vars
  REQUEST,
  // eslint-disable-next-line no-unused-vars
  RESPONSE,
  // eslint-disable-next-line no-unused-vars
  REQUEST_AND_RESPONSE,
}

export type MessageProtocol =
  | 'http:'
  | 'https:'
  | 'log:'
  | 'mongo:'
  | 'redis:'
  | 'mysql:'
  | 'tcp:';

export default class Message {
  type: MessageType = MessageType.REQUEST_AND_RESPONSE;
  timestamp: number = 0;
  sequenceNumber: number = 0;
  sequenceNumberRes: number = 0;
  requestHeaders: { [key: string]: string } = {};
  responseHeaders: { [key: string]: string } = {};
  method: string | undefined = '';
  protocol: MessageProtocol | '' = '';
  url: string | undefined = '';
  endpoint: string = '';
  requestBody: string | { [key: string]: any } = '';
  responseBody: { [key: string]: any } | string = '';
  clientIp: string | undefined = '';
  serverHost: string = '';
  path: string = '';
  elapsedTime: number = 0;
  status: number = 0;
  proxyConfig?: ProxyConfig = undefined;
  modified = false;
};
