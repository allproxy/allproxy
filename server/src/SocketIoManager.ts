import io from 'socket.io';
import TcpProxy from './TcpProxy';
import LogProxy from './LogProxy';
import fs from 'fs';
import ProxyConfig from '../../common/ProxyConfig';
import Message, { MessageType } from '../../common/Message';
import url from 'url';
import net from 'net';
import Ping from './Ping';
import resend from './Resend';
import GrpcProxy from './GrpcProxy';
import Paths from './Paths';
import Global from './Global';

const USE_HTTP2 = true;
const CONFIG_JSON = Paths.configJson();
const CACHE_SOCKET_ID = 'cache';

const WINDOW_SIZE = 500; // windows size - maximum outstanding messages
const MAX_OUT = 2; // two message batches

class SocketInfo {
    socket: io.Socket | undefined = undefined;
    configs: ProxyConfig[] = [];
    seqNum = 0;
    remainingWindow = WINDOW_SIZE;
    messagesOut = 0;
    queuedMessages: Message[] = [];

    constructor (socket: io.Socket | undefined, configs: ProxyConfig[]) {
      this.socket = socket;
      this.configs = configs;
    }
};

export default class SocketIoManager {
    private socketIoMap = new Map<string, SocketInfo>();

    constructor () {
      this.activateConfig(this.getConfig());
    }

    private defaultConfig (): ProxyConfig[] {
      // proxy all http by default
      return [
        {
          isSecure: false,
          protocol: 'browser:',
          path: '/',
          hostname: '',
          port: 0,
          recording: true,
          hostReachable: true,
          comment: ''
        }
      ];
    }

    public getConfig (): ProxyConfig[] {
      const configs = fs.existsSync(CONFIG_JSON)
        ? JSON.parse(fs.readFileSync(CONFIG_JSON).toString()).configs
        : this.defaultConfig();
      let modified = false;
      for (const config of (configs as ProxyConfig[])) {
        if (config.protocol as string === 'proxy:') {
          config.protocol = 'browser:';
          modified = true;
        }
      }
      modified && this.saveConfig(configs);
      return configs;
    }

    private resolveQueue: ((value: ProxyConfig[]) => void)[] = [];

    public updateHostReachable (): Promise<ProxyConfig[]> {
      return new Promise((resolve) => {
        const configs = this.getConfig();

        this.resolveQueue.push(resolve);
        if (this.resolveQueue.length > 1) return;

        let count = 0;

        const done = () => {
          if (++count === configs.length) {
            // const queueCount = this.resolveQueue.length
            let func;
            // eslint-disable-next-line no-cond-assign
            while (func = this.resolveQueue.pop()) {
              func(configs);
            }
          }
        };
        configs.forEach(config => {
          if (config.protocol === 'browser:' || config.protocol === 'log:') {
            config.hostReachable = true;
            done();
          } else {
            config.hostReachable = false;
            setTimeout(async () => {
              const pingSuccessful = await Ping.host(config.hostname);
              if (!pingSuccessful) {
                done();
              } else {
                const socket = net.connect(config.port, config.hostname, () => {
                  config.hostReachable = true;
                  socket.end();
                  done();
                });

                socket.on('error', (_err) => {
                  done();
                  socket.end();
                });
              }
            });
          }
        });
      });
    }

    private saveConfig (proxyConfigs: ProxyConfig[]) {
      // Cache the config, to configure the proxy on the next start up prior
      // to receiving the config from the browser.
      fs.writeFileSync(CONFIG_JSON,
        JSON.stringify({ configs: proxyConfigs }, null, 2));
    }

    addHttpServer (httpServer: any) {
      const server = new io.Server(httpServer);
      server.on('connection', (socket: io.Socket) => this._socketConnection(socket));
    }

