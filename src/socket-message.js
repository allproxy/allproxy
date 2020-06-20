const decompressResponse = require('decompress-response');

module.exports = {
		
	/**
	 * Parse request data
	 */
	parseRequest : function(client_req, startTime, sequenceNumber, host, partialUrl, path) {	
		
		return new Promise(function(resolve, reject) {
			
			client_req.setEncoding('utf8');
			var rawData = '';
			client_req.on('data', function(chunk) {
				rawData += chunk;
			});
			
			var requestBody;
			client_req.on('end', function() {
				
				try {
					requestBody = JSON.parse(rawData)
				} catch (e) {
					//console.error(e.message);
				}	
				
				var message = {
						sequenceNumber : sequenceNumber,
						requestHeaders : client_req.headers,
						method : client_req.method,
						url : client_req.url,
						partialUrl : partialUrl,
						requestBody : requestBody,
						host : host,
						path : path, 
						elapsedTime : Date.now() - startTime
				};	
				
				resolve(message);
			});						
			
		});
	},
	
	/**
	 * Parse response
	 */
	parseResponse : function(proxyRes, startTime, message) {	
		
		return new Promise(function(resolve, reject) {
			
			if(proxyRes.headers) {
				if(proxyRes.headers['content-encoding']) {
					proxyRes = decompressResponse(proxyRes);
					//delete proxyRes.headers['content-encoding'];
				}
				
				if(proxyRes.headers['content-type'] && 
						proxyRes.headers['content-type'].indexOf('utf-8') != -1) {
					proxyRes.setEncoding('utf8');
				}
			}
			
			var rawData = '';
			proxyRes.on('data', function(chunk) {
				rawData += chunk;
			});
			proxyRes.on('end', function() {	
				var parsedData;
				var elasticsearch;
				if(proxyRes.headers['content-type'] &&
						proxyRes.headers['content-type'].indexOf('application/json') != -1) {
					try {
						parsedData = JSON.parse(rawData);
						if(parsedData._shards) {								
							elasticsearch = 'yes';
						}
					}
					catch(e) {
						console.log('JSON.parse exception');
						parsedData = {
							raw_json : rawData
						};
					}
				}
				else {				
					parsedData = {
						body : rawData
					};
				}
				
				message.responseHeaders = proxyRes.headers;
				message.responseBody = parsedData;
				message.status = proxyRes.statusCode
				message.elapsedTime = Date.now() - startTime;
								
				resolve(message);
			});	
		});						
	}
};