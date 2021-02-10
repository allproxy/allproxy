const net = require('net');
const tls = require('tls');
const fs = require('fs');
const Global = require('./Global');
const SocketIoMessage = require('./SocketIoMessage');
const HexFormatter = require('./formatters/HexFormatter');
const SqlFormatter = require('./formatters/SqlFormatter');
const MongoFormatter = require('./formatters/MongoFormatter');
const RedisFormatter = require('./formatters/RedisFormatter');

module.exports = class TcpProxy {
    constructor(proxyConfig) {
        //console.log('TcpProxy.ctor', proxyConfig);
        this.startProxy(proxyConfig);
    }

    static destructor(proxyConfig) {
        //console.log('TcpProxy.dtor', proxyConfig);       
        if(proxyConfig.server) proxyConfig.server.close();
    }

    /**
     * Star proxy
     * @param proxyConfig
     */
    startProxy(proxyConfig) { 
        const sourceUseTls = false;
        const sourcePort = proxyConfig.path; 
        const targetUseTls = false;      
        const targetHost = proxyConfig.hostname;
        const targetPort = proxyConfig.port;               

        let server;

        if(sourceUseTls) {
            var tlsOptions = {
                key: fs.readFileSync(__dirname + '/../../private/keys/server.key'),
                cert: fs.readFileSync(__dirname + '/../../private/keys/server.crt')
            };
        
            server = tls.createServer(tlsOptions, onConnect);
        }
        else {
            server = net.createServer(onConnect);
        }

        server.listen(sourcePort, '0.0.0.0', function(){console.log("Listening on port "+sourcePort+ " for target host "+targetHost+":"+targetPort)});
        proxyConfig.server = server;

        // Create server (source) socket
        function onConnect(sourceSocket) {             

            const startTime = Date.now();
            let sequenceNumber = 0;
            
            let request = '';
            let response = '';

            // Connect to target host
            const targetSocket = targetUseTls ? tls.Socket() : net.Socket();
            targetSocket.connect(targetPort, targetHost, () => {               
                //console.log('connected to target');                
            });

            sourceSocket.on('error', (err) => {
                console.error(`TcpProxy client error ${sourcePort}: ${err}`);
            })

            targetSocket.on('error', (err) => {
                console.error(`TcpProxy server error ${sourcePort}: ${err}`);
            })

            // Handle data from source (client)
            sourceSocket.on('data', (data) => {
                //console.log('request');                 
                sequenceNumber = ++Global.nextSequenceNumber;                
                request = data;
                targetSocket.write(data);

            });

            // Handle data from target (e.g., database)
            targetSocket.on('data', (data) => {
                //console.log('response'); 
                response = data;
                sourceSocket.write(data); 
                if(request.length > 0) {
                    processData(); 
                }                              
            });

            // Handle source socket closed
            sourceSocket.on('close', () => {
                console.log(`TcpProxy client closed ${sourcePort} source connection`);
                targetSocket.end();                            
            });

            // Handle target socket closed
            targetSocket.on('close', () => {
                console.log(`TcpProxy server ${targetPort} closed target connection`);
                sourceSocket.end();               
            });
            
            function processData() {
                let requestString = '';                
                let responseString = '';
                let url = '';
                switch(proxyConfig.protocol) {
                    case 'sql:':
                        const sqlFormatter = new SqlFormatter(request, response);
                        requestString = sqlFormatter.getQuery();
                        responseString = sqlFormatter.getResults();                        
                        for(let line of requestString.split('\n')) {
                            if(line.indexOf('/*') !== -1) continue;
                            url += line + ' ';
                            if(url.length >= 64) break;
                        }
                        break;
                    case 'mongo:':
                        const mongoFormatter = new MongoFormatter(request, response);
                        requestString = mongoFormatter.getRequest();
                        responseString = mongoFormatter.getResponse();
                        url = requestString.split('\n')[0];                        
                        break;
                    case 'redis:':
                        const redisFormatter = new RedisFormatter(request, response);
                        requestString = redisFormatter.getRequest();
                        responseString = redisFormatter.getResponse();
                        for(let line of requestString.split('\n')) {                            
                            url += line + ' ';
                            if(url.length >= 64) break;
                        }
                        break;                                               
                    default:
                        requestString = HexFormatter.format(request);
                        responseString = '\n'+HexFormatter.format(response)+'\n';
                        if(requestString.length <= 64) {
                            url = requestString;
                        }
                        else {
                            url = requestString.substring(0, Math.min(requestString.indexOf('\n'), requestString.length));
                            if(url.length < 16) url = requestString.substring(0, Math.min(requestString.indexOf('\n', url.length+1), requestString.length));
                        }
                        break;
                }

                if(requestString.length > 0) {
                    //console.log('processData', sequenceNumber);
                    const endpoint = '';                 
                   
                    let message = SocketIoMessage.buildRequest(
                                                    startTime,                       
                                                    sequenceNumber,                                                    
                                                    {}, // headers 
                                                    '', // method 
                                                    url, // url
                                                    endpoint, // endpoint 
                                                    { middleman_inner_body: requestString }, // req body
                                                    sourceSocket.remoteAddress, // clientIp
                                                    targetHost+':'+targetPort, // serverHost
                                                    '', // path
                                                    Date.now() - startTime);                                        
                    SocketIoMessage.appendResponse(message, {}, responseString, 0, Date.now() - startTime);
                    message.protocol = proxyConfig.protocol;
                    Global.proxyConfigs.emitMessageToBrowser(message, proxyConfig);
                }

                request = response = '';                
            }   
        }        
    }
}