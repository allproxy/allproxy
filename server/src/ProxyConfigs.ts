import io from 'socket.io';
import TcpProxy from './TcpProxy';
import LogProxy from './LogProxy';
import fs from 'fs';
import path from 'path';
import ProxyConfig from '../../common/ProxyConfig';
import Message from '../../common/Message';
import url from 'url';
import net from 'net';
import Ping from './Ping';
import Global from './Global'

const CONFIG_JSON = process.env.NODE_ENV === "production"
    ? `${__dirname}${path.sep}..${path.sep}..${path.sep}..${path.sep}config.json`
    : `${__dirname}${path.sep}.${path.sep}config.json`;
const CACHE_SOCKET_ID = 'cache';
//Global.log('Config file:', CONFIG_JSON);

interface SocketConfigs { socket?: io.Socket, configs: ProxyConfig[] };

class SocketMessage {
    public refCount: number = 0;
    public message: Message;

    public constructor(message: Message) {
        this.message = message;
    }
}

export default class ProxyConfigs {

    private proxyConfigsMap = new Map<string, SocketConfigs>();

    // Message retransmission queue.
    private socketSeqNum = 0;
    private socketRetransmissionMap = new Map<number, SocketMessage>();

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
            this.doSocketRetransmit(this.proxyConfigsMap.get(socket.conn.id));
            //this.updateHostReachable();
        })

        socket.on('disconnect', () => {
            Global.log('ProxyConfigs: socket disconnect', socket.conn.id);
            this.closeAnyServersWithSocket(socket.conn.id);
            this.proxyConfigsMap.delete(socket.conn.id);
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

        this.proxyConfigsMap.set(socket ? socket.conn.id : CACHE_SOCKET_ID,
                                {socket: (socket ? socket : undefined), configs: proxyConfigs});
        if(socket !== undefined) {
            this.closeAnyServersWithSocket(CACHE_SOCKET_ID);
            this.proxyConfigsMap.delete(CACHE_SOCKET_ID);
        }
    }

    // Close 'any:' protocol servers that are running for the browser owning the socket
    closeAnyServersWithSocket(socketId: string) {
        this.proxyConfigsMap.forEach((socketConfigs: SocketConfigs, key: string) => {
            if (socketId && key !== socketId) return;
            for(const proxyConfig of socketConfigs.configs) {
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
        this.proxyConfigsMap.forEach((socketConfigs: SocketConfigs, key: string) => {
            for (const proxyConfig of socketConfigs.configs) {
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
        this.proxyConfigsMap.forEach((socketConfigs: SocketConfigs, key: string) => {
            for (const proxyConfig of socketConfigs.configs) {
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
    emitMessageToBrowser(message: Message, inProxyConfig?: ProxyConfig) {
        const path = inProxyConfig ? inProxyConfig.path : '';
        //Global.log('emitMessageToBrowser()', message.url);
        let socketId: string;
        let emitted = false;
        const socketSeqNum = ++this.socketSeqNum;
        const socketMessage = new SocketMessage(message);
        this.socketRetransmissionMap.set(socketSeqNum, socketMessage);
        this.proxyConfigsMap.forEach((socketConfigs: SocketConfigs, key: string) => {
            for (const proxyConfig of socketConfigs.configs) {
                if (inProxyConfig === undefined || proxyConfig.path === path) {
                    if (key === socketId) continue;
                    if (!proxyConfig.recording) continue;
                    socketId = key;
                    message.proxyConfig = proxyConfig;
                    if (socketConfigs.socket) {
                        Global.log(message.sequenceNumber, socketSeqNum, 'socket emit', message.url, socketId);
                        socketMessage.refCount++;
                        socketConfigs.socket.emit(
                            'reqResJson', socketSeqNum, message,
                            (response: string) => {
                                Global.log(this.socketRetransmissionMap.size, response);
                                socketMessage.refCount--;
                                if (socketMessage.refCount === 0) {
                                    this.socketRetransmissionMap.delete(socketSeqNum);
                                }
                            }
                        );
                        emitted = true;
                    }
                    if (inProxyConfig === undefined) break;
                }
            }
        });
        if (!emitted) {
            Global.log(message.sequenceNumber, 'no browser socket to emit to', message.url);
            this.socketRetransmissionMap.delete(socketSeqNum);
        }
    }

    private doSocketRetransmit(socketConfigs: SocketConfigs | undefined) {
        if (socketConfigs === undefined) {
            Global.log('Socket config is undefined?');
            return;
        }

        Global.log('retransmit queue count', this.socketRetransmissionMap.size);

        this.socketRetransmissionMap.forEach((socketMessage, socketSeqNum) => {
            if (socketConfigs.socket) {
                const message = socketMessage.message;
                // If message sequence number is old, don't retransmit it.
                if (this.socketSeqNum < Global.nextSequenceNumber - 1000) {
                    Global.log(message.sequenceNumber, socketSeqNum, 'delete old retransmit message', message.url);
                    this.socketRetransmissionMap.delete(socketSeqNum);
                }
                else {
                    Global.log(message.sequenceNumber, socketSeqNum, 'retransmit socket emit', message.url);
                    socketConfigs.socket.emit(
                        'reqResJson', socketSeqNum, message,
                        (response: string) => {
                            Global.log('retransmit ', this.socketRetransmissionMap.size, response);
                            socketMessage.refCount--;
                            if (socketMessage.refCount === 0) {
                                this.socketRetransmissionMap.delete(socketSeqNum);
                            }
                        }
                    );
                }
            }
        })
    }

}