import io from 'socket.io';
import TcpProxy from './TcpProxy';
import LogProxy from './LogProxy';
import fs from 'fs';
import path from 'path';
import ProxyConfig from '../../common/ProxyConfig';
import Message from '../../common/Message';
import url from 'url';

const CACHE_JSON = `${__dirname}${path.sep}..${path.sep}..${path.sep}.cache.json`;
const CACHE_SOCKET_ID = 'cache';

interface SocketConfigs { socket ?: io.Socket, configs: ProxyConfig[] };

export default class ProxyConfigs {

    proxyConfigs = new Map<string, SocketConfigs>();

    constructor() {
        this.proxyConfigs = new Map();
        const cache = fs.existsSync(CACHE_JSON) ? fs.readFileSync(CACHE_JSON) : undefined;
        if(cache) {
            const json = JSON.parse(cache.toString());
            this.activateConfig(json.configs);
        }
    }

    addHttpServer(httpServer: any) {
        const server = new io.Server(httpServer);
        server.on('connection', (socket: io.Socket) => this._socketConnection(socket));
    }

    _socketConnection(socket: io.Socket) {
        console.log('ProxyConfigs: socket connected', socket.conn.id);

        socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
            console.log('ProxyConfigs: proxy config received',
                        socket.conn.id,
                        proxyConfigs);

            // Cache the config, to configure the proxy on the next start up prior
            // to receiving the config from the browser.
            fs.writeFileSync(CACHE_JSON,
                                JSON.stringify({configs: proxyConfigs,}, null, 2));

            // Make sure all matching 'any:' protocol servers are closed.
            for(const proxyConfig of proxyConfigs) {
                if(!ProxyConfig.isHttpOrHttps(proxyConfig)) {
                    this.closeAnyServerWithPort(proxyConfig.port);
                }
            }

            this.activateConfig(proxyConfigs, socket);
        })

        socket.on('disconnect', () => {
            console.log('ProxyConfigs: socket disconnect', socket.conn.id);
            this.closeAnyServersWithSocket(socket.conn.id);
            this.proxyConfigs.delete(socket.conn.id);
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

        this.proxyConfigs.set(socket ? socket.conn.id : CACHE_SOCKET_ID,
                                {socket: (socket ? socket : undefined), configs: proxyConfigs});
        if(socket !== undefined) {
            this.closeAnyServersWithSocket(CACHE_SOCKET_ID);
            this.proxyConfigs.delete(CACHE_SOCKET_ID);
        }
    }

    // Close 'any:' protocol servers that are running for the browser owning the socket
    closeAnyServersWithSocket(socketId: string) {
        this.proxyConfigs.forEach((socketConfigs: SocketConfigs, key: string) => {
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
        console.log('closeAnyServerWithPort', port);
        this.proxyConfigs.forEach((socketConfigs: SocketConfigs, key: string) => {
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
        this.proxyConfigs.forEach((socketConfigs: SocketConfigs, key: string) => {
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
        this.proxyConfigs.forEach((socketConfigs: SocketConfigs, key: string) => {
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