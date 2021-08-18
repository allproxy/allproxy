import io from 'socket.io';
import TcpProxy from './TcpProxy';
import LogProxy from './LogProxy';
import fs from 'fs';
import path from 'path';
import ProxyConfig from '../../common/ProxyConfig';
import Message, { MessageType } from '../../common/Message';
import url from 'url';
import net from 'net';
import Ping from './Ping';
import Global from './Global'

const CONFIG_JSON = process.env.NODE_ENV === "production"
    ? `${__dirname}${path.sep}..${path.sep}..${path.sep}..${path.sep}config.json`
    : `${__dirname}${path.sep}.${path.sep}config.json`;
const CACHE_SOCKET_ID = 'cache';
//Global.log('Config file:', CONFIG_JSON);

const WINDOW_SIZE = 64; // windows size - maximum outstanding messages
const MAX_OUT = 2; // two message batches

class SocketInfo {
    socket: io.Socket | undefined = undefined;
    configs: ProxyConfig[] = [];
    seqNum = 0;
    remainingPacingCount = WINDOW_SIZE;
    messagesOut = 0;
    delayedMessages: Message[] = [];

    constructor(socket: io.Socket | undefined, configs: ProxyConfig[]) {
        this.socket = socket;
        this.configs = configs;
    }
};

export default class SocketIoManager {

    private socketIoMap = new Map<string, SocketInfo>();

    constructor() {
        this.activateConfig(this.getConfig());
    }

    private defaultConfig(): ProxyConfig[] {
        // proxy all http by default
        return [
            {
                protocol: 'browser:',
                path: '/',
                hostname: '',
                port: 0,
                recording: true,
                hostReachable: true,
                comment: '',
            },
        ];
    }

    public getConfig(): ProxyConfig[] {
        const configs = fs.existsSync(CONFIG_JSON)
            ? JSON.parse(fs.readFileSync(CONFIG_JSON).toString()).configs : this.defaultConfig();
        let modified = false;
        for (const config of (configs as ProxyConfig[])) {
            if (config.protocol === 'proxy:') {
                config.protocol = 'browser:';
                modified = true;
            }
        }
        modified && this.saveConfig(configs);
        return configs;
    }

    private resolveQueue: ((value: ProxyConfig[]) => void)[] = [];

    public updateHostReachable(): Promise<ProxyConfig[]> {
        return new Promise((resolve) => {
            let configs = this.getConfig();

            this.resolveQueue.push(resolve);
            if (this.resolveQueue.length > 1) return;

            Global.log('Start: updateHostReachable');
            let count = 0;

            const done = () => {
                if (++count === configs.length) {
                    const queueCount = this.resolveQueue.length;
                    let func;
                    while (func = this.resolveQueue.pop()) {
                        func(configs);
                    }
                    Global.log(`End: updateHostReachable (${queueCount})`);
                }
            }
            configs.forEach(config => {
                if (config.protocol === 'browser:' || config.protocol === 'log:') {
                    config.hostReachable = true;
                    done();
                }
                else {
                    config.hostReachable = false;
                    setTimeout(async () => {
                        const pingSuccessful = await Ping.host(config.hostname);
                        if (!pingSuccessful) {
                            done();
                        } else {
                            const socket = net.connect(config.port, config.hostname, () => {
                                config.hostReachable = true;
                                Global.log('Reachable', config.hostname, config.port);
                                socket.end();
                                done();
                            });

                            socket.on('error', (err) => {
                                //Global.log('ProxyConfigs:', config.hostname, config.port, err);
                                done();
                                socket.end();
                            });
                        }
                    });
                }
            });
        });
    }

    private saveConfig(proxyConfigs: ProxyConfig[]) {
        // Cache the config, to configure the proxy on the next start up prior
        // to receiving the config from the browser.
        Global.log(`Updating config file: ${CONFIG_JSON}`)
        fs.writeFileSync(CONFIG_JSON,
            JSON.stringify({ configs: proxyConfigs, }, null, 2));
    }

    addHttpServer(httpServer: any) {
        const server = new io.Server(httpServer);
        server.on('connection', (socket: io.Socket) => this._socketConnection(socket));
    }

