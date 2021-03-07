const Dashboard = (function(){    
    let x = {};

    let sequenceNumberArray = []; // Array of out of order requests or last in order request

    var colors = ['blue', 'green', 'darkorange','purple', 'brown', 'grey', 'slateblue','darkred'];
	var hostColor = {}; // key=json.serverHost[json.path]	
   
    x.start = (iosocket) => {    
        
        iosocket.on('reqResJson', function(json) {
            if(isStopped()) {
                return; // Do not record this message
            }
            if(!json.proxyConfig.recording) {
                return; // Do not record this message
            }
                        
            var hostPath = json.clientIp+json.serverHost+(json.path?json.path:'')+(json.protocol?json.protocol:'');
            if(hostColor[hostPath] == undefined) {
                hostColor[hostPath] = hostPath == 'error' ? 'red' : colors.splice(0,1)[0];                
            }
                        
            var color = hostColor[hostPath];

            // Set error class to make text red
            var c = json.status < 400 ? '' : ' error';   
            if(isGraphQlError(json)) c = ' error';
            if(json.responseBody === 'No Response') c = 'error';        
                        
            let iconClass;
            let tooltip = '';
            if(json.method) {
                tooltip = 'Click to resend request';
                iconClass = json.requestHeaders['middleman_proxy'] == 'resend' ? 'fa-paper-plane-o' : 'fa-paper-plane';
                iconClass += ' resend-icon';                
            }
            else {
                switch(json.protocol) {
                    case 'sql:':
                        iconClass = 'fa-database'; 
                        break;
                    case 'mongo:':
                        iconClass = 'fa-envira'; 
                        break;
                    case 'redis:':
                        iconClass = 'fa-cube'; 
                        break;
                    case 'grpc:':
                        iconClass = 'fa-asterisk'; 
                        break;
                    case 'log:':
                        iconClass = 'fa-exclamation-triangle';
                        break;
                    default:
                        iconClass = 'fa-square'; 
                }           
            }
            
            const tcpIp = resolveHost(json.clientIp)+'->'+json.serverHost;

            var url = json.url.indexOf('?') != -1 ? json.url.split('?')[0] : json.url;
            url = unescape(url); 
            url = fixNewlines(url);

            let endpoint = '';
            if(json.endpoint && json.endpoint.length > 0) endpoint += `${json.endpoint}`;
                  
            var $request = $(		
                `<div class="request__msg-seqno-container">` +
                `  <span class="request__msg-seqno">${json.sequenceNumber}</span>` +
                `</div>` +
                `<div class="request__msg-timestamp-container">` +
                `  <span class="request__msg-timestamp">${formatTimestamp(json)}</span>` +
                `</div>` +
                `<div title="${tooltip}" class="fa ${iconClass} request__msg-icon" ` +
                `  style="cursor: pointer; float: left; color: ${color}">` +
                `</div>` +
                `<div class="fa fa-caret-right request__msg-caret">` +
                `</div>` +                
                `<div class="request__msg${c}">` +
                `  ${json.method} ` +
                `  <span style="font-weight: bold">` +
                `    ${endpoint}` +
                `  </span>` +                
                `  (${tcpIp}) ${url}` +
                `</div>`);
                
            let body = json.method.length > 0 ? url+'\n' : '';
            
            let jsonData;
            if(json.requestBody) {
                let jsonBody = json.requestBody;
                if(jsonBody.middleman_inner_body) {
                    body += jsonBody.middleman_inner_body;
                }
                else {
                    jsonData = json.requestBody;
                    body += JSON.stringify(json.requestBody, null, 2); 
                }               
                body = fixNewlines(body);  
            }                                                                	
            $request.siblings('.request__msg').attr('title', body);
            $request.data(json);			
            var $requestBody = $(`<div class="request__body" hidden></div>`);
            if(jsonData) {
                $requestBody.jsonViewer(jsonData);
            } else {
                $requestBody.text(body);
            }
            
            var hidden = isFiltered(json) ? 'hidden' : '';
            var $newRequest = $(`<div ${hidden} class="request__msg-container"></div>`).append($request).append($requestBody);
            
            const sequenceNumber = $newRequest.find('.request__msg').data().sequenceNumber;         		
            insertMessage(sequenceNumber, $newRequest);
            
            // Only display the last "n" requests	        	  	
            if($('.request__container').children().length > SettingsModal.getMaxMessages()) {
                sequenceNumberArray.shift();	        		
                $('.request__container').children().first().remove();
            }
            
            if($('.header__auto-scroll-checkbox').prop('checked')) {
                const i =  sequenceNumberArray.length-1;
                $request = $('.request__container').children().eq(i).find('.request__msg');
                $request.click(); // select new request and show response
                $request.removeClass('visited-color');
                
                var totalHeight = 0;
                $('.request__container').find('.request__msg').each(function(){
                    totalHeight += $(this).outerHeight();
                });
                $('.request__container').scrollTop(totalHeight); 
            }
        });

        function insertMessage(sequenceNumber, $newRequest) {
            if (sequenceNumberArray.length === 0) {
                $('.request__container').append($newRequest);
                sequenceNumberArray.push(sequenceNumber);
            } else {
                let l = 0;
                let r = sequenceNumberArray.length - 1;
                let m;
                while (l <= r) {
                    m = l + Math.floor((r - l) / 2);
                    if (sequenceNumberArray[m] === sequenceNumber) {
                        $('.request__container').children().eq(m).replaceWith($newRequest);
                        return;
                    }

                    if (sequenceNumberArray[m] < sequenceNumber) {
                        l = m + 1;
                    } else {
                        r = m - 1;
                    }
                }

                console.log(l,r,m);
                if (sequenceNumberArray[m] < sequenceNumber) {
                    $('.request__container').children().eq(m).after($newRequest);
                    sequenceNumberArray.splice(m+1, 0, sequenceNumber);
                } else {
                    $('.request__container').children().eq(m).before($newRequest);
                    sequenceNumberArray.splice(m, 0, sequenceNumber);
                }
            }
        }
    }    

    /**
     * Filter messages.
     */
    x.filter = () => {
        filter();
    }
        
    var $activeUrl;

    /**
     * Click event handler in request container
     */
    $('.request__container').unbind('click');
    $('.request__container').click(async function(e) {
        var $element = $(e.target);	
        if($element.parent().hasClass('request__msg')) $element = $element.parent();
        if($element.hasClass('request__msg')) {
            var thisSeqNo = $element.data().sequenceNumber;
            var activeSeqNo;
            if($activeUrl) {
                $activeUrl.removeClass('active');
                $activeUrl.parent().find('.request__msg-seqno-container').removeClass('active');
                $activeUrl.next().hide();
                activeSeqNo = $activeUrl.data().sequenceNumber;
                const $caret = $activeUrl.prev('.fa-caret-down');
                $caret.removeClass('fa-caret-down');
                $caret.addClass('fa-caret-right');						
            }
            
            if(activeSeqNo === thisSeqNo) {                                
                $activeUrl = undefined;				
            }
            else {		
                //console.log($activeUrl, $element)	
                $('.response__container').hide();
                $('.response__loading').show();
                
                $element.addClass('active visited-color');
                $element.parent().find('.request__msg-seqno-container').addClass('active');
                $element.next().show();                
                const $caret = $element.prev('.fa-caret-right');                
                $caret.removeClass('fa-caret-right');
                $caret.addClass('fa-caret-down');
                $activeUrl = $element;
        
                await renderResponse($element.data());                
                $('.response__loading').hide();
                $('.response__container').show();
            }					
        }
        else if($element.hasClass('resend-icon')) {
            var json = $element.data();
            
            ResendModal.open(json)
            .then(function(results) {
                if(results !== null) {                                 
                    var method = (results.body ? 'POST' : results.method);
                    var headers = {};
                    var unsafeHeaders = ['host', 
                                         'connection', 
                                         'content-length', 
                                         'origin', 'user-agent', 
                                         'referer', 
                                         'accept-encoding', 
                                         'cookie',
                                         'sec-fetch-dest',
                                         'proxy-connection',
                                        ];
                    for(var header in json.requestHeaders) {
                        if(unsafeHeaders.indexOf(header) == -1) {
                            headers[header] = json.requestHeaders[header];
                        }
                    }
                    
                    headers['middleman_proxy'] = 'resend';
                    
                    var data = (results.body ? results.body : undefined);
                    
                    let url;
                    if(results.url.startsWith('http:') || results.url.startsWIth('https:')) {
                        url = results.url;
                    }
                    else {
                        const protocolHost = document.location.protocol+'//'+document.location.host;                
                        url = protocolHost+results.url;
                    }
                    console.log(url);
                    $.ajax(
                    {
                        type: method,
                        method,
                        url,
                        headers,				
                        data,				
                    }).done(function(results) {	
                        
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.log(JSON.stringify(jqXHR));
                    }).catch(function(error) {
                        
                    })
                }
            })		
        }		
    })

    function renderResponse(json) {
        return new Promise((resolve) => {
            // Format query parameters
            var queryParams;
            if(json.url.indexOf('?') != -1) {
                queryParams = [];
                var temp = json.url.split('?')[1];
                temp.split('&').forEach(function(param) {
                    var keyValue = param.split('=');
                    var value = keyValue.length > 1 ? unescape(keyValue[1]) : undefined;						
                    queryParams.push(keyValue[0]+' = '+value);
                })
            }
                        
            var $requestHeaders = $('<pre class="request__headers"></pre>').jsonViewer(json.requestHeaders);
            var $responseHeaders = $('<pre class="response__headers"></pre>').jsonViewer(json.responseHeaders);
            var $queryParams = $('<pre class="request__query-params"></pre>').jsonViewer(queryParams);
            var $responseBody = $('<pre class="response__body active"></pre>');                      
            
            //var $responseBody = $('<pre class="response__body active"></pre>').jsonViewer(json.responseBody);
            $('.response__container').empty();
            var c = json.status < 300  ? '' : ' class="error"';
            $('.response__container').append('<div'+c+'><label>Status:&nbsp;</label>'+json.status+'</div>');
            $('.response__container').append('<div><label>Elapsed time:&nbsp;</label>'+json.elapsedTime+' ms</div>');
            if(Object.keys(json.requestHeaders).length > 0) {
                $('.response__container').append('<div class="request__headers-twisty twisty"></div><div><label class="twisty-label">Request Headers:</label></div>').append($requestHeaders);
            }
            if(Object.keys(json.responseHeaders).length > 0) {
                $('.response__container').append('<div class="response__headers-twisty twisty"></div><div><label class="twisty-label">Response Headers:</label></div>').append($responseHeaders);
            }
            if(queryParams) {
                $('.response__container').append('<div class="request__query-params-twisty twisty"></div><div><label class="twisty-label">Query Parameters:</label></div>').append($queryParams);
            }
            $('.response__container').append('<div class="response__body-twisty twisty active"></div><div><label class="twisty-label">Response:</label></div>').append($responseBody);						
                        
            setTimeout(() => {
                if(typeof json.responseBody === 'object') {
                    $responseBody.jsonViewer(json.responseBody);
                } else {
                    $responseBody.text(json.responseBody);
                }
                resolve();
            })            
        });
    }
    
    /**
     * Click event handler in response container
     */
    $('.response__container').unbind('click');
    $('.response__container').click(function(e) {
        var $element = $(e.target);
        if($element.hasClass('twisty') || $element.hasClass('twisty-label')) {
            var $twisty = $element.hasClass('twisty') ? $element : $element.parent().prev();
            var $jsonViewer = $twisty.next().next();
            if($twisty.hasClass('active')) {
                $twisty.removeClass('active');
                $jsonViewer.removeClass('active');
            }
            else {
                $twisty.addClass('active');
                $jsonViewer.addClass('active');
            }		
        }		
    })

    $('.header__freeze-checkbox').click((e) => { 
        if($('.header__freeze-checkbox').prop('checked')) {                          
            $('.header__freeze-label').addClass('active');                
        } else {
            $('.header__freeze-label').removeClass('active');
        }
    })

    function formatTimestamp(json) {
        // return json.sequenceNumber; // used for testing only
        const date = new Date(json.timestamp);
        const minutes = date.getMinutes().toString().padStart(2,'0');
        const seconds = date.getSeconds().toString().padStart(2,'0');
        const msecs = date.getMilliseconds().toString().padStart(3,'0');
        return `${minutes}:${seconds}.${msecs}`;
    }

    function isStopped() {
        return $('.header__freeze-checkbox').prop('checked');        
    }

    function resolveHost(ip) {
        if(ip === '127.0.0.1') return 'localhost';
        else return ip;
    }

    function fixNewlines(str) {
        return str.replaceAll('\\n', '\n') // fix up line breaks                  
                  .replaceAll('\\', '')
                  .replaceAll('""', '"'); // remove consecutive quotes  
    }

    function isGraphQlError(json) {       
        if(json.url === '/graphql' && Array.isArray(json.responseBody)) {
            for(const entry of json.responseBody) {
                if(entry.errors) {
                   return true;
                }
            }
        }
        return false;
    }

    $('.header__filter-input').on('input', function(e) {
        if($('.header__filter-input').val().length === 0) {
            $('.header__filter-input').removeClass('active');
        } else {
            $('.header__filter-input').addClass('active');
        }
        filter();
    })

    function isMatch(needle, haystack) {
        if(haystack === undefined) return false;

        if(needle === needle.toLowerCase()) {
            haystack = haystack.toLowerCase();
        }
        
        if(needle.indexOf('.*') !== -1) {
            return haystack.search(needle) !== -1;
        }
        else {
            return haystack.indexOf(needle) !== -1;
        }
    }    
    
    function isFiltered(json) {        
        const value = $('.header__filter-input').val();        
        
        const proxyConfig = SettingsModal.getProxyConfigByPath(json.proxyConfig.path);
        if(proxyConfig === null || !proxyConfig.recording) return true;

        if(isMatch(value, json.url)) return false;
        if(isMatch(value, json.clientIp)) return false;
        if(isMatch(value, json.endpoint)) return false;
        if(json.requestBody && isMatch(value, JSON.stringify(json.requestBody))) return false;
        if(json.responseHeaders && isMatch(value, JSON.stringify(json.responseBody))) return false;
		
		return true;
    }
    
    let requestsHidden = false;
	
	function filter() {
        const requestsWereHidden = requestsHidden;
        requestsHidden = false;		
		$('.request__container').children().each(function(i, request) {	
            var $request = $(request).find('.request__msg');
			
			if(isFiltered($request.data())) {
                requestsHidden = true;			
				$(request).hide();
				if($request.hasClass('active')) {
					$request.removeClass('active')
					$('.response__container').empty();
					$('.response__container').append('<div class="center">Select request from left column</div>');
				}
			}
			else {
				$(request).show();
			}
        })

        // No requests are currently hidden (i.e., filter was cleared)
        if($activeUrl && !requestsHidden && requestsWereHidden) {
            const $savedActiveUrl = $activeUrl;
            $activeUrl.click(); // close
            $savedActiveUrl.click(); // open
        }
    } 

    return x;
}());