const socketio = require('socket.io');
const TcpProxy = require('./TcpProxy');
const LogProxy = require('./LogProxy');
const fs = require('fs');
const path = require('path');

const CACHE_JSON = `${__dirname}${path.sep}..${path.sep}..${path.sep}.cache.json`;
const CACHE_SOCKET_ID = 'cache';

module.exports = class ProxyConfigs {

    constructor() {
        this.proxyConfigs = {}; // key=socket.conn.id
        const cache = fs.existsSync() ? fs.readFileSync(CACHE_JSON) : undefined;        
        if(cache) {
            const json = JSON.parse(cache.toString());
            console.log(json);
            this.activateConfig({conn: {id: CACHE_SOCKET_ID}}, json.configs);
        }
    }

    addHttpServer(httpServer) {
        socketio.listen(httpServer).on('connection', (socket) => this._socketConnection(socket));
    }

    _socketConnection(socket) {
        console.log('ProxyConfigs: socket connected', socket.conn.id);

        socket.on('proxy config', (proxyConfigs) => {
            console.log('ProxyConfigs: proxy config received', 
                        socket.conn.id, 
                        proxyConfigs);
                        
            // Cache the config, to configure the proxy on the next start up prior
            // to receiving the config from the browser.
            fs.writeFileSync(CACHE_JSON, 
                                JSON.stringify({configs: proxyConfigs,}, null, 2));
            
            // Make sure all matching 'any:' protocol servers are closed.
            for(const proxyConfig of proxyConfigs) {
                console.log(proxyConfig);
                proxyConfig.isHttpOrHttps = proxyConfig.protocol === 'http:' 
                                            || proxyConfig.protocol === 'https:'
                                            || proxyConfig.protocol === 'proxy:';
                
                if(!proxyConfig.isHttpOrHttps) {
                    this.closeAnyServerWithPort(proxyConfig.port);
                }
            }

            this.activateConfig(socket, proxyConfigs);
        })

        socket.on('disconnect', () => {
            console.log('ProxyConfigs: socket disconnect', socket.conn.id);
            this.closeAnyServersWithSocket(socket.conn.id);
            delete this.proxyConfigs[socket.conn.id];            
        })
    }

    activateConfig(socket, proxyConfigs) {
        for(const proxyConfig of proxyConfigs) {
            if(proxyConfig.protocol === 'log:') {
                new LogProxy(proxyConfig);
            } else if(!proxyConfig.isHttpOrHttps) {
                new TcpProxy(proxyConfig);
            }
        }

        this.proxyConfigs[socket.conn.id] = {socket, configs: proxyConfigs};
        if(socket.conn.id !== CACHE_SOCKET_ID) {
            this.closeAnyServersWithSocket(CACHE_SOCKET_ID);
            delete this.proxyConfigs[CACHE_SOCKET_ID];
        }
    }

    // Close 'any:' protocol servers that are running for the browser owning the socket
    closeAnyServersWithSocket(socketId) {
        for(const key in this.proxyConfigs) { 
            if(socketId && key !== socketId) continue;               
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(proxyConfig.protocol === 'log:') {
                    LogProxy.destructor(proxyConfig);
                } else if(!proxyConfig.isHttpOrHttps) {
                    TcpProxy.destructor(proxyConfig);
                }                                  
            }
        }
    }

    // Close 'any:' protocol servers the specified listening port
    closeAnyServerWithPort(port) {
        for(const key in this.proxyConfigs) {
            for(const proxyConfig of this.proxyConfigs[key].configs) {               
                if(!proxyConfig.isHttpOrHttps && proxyConfig.port === port ) {
                    TcpProxy.destructor(proxyConfig);
                }                                  
            }
        }
    }

    isMatch(needle, haystack) {
        if(needle.indexOf('.*') !== -1) {
            return haystack.match(needle) !== -1;
        } else {
            return haystack.startsWith(needle);
        }
    }

    /**
     * Find proxy config matching URL
     * @param {*} reqUrl 
     * @returns ProxyConfig
     */
    findProxyConfigMatchingURL(reqUrl) {
        const reqUrlPath = reqUrl.pathname.replace(/\/\//g, '/');
        const isForwardProxy = reqUrl.protocol !== null;

        let matchingProxyConfig = undefined;
        // Find matching proxy configuration
        for(const key in this.proxyConfigs) {            
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(!proxyConfig.isHttpOrHttps) continue;
                if(this.isMatch(proxyConfig.path, reqUrlPath) && 
                    isForwardProxy === (proxyConfig.protocol === 'proxy:')) {
                    if(matchingProxyConfig === undefined || proxyConfig.path.length > matchingProxyConfig.path.length) {
                        matchingProxyConfig = proxyConfig;
                    }
                }
            }
        }
        return matchingProxyConfig;      
    }

    /**
     * Emit message to browser.
     * @param {*} message 
     * @param {*} proxyConfig
     */
    emitMessageToBrowser(message, inProxyConfig) {
        const path = inProxyConfig ? inProxyConfig.path : '';        
        //console.log('emitMessageToBrowser()', message.url); 
        let socketId;       
        for(const key in this.proxyConfigs) {                
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(inProxyConfig === undefined || proxyConfig.path === path) {
                    const thisSocketId = this.proxyConfigs[key].socket.conn.id;
                    if (thisSocketId == socketId) continue; 
                    socketId = thisSocketId;               
                    console.log(message.sequenceNumber, 'socket emit', message.url, socketId);
                    message.proxyConfig = proxyConfig;                                      
                    this.proxyConfigs[key].socket.emit('reqResJson', message);                   
                    if(inProxyConfig === undefined) break;                  
                }
            }            
        }
    }

}