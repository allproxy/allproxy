import net from 'net';
import tls from 'tls';
import fs from 'fs';
import Global from './Global';
import SocketIoMessage from './SocketIoMessage';
import HexFormatter from './formatters/HexFormatter';
import SqlFormatter from './formatters/SqlFormatter';
import MongoFormatter from './formatters/MongoFormatter';
import RedisFormatter from './formatters/RedisFormatter';
import ProxyConfig from '../../common/ProxyConfig';

export default class TcpProxy {
    constructor(proxyConfig: ProxyConfig) {
        //console.log('TcpProxy.ctor', proxyConfig);
        this.startProxy(proxyConfig);
    }

    static destructor(proxyConfig: ProxyConfig) {
        //console.log('TcpProxy.dtor', proxyConfig);
        if(proxyConfig._server) proxyConfig._server.close();
    }

    /**
     * Star proxy
     * @param proxyConfig
     */
    startProxy(proxyConfig: ProxyConfig) {
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

        server.listen(sourcePort, function(){console.log("Listening on port "+sourcePort+ " for target host "+targetHost+":"+targetPort)});
        proxyConfig._server = server;

        // Create server (source) socket
        function onConnect(sourceSocket: any) {

            let startTime = Date.now();
            let sequenceNumber = 0;

            let request: Buffer|undefined;
            let response: Buffer|undefined;

            // Connect to target host
            let targetSocket: net.Socket | tls.TLSSocket;
            if (!targetUseTls) {
                targetSocket = net.connect(targetPort, targetHost, () => {
                    //console.log('connected to target');
                });
            } else {
                targetSocket = tls.connect(targetPort, targetHost, {}, () => {
                    //console.log('connected to target');
                });
            }

            sourceSocket.on('error', (err: any) => {
                console.error(`TcpProxy client error ${sourcePort}: ${err}`);
            })

            targetSocket.on('error', (err) => {
                console.error(`TcpProxy server error ${sourcePort}: ${err}`);
            })

            // Handle data from source (client)
            sourceSocket.on('data', (data: Buffer) => {
                //console.log('request');
                startTime = Date.now();
                sequenceNumber = ++Global.nextSequenceNumber;
                request = data;
                targetSocket.write(data);
                processData();
                request = data;
            });

            // Handle data from target (e.g., database)
            targetSocket.on('data', (data) => {
                //console.log('response');
                response = data;
                sourceSocket.write(data);
                if(request) {
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
                        const sqlFormatter = new SqlFormatter(request!, response!);
                        requestString = sqlFormatter.getQuery();
                        responseString = sqlFormatter.getResults();
                        for(let line of requestString.split('\n')) {
                            if(line.indexOf('/*') !== -1) continue;
                            url += line + ' ';
                            if(url.length >= 64) break;
                        }
                        break;
                    case 'mongo:':
                        const mongoFormatter = new MongoFormatter(request!, response!);
                        requestString = mongoFormatter.getRequest();
                        responseString = mongoFormatter.getResponse();
                        url = requestString.split('\n')[0];
                        break;
                    case 'redis:':
                        const redisFormatter = new RedisFormatter(request!, response!);
                        requestString = redisFormatter.getRequest();
                        responseString = redisFormatter.getResponse();
                        for(let line of requestString.split('\n')) {
                            url += line + ' ';
                            if(url.length >= 64) break;
                        }
                        break;
                    default:
                        requestString = HexFormatter.format(request!);
                        responseString = response ? '\n'+HexFormatter.format(response)+'\n'
                                                    : 'No Response';
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

                request = response = undefined;
            }
        }
    }
}