    _socketConnection(socket: io.Socket) {
        Global.log('ProxyConfigs: socket connected', socket.conn.id);

        const config = this.getConfig();

        socket.emit('proxy config', config); // send config to browser

        socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
            console.log('ProxyConfigs: proxy config received',
                        socket.conn.id,
                        proxyConfigs);
            this.saveConfig(proxyConfigs);

            // Make sure all matching 'any:' protocol servers are closed.
            for(const proxyConfig of proxyConfigs) {
                if(!ProxyConfig.isHttpOrHttps(proxyConfig)) {
                    this.closeAnyServerWithPort(proxyConfig.port);
                }
            }

            this.activateConfig(proxyConfigs, socket);
            //this.updateHostReachable();
        })

        socket.on('disconnect', () => {
            Global.log('ProxyConfigs: socket disconnect', socket.conn.id);
            this.closeAnyServersWithSocket(socket.conn.id);
            this.socketIoMap.delete(socket.conn.id);
        })

        socket.on('error', (e: any) => {
            Global.error('error', e);
        })
    }

    async activateConfig(proxyConfigs: ProxyConfig[], socket?: io.Socket) {
        for(const proxyConfig of proxyConfigs) {
            if(proxyConfig.protocol === 'log:') {
                new LogProxy(proxyConfig);
            } else if (!ProxyConfig.isHttpOrHttps(proxyConfig)) {
                new TcpProxy(proxyConfig);
            }
        }

        this.socketIoMap.set(socket ? socket.conn.id : CACHE_SOCKET_ID,
                                new SocketInfo((socket ? socket : undefined), proxyConfigs));
        if(socket !== undefined) {
            this.closeAnyServersWithSocket(CACHE_SOCKET_ID);
            this.socketIoMap.delete(CACHE_SOCKET_ID);
        }
    }

    // Close 'any:' protocol servers that are running for the browser owning the socket
    closeAnyServersWithSocket(socketId: string) {
        this.socketIoMap.forEach((socketInfo: SocketInfo, key: string) => {
            if (socketId && key !== socketId) return;
            for(const proxyConfig of socketInfo.configs) {
                if(proxyConfig.protocol === 'log:') {
                    LogProxy.destructor(proxyConfig);
                } else if(!ProxyConfig.isHttpOrHttps(proxyConfig)) {
                    TcpProxy.destructor(proxyConfig);
                }
            }
        })
    }

    // Close 'any:' protocol servers the specified listening port
    closeAnyServerWithPort(port: number) {
        //Global.log('closeAnyServerWithPort', port);
        this.socketIoMap.forEach((socketInfo: SocketInfo, key: string) => {
            for (const proxyConfig of socketInfo.configs) {
                if (!ProxyConfig.isHttpOrHttps(proxyConfig) && proxyConfig.port === port) {
                    TcpProxy.destructor(proxyConfig);
                }
            }
        });
    }

    isMatch(needle: string, haystack: string) {
        if(needle.indexOf('.*') !== -1) {
            const match = haystack.match(needle);
            return match !== null && match.length > 0;
        } else {
            return haystack.startsWith(needle);
        }
    }

    /**
     * Find proxy config matching URL
     * @param {*} reqUrl
     * @returns ProxyConfig
     */
    findProxyConfigMatchingURL(protocol: string, reqUrl: url.UrlWithStringQuery): ProxyConfig|undefined {
        const reqUrlPath = reqUrl.pathname!.replace(/\/\//g, '/');
        const isForwardProxy = reqUrl.protocol !== null;

        let matchingProxyConfig: ProxyConfig|undefined = undefined;
        // Find matching proxy configuration
        this.socketIoMap.forEach((socketInfo: SocketInfo, key: string) => {
            for (const proxyConfig of socketInfo.configs) {
                if (!ProxyConfig.isHttpOrHttps(proxyConfig)) continue;
                if (proxyConfig.protocol !== protocol && proxyConfig.protocol !== 'browser:') continue;
                if (this.isMatch(proxyConfig.path, reqUrlPath) &&
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
    emitMessageToBrowser(messageType:MessageType, message: Message, inProxyConfig?: ProxyConfig) {
        message.type = messageType;
        const path = inProxyConfig ? inProxyConfig.path : '';
        //Global.log('emitMessageToBrowser()', message.url);
        let socketId: string;
        let emitted = false;
        this.socketIoMap.forEach((socketInfo: SocketInfo, key: string) => {
            for (const proxyConfig of socketInfo.configs) {
                if (inProxyConfig === undefined || proxyConfig.path === path) {
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
            Global.log(message.sequenceNumber, 'no browser socket to emit to', message.url);
        }
    }

    private emitMessageWithFlowControl(messages: Message[], socketInfo: SocketInfo, socketId: string) {
        if (socketInfo.remainingPacingCount === 0 || socketInfo.messagesOut >= MAX_OUT) {
            socketInfo.delayedMessages = socketInfo.delayedMessages.concat(messages);
        } else {
            if (socketInfo.socket) {
                // Global.log(messages[0].sequenceNumber,
                //     socketInfo.delayedMessages.length,
                //     'socket emit',
                //     messages[0].url, socketId);
                const batchCount = messages.length;
                socketInfo.remainingPacingCount -= batchCount;
                ++socketInfo.seqNum;
                ++socketInfo.messagesOut;
                socketInfo.socket.emit(
                    'reqResJson',
                    messages,
                    socketInfo.delayedMessages.length,
                    // callback:
                    (response: string) => {
                        --socketInfo.messagesOut;
                        socketInfo.remainingPacingCount += batchCount;

                        console.log(
                            `out=${socketInfo.messagesOut}`,
                            `rpc=${socketInfo.remainingPacingCount}`,
                            `ql=${socketInfo.delayedMessages.length}`,
                            response);

                        const count = Math.min(socketInfo.remainingPacingCount, socketInfo.delayedMessages.length);
                        if (count > 0) {
                            this.emitMessageWithFlowControl(
                                socketInfo.delayedMessages.splice(0, count),
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