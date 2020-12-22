const net = require('net');
const tls = require('tls');
const fs = require('fs');
const Global = require('./Global');
const SocketIoMessage = require('./SocketIoMessage');
const sqlFormatter = require('sql-formatter');

module.exports = class AnyProxy{
    constructor(proxyConfig) {
        //console.log('AnyProxy.ctor', proxyConfig);
        this.startProxy(proxyConfig);
    }

    static destructor(proxyConfig) {
        //console.log('AnyProxy.dtor', proxyConfig);       
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
                console.error(`AnyProxy client error ${sourcePort}: ${err}`);
            })

            targetSocket.on('error', (err) => {
                console.error(`AnyProxy server error ${sourcePort}: ${err}`);
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
                processData();                               
            });

            // Handle source socket closed
            sourceSocket.on('close', () => {
                console.log(`AnyProxy client closed ${sourcePort} source connection`);
                targetSocket.end();                            
            });

            // Handle target socket closed
            targetSocket.on('close', () => {
                console.log(`AnyProxy server ${targetPort} closed target connection`);
                sourceSocket.end();               
            });
            
            function processData() {
                const requestString = bufToStr(true, request);
                const responseString = bufToStr(false, response);
                if(requestString.length > 0) {
                    //console.log('processData', sequenceNumber);
                    const endpoint = '';
                    let url;
                    if(requestString.length <= 64) {
                        url = requestString;
                    }
                    else {
                        url = requestString.substring(0, Math.min(requestString.indexOf('\\n'), requestString.length));
                        if(url.length < 10) url = requestString.substring(0, Math.min(requestString.indexOf('\\n', url.length+1), requestString.length));
                    }
                    const message = SocketIoMessage.buildRequest(sequenceNumber,
                                                    {}, // headers 
                                                    '', // method 
                                                    url, // url
                                                    endpoint, // endpoint 
                                                    { middleman_passthru: requestString }, // req body
                                                    sourceSocket.remoteAddress, // clientIp
                                                    targetHost+':'+targetPort, // serverHost
                                                    '', // path
                                                    Date.now() - startTime);
                    SocketIoMessage.appendResponse(message, {}, '['+responseString+']', 0, Date.now() - startTime);
                    Global.proxyConfigs.emitMessageToBrowser(message);
                }

                request = response = '';                
            }

            function bufToStr(isRequest, buffer) {
                let str = buffer.toString('utf8').replace(/\n/g, '\\n');
                if(str.replace(/[^\x20-\x7E]/g, '').length === 0) {
                    return '';
                }
                else {
                    str = str.replace(/[^\x21-\x7E]+/g, '\\n'); 
                    str = str.split('\\n\\n').join('\\n') // remove consecutive line breaks
                }
                
                try {
                    str = JSON.parse(str);
                    str = JSON.stringify(str, null, 2);                                         
                }
                catch(e) {                  
                }                
                //str = str.split(',').join(',\\n'); // SQL is more readable if there is a line break after each comma
                str = str.trim();
                while(str.startsWith('\\n')) str = str.replace('\\n','');                
                
                return isRequest ? sqlFormatter.format(str.split('\\n').join(' ')).split('\n').join('\\n') : str;
            }
            
        }        
    }

}