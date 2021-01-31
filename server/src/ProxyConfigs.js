const socketio = require('socket.io');
const TcpProxy = require('./TcpProxy');

module.exports = class ProxyConfigs {

    constructor() {
        this.proxyConfigs = {}; // key=socket.conn.id       
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

            for(const proxyConfig of proxyConfigs) {
                if(!proxyConfig.isHttpOrHttps) {
                    new TcpProxy(proxyConfig);
                }
            }

            this.proxyConfigs[socket.conn.id] = {socket, configs: proxyConfigs};
        })

        socket.on('disconnect', () => {
            console.log('ProxyConfigs: socket disconnect', socket.conn.id);
            this.closeAnyServersWithSocket(socket);
            delete this.proxyConfigs[socket.conn.id];            
        })
    }

    // Close 'any:' protocol servers that are running for the browser owning the socket
    closeAnyServersWithSocket(socket) {
        for(const key in this.proxyConfigs) { 
            if(socket && key !== socket.conn.id) continue;               
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                console.log(proxyConfig);
                if(!proxyConfig.isHttpOrHttps) {
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
                if(reqUrlPath.startsWith(proxyConfig.path) && 
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
    emitMessageToBrowser(message, proxyConfig) {
        const path = proxyConfig ? proxyConfig.path : '';        
        //console.log('emitMessageToBrowser()', proxyConfig);
        
        for(const key in this.proxyConfigs) {                
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(proxyConfig === undefined || proxyConfig.path === path) {                    
                    console.log('socket emit', this.proxyConfigs[key].socket.conn.id, path);
                    message.proxyConfig = proxyConfig;
                    const json = JSON.stringify(message, null, 2);                   
                    this.proxyConfigs[key].socket.emit('message', json);
                    if(proxyConfig === undefined) break;                  
                }
            }            
        }
    }

}