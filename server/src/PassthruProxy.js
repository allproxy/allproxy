const net = require('net');
const tls = require('tls');
const fs = require('fs');

module.exports = class PassthruProxy{
    constructor(sourcePort, targetPort, targetHost) {  
        this.startProxy(sourcePort, targetPort, targetHost);
    }

    /**
     * Star proxy
     * @param {*} sourcePort 
     * @param {*} targetPort 
     * @param {*} targetHost 
     */
    startProxy(sourcePort, targetPort, targetHost) {
        var tlsOptions = {
            key: fs.readFileSync(__dirname + '/../../private/keys/server.key'),
            cert: fs.readFileSync(__dirname + '/../../private/keys/server.crt')
        };
    
        let server = tls.createServer(tlsOptions, onConnect);
        //server = net.createServer(onConnect);

        server.listen(sourcePort, 'localhost', function(){console.log("Listening on port "+sourcePort)});

        // Create server (source) socket
        function onConnect(sourceSocket) {            

            // Connect to target host
            const targetSocket = net.Socket();
            targetSocket.connect(targetPort, targetHost, () => {
                console.log('connected to target');
            });

            // Handle data from source (client)
            sourceSocket.on('data', (data) => {
                console.log('PassthruProxy --->', data.toString('ascii'));
                targetSocket.write(data);

            });

            // Handle data from target (e.g., database)
            targetSocket.on('data', (data) => {
                console.log('PassthruProxy <---', data.toString('ascii'));
                sourceSocket.write(data);
            });

            // Handle source socket closed
            sourceSocket.on('close', () => {
                console.log('PassthruProxy client closed connection');
                targetSocket.end();
            });

            // Handle target socket closed
            targetSocket.on('close', () => {
                console.log('PassthruProxy server closed connection');
                sourceSocket.end();
            }); 
            
        }
    }

}