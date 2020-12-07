const socketio = require('socket.io');

module.exports = class ProxyConfigs {

    constructor() {        
    }

    setHttpServer(httpServer) {
        this.proxyConfigs = {}; // key=socket.conn.id
        socketio.listen(httpServer).on('connection', (socket) => this._socketConnection(socket));
    }

    _socketConnection(socket) {
        console.log('ProxyConfigs: socket connected', socket.conn.id);

        this.proxyConfigs[socket.conn.id] = {socket, configs: []};

        socket.on('proxy config', (proxyConfigs) => {
            console.log('ProxyConfigs: proxy config received', socket.conn.id, proxyConfigs);

            this.proxyConfigs[socket.conn.id] = {socket, configs: proxyConfigs};            
        })

        socket.on('disconnect', () => {
            console.log('ProxyConfigs: socket disconnect', socket.conn.id);
            delete this.proxyConfigs[socket.conn.id];            
        })
    }

    /**
     * Find proxy config matching URL
     * @param {*} reqUrl 
     * @returns ProxyConfig
     */
    findProxyConfig(reqUrl) {
        let matchingProxyConfig = undefined;
        // Find matching proxy configuration
        for(const key in this.proxyConfigs) {            
            for(const proxyConfig of this.proxyConfigs[key].configs) {
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
        const json = JSON.stringify(message, null, 2);
        for(const key in this.proxyConfigs) {            
            for(const proxyConfig of this.proxyConfigs[key].configs) {
                if(path === undefined || proxyConfig.path === path) {
                    console.log('socket emit', this.proxyConfigs[key].socket.conn.id);
					this.proxyConfigs[key].socket.emit('message', json);
                }
            }
        }
    }

}