    _socketConnection (socket: io.Socket) {
      const config = this.getConfig();

      socket.emit('port config', Global.portConfig); // send port config to browser

      socket.emit('proxy config', config); // send config to browser

      socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
        console.log(`${Paths.configJson()}:\n`, proxyConfigs);
        this.saveConfig(proxyConfigs);

        // Make sure all matching connection based servers are closed.
        for (const proxyConfig of proxyConfigs) {
          if (proxyConfig._server) {
            this.closeAnyServerWithPort(proxyConfig.port);
          }
        }

        this.activateConfig(proxyConfigs, socket);
        // this.updateHostReachable();
      });

      socket.on('resend', (
        forwardProxy: boolean,
        method: string,
        url: string,
        message: Message,
        body?: string | object
      ) => {
        resend(forwardProxy, method, url, message, body);
      });

      socket.on('disconnect', () => {
        this.closeAnyServersWithSocket(socket.conn.id);
        this.socketIoMap.delete(socket.conn.id);
      });

      socket.on('error', (e: any) => {
        console.error('error', e);
      });
    }

    async activateConfig (proxyConfigs: ProxyConfig[], socket?: io.Socket) {
      for (const proxyConfig of proxyConfigs) {
        if (proxyConfig.protocol === 'log:') {
          // eslint-disable-next-line no-new
          new LogProxy(proxyConfig);
        } else if (proxyConfig.protocol === 'grpc:' && USE_HTTP2) {
          GrpcProxy.reverseProxy(proxyConfig);
        } else if (
          proxyConfig.protocol !== 'http:' &&
          proxyConfig.protocol !== 'https:' &&
          proxyConfig.protocol !== 'browser:'
        ) {
          // eslint-disable-next-line no-new
          new TcpProxy(proxyConfig);
        }
      }

      this.socketIoMap.set(socket ? socket.conn.id : CACHE_SOCKET_ID,
        new SocketInfo((socket || undefined), proxyConfigs));
      if (socket !== undefined) {
        this.closeAnyServersWithSocket(CACHE_SOCKET_ID);
        this.socketIoMap.delete(CACHE_SOCKET_ID);
      }
    }

    // Close 'any:' protocol servers that are running for the browser owning the socket
    closeAnyServersWithSocket (socketId: string) {
      this.socketIoMap.forEach((socketInfo: SocketInfo, key: string) => {
        if (socketId && key !== socketId) return;
        for (const proxyConfig of socketInfo.configs) {
          if (proxyConfig.protocol === 'log:') {
            LogProxy.destructor(proxyConfig);
          } if (proxyConfig.protocol === 'grpc:') {
            GrpcProxy.destructor(proxyConfig);
          } else if (proxyConfig._server) {
            TcpProxy.destructor(proxyConfig);
          }
        }
      });
    }

    // Close 'any:' protocol servers the specified listening port
    closeAnyServerWithPort (port: number) {
      this.socketIoMap.forEach((socketInfo: SocketInfo, _key: string) => {
        for (const proxyConfig of socketInfo.configs) {
          if (proxyConfig._server && proxyConfig.port === port) {
            if (proxyConfig.protocol === 'grpc:' && USE_HTTP2) {
              GrpcProxy.destructor(proxyConfig);
            } else {
              TcpProxy.destructor(proxyConfig);
            }
          }
        }
      });
    }

    isMatch (needle: string, haystack: string) {
      if (needle.indexOf('.*') !== -1) {
        const match = haystack.match(needle);
        return match !== null && match.length > 0;
      } else {
        return haystack.startsWith(needle);
      }
    }

    /**
     * Find proxy config matching URL
     * @params protocol
     * @params clientHostName
     * @param {*} reqUrl
     * @param isForwardProxy
     * @returns ProxyConfig
     */
    findProxyConfigMatchingURL (
      protocol: 'http:' | 'https:',
      clientHostName: string,
      reqUrl: url.UrlWithStringQuery,
      proxyType: 'forward' | 'reverse' = 'reverse'
    ): ProxyConfig|undefined {
      const reqUrlPath = reqUrl.pathname!.replace(/\/\//g, '/');
      const isForwardProxy = proxyType === 'forward';

      let matchingProxyConfig: ProxyConfig|undefined;
      // Find matching proxy configuration
      this.socketIoMap.forEach((socketInfo: SocketInfo, _key: string) => {
        for (const proxyConfig of socketInfo.configs) {
          if (proxyConfig.protocol !== protocol && proxyConfig.protocol !== 'browser:') continue;
          if ((this.isMatch(proxyConfig.path, reqUrlPath) ||
                    this.isMatch(proxyConfig.path, clientHostName + reqUrlPath)) &&
                    isForwardProxy === (proxyConfig.protocol === 'browser:')) {
            if (matchingProxyConfig === undefined || proxyConfig.path.length > matchingProxyConfig.path.length) {
              matchingProxyConfig = proxyConfig;
            }
          }
        }
      });
      return matchingProxyConfig;
    }

    /**
     * Emit message to browser.
     * @param {*} message
     * @param {*} proxyConfig
     */
    emitMessageToBrowser (messageType:MessageType, message: Message, inProxyConfig?: ProxyConfig) {
      message.type = messageType;
      const path = inProxyConfig ? inProxyConfig.path : '';
      let socketId: string;
      let emitted = false;
      this.socketIoMap.forEach((socketInfo: SocketInfo, key: string) => {
        for (const proxyConfig of socketInfo.configs) {
          if (inProxyConfig === undefined ||
                (proxyConfig.path === path && inProxyConfig.protocol === proxyConfig.protocol)) {
            if (key === socketId) continue;
            if (!proxyConfig.recording) continue;
            socketId = key;
            message.proxyConfig = proxyConfig;
            if (socketInfo.socket) {
              this.emitMessageWithFlowControl([message], socketInfo, socketId);
              emitted = true;
            }
            if (inProxyConfig === undefined) break;
          }
        }
      });
      if (!emitted) {
        // console.error(message.sequenceNumber, 'no browser socket to emit to', message.url)
      }
    }

    private emitMessageWithFlowControl (messages: Message[], socketInfo: SocketInfo, socketId: string) {
      if (socketInfo.remainingWindow === 0 || socketInfo.messagesOut >= MAX_OUT) {
        socketInfo.queuedMessages = socketInfo.queuedMessages.concat(messages);
      } else {
        if (socketInfo.socket) {
          const batchCount = messages.length;
          socketInfo.remainingWindow -= batchCount;
          ++socketInfo.seqNum;
          ++socketInfo.messagesOut;
          socketInfo.socket.emit(
            'reqResJson',
            messages,
            socketInfo.queuedMessages.length,
            // callback:
            (_response: string) => {
              --socketInfo.messagesOut;
              socketInfo.remainingWindow += batchCount;

              // console.log(
              //             `out=${socketInfo.messagesOut}`,
              //             `win=${socketInfo.remainingWindow}`,
              //             `queued=${socketInfo.queuedMessages.length}`,
              //             `(${response})`)

              const count = Math.min(socketInfo.remainingWindow, socketInfo.queuedMessages.length);
              if (count > 0) {
                this.emitMessageWithFlowControl(
                  socketInfo.queuedMessages.splice(0, count),
                  socketInfo,
                  socketId
                );
              }
            }
          );
        }
      }
    }
}
