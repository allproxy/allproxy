const socketio = require('socket.io');
const NonHttpProxy = require('./NonHttpProxy');

module.exports = class ProxyConfigs {

    constructor() {        
    }

    setHttpServer(httpServer) {
        this.proxyConfigs = {}; // key=socket.conn.id
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
                                            || proxyConfig.protocol === 'https:';
                
                if(!proxyConfig.isHttpOrHttps) {
                    this.closeAnyServerWithPort(proxyConfig.port);
                }
            }

            for(const proxyConfig of proxyConfigs) {
                if(!proxyConfig.isHttpOrHttps) {
                    new NonHttpProxy(proxyConfig);
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
                    NonHttpProxy.destructor(proxyConfig);
                }                                  
            }
        }
    }

    // Close 'any:' protocol servers the specified listening port
    closeAnyServerWithPort(port) {
        for(const key in this.proxyConfigs) {
            for(const proxyConfig of this.proxyConfigs[key].configs) {               
                if(!proxyConfig.isHttpOrHttps && proxyConfig.port === port ) {
                    NonHttpProxy.destructor(proxyConfig);
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
        let matchingProxyConfig = undefined;
        // Find matching proxy configuration
        for(const key in this.proxyConfigs) {            
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(!proxyConfig.isHttpOrHttps) continue;
                if(reqUrl.pathname.startsWith(proxyConfig.path)) {
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
     * @param {*} path - optional path to match
     */
    emitMessageToBrowser(message, path) {
        console.log('emitMessageToBrowser()', path)        
        let done = false;        
        const json = JSON.stringify(message, null, 2);       
        for(const key in this.proxyConfigs) {                  
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(!proxyConfig.isHttpOrHttps && path === undefined 
                    || proxyConfig.isHttpOrHttps && proxyConfig.path === path) {

                    console.log('socket emit', this.proxyConfigs[key].socket.conn.id, path);
                    this.proxyConfigs[key].socket.emit('message', json);
                    if(path === undefined) return;
                    done = true;
                }
            }            
        }
    }

}