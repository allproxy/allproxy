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
const homedir = require('os').homedir();

const MIDDLEMAN_DIR = `${homedir}${path.sep}.middleman`;
const CONFIG_JSON = `${MIDDLEMAN_DIR}${path.sep}config.json`;
const OLD_CACHE_JSON = `${__dirname}${path.sep}..${path.sep}..${path.sep}.cache.json`;
const CACHE_SOCKET_ID = 'cache';

interface SocketConfigs { socket ?: io.Socket, configs: ProxyConfig[] };

export default class ProxyConfigs {

    proxyConfigsMap = new Map<string, SocketConfigs>();

    constructor() {
        if (!fs.existsSync(MIDDLEMAN_DIR)){
            fs.mkdirSync(MIDDLEMAN_DIR);
            if (fs.existsSync(OLD_CACHE_JSON)) {
                fs.copyFileSync(CONFIG_JSON, OLD_CACHE_JSON);
            } else {
                fs.writeFileSync(
                    CONFIG_JSON,
                    JSON.stringify({ configs: this.defaultConfig() }, null, 2)
                );
            }
        }

        this.proxyConfigsMap = new Map();
        this.activateConfig(this.getConfig());
    }

    private defaultConfig(): ProxyConfig[] {
        // proxy all http by default
        return [
            {
                protocol: 'proxy:',
                path: '/',
                hostname: '',
                port: 0,
                recording: true,
                hostReachable: true,
            },
        ];
    }

    public getConfig(): ProxyConfig[] {
        return fs.existsSync(CONFIG_JSON)
            ? JSON.parse(fs.readFileSync(CONFIG_JSON).toString()).configs : [];
    }

    private resolveQueue: ((value: ProxyConfig[]) => void)[] = [];

    public updateHostReachable(): Promise<ProxyConfig[]> {
        return new Promise((resolve) => {
            let configs = this.getConfig();

            this.resolveQueue.push(resolve);
            if (this.resolveQueue.length > 1) return;

            console.log('Start: updateHostReachable');
            let count = 0;

            const done = () => {
                if (++count === configs.length) {
                    const queueCount = this.resolveQueue.length;
                    let func;
                    while (func = this.resolveQueue.pop()) {
                        func(configs);
                    }
                    console.log(`End: updateHostReachable (${queueCount})`);
                }
            }
            configs.forEach(config => {
                if (config.protocol === 'proxy:' || config.protocol === 'log:') {
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
                                console.log('Reachable', config.hostname, config.port);
                                socket.end();
                                done();
                            });

                            socket.on('error', (err) => {
                                //console.log('ProxyConfigs:', config.hostname, config.port, err);
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
        fs.writeFileSync(CONFIG_JSON,
            JSON.stringify({ configs: proxyConfigs, }, null, 2));
    }

    addHttpServer(httpServer: any) {
        const server = new io.Server(httpServer);
        server.on('connection', (socket: io.Socket) => this._socketConnection(socket));
    }

    _socketConnection(socket: io.Socket) {
        console.log('ProxyConfigs: socket connected', socket.conn.id);

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
            this.updateHostReachable();
        })

        socket.on('disconnect', () => {
            console.log('ProxyConfigs: socket disconnect', socket.conn.id);
            this.closeAnyServersWithSocket(socket.conn.id);
            this.proxyConfigsMap.delete(socket.conn.id);
        })

        socket.on('error', (e: any) => {
            console.log('error', e);
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
        //console.log('closeAnyServerWithPort', port);
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
    findProxyConfigMatchingURL(reqUrl: url.UrlWithStringQuery): ProxyConfig|undefined {
        const reqUrlPath = reqUrl.pathname!.replace(/\/\//g, '/');
        const isForwardProxy = reqUrl.protocol !== null;

        let matchingProxyConfig: ProxyConfig|undefined = undefined;
        // Find matching proxy configuration
        this.proxyConfigsMap.forEach((socketConfigs: SocketConfigs, key: string) => {
            for (const proxyConfig of socketConfigs.configs) {
                if (!ProxyConfig.isHttpOrHttps(proxyConfig)) continue;
                if (this.isMatch(proxyConfig.path, reqUrlPath) &&
                    isForwardProxy === (proxyConfig.protocol === 'proxy:')) {
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
        //console.log('emitMessageToBrowser()', message.url);
        let socketId: string;
        this.proxyConfigsMap.forEach((socketConfigs: SocketConfigs, key: string) => {
            for (const proxyConfig of socketConfigs.configs) {
                if (inProxyConfig === undefined || proxyConfig.path === path) {
                    if (key === socketId) continue;
                    socketId = key;
                    message.proxyConfig = proxyConfig;
                    if (socketConfigs.socket) {
                        console.log(message.sequenceNumber, 'socket emit', message.url, socketId);
                        socketConfigs.socket.emit('reqResJson', message);
                    }
                    if (inProxyConfig === undefined) break;
                }
            }
        });
    }

}