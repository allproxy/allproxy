const Dashboard = (function(){
    let x = {};

    let requests = []; // Array of out of order requests or last in order request

    var colors = ['blue', 'green', 'darkorange','purple', 'slateblue','darkred'];
	var hostColor = {}; // key=json.serverHost[json.path]
	var hostFilter = {}; // key=json.serverHost[json.path]
   
    x.start = (iosocket) => {
    
        iosocket.on('message', function(message) {
            if(isStopped()) {
                return; // Do not record this message
            }

            var json = JSON.parse(message);			
                        
            var hostPath = json.serverHost+(json.path?json.path:'');
            
            x.addHost(json.serverHost, json.path);
                        
            var color = hostColor[hostPath];
            var c = json.status < 400 ? '' : ' error';   
            if(isGraphQlError(json)) c = ' error';         
                        
            let iconClass;
            let tooltip = '';
            if(json.method) {
                tooltip = 'Click to resend request';
                iconClass = json.requestHeaders['middleman_proxy'] == 'resend' ? 'fa-paper-plane-o' : 'fa-paper-plane';
                iconClass += ' resend-icon';
            }
            else {
                iconClass = 'fa-square';
            }
            
            const tcpIp = resolveHost(json.clientIp)+'->'+getHostPort(json.serverHost);

            var url = json.url.indexOf('?') != -1 ? json.url.split('?')[0] : json.url;
            url = unescape(url); 
            url = fixNewlines(url);

            let endpoint = '';
            if(json.endpoint && json.endpoint.length > 0) endpoint += '['+json.endpoint+']';
            
            var $request = $(		
                    '<div class="request__msg-seqno-container"><span class="request__msg-seqno">'+json.sequenceNumber+'</span></div>' +
                    '<div title="'+tooltip+'" class="fa '+iconClass+' request__msg-icon" style="cursor: pointer; float: left; color: '+color+'"></div>' +
                    '&nbsp<div class="request__msg'+c+'">'+json.method+' <span style="color: '+color+';">'+endpoint+'</span> ('+tcpIp+') '+url+'</div>');
                
            let body = json.method.length > 0 ? url+'\\n' : '';
            
            if(json.requestBody) {
                let jsonBody = json.requestBody;
                if(jsonBody.middleman_passthru) {
                    body += jsonBody.middleman_passthru;
                }
                else {
                    body += JSON.stringify(json.requestBody, null, 2); 
                }               
                body = fixNewlines(body);  
            }                                                                	
            $request.siblings('.request__msg').attr('title', body);
            $request.data(json);			
            var $requestBody = $(`<div class="request__body" hidden>${body}</div>`);
            
                var hidden = isUrlFiltered($request) ? 'hidden' : '';
            var $newRequest = $(`<div '+hidden+' class="request__msg-container"></div>`).append($request).append($requestBody);
                        
            json = $newRequest.find('.request__msg').data();    				
            if(requests.length == 0) {      					
                $('.request__container').append($newRequest); 
                requests.push($newRequest);
            }
            else {          		
                var afterIndex;
                var beforeIndex;
                for(var i = 0; i < requests.length; ++i) {
                    var thisSeqNo = requests[i].find('.request__msg').data().sequenceNumber;
                    if(json.sequenceNumber > thisSeqNo) {
                        afterIndex = i;			        					        			
                    }	
                    else if(json.sequenceNumber < thisSeqNo) {
                        beforeIndex = i;			        					        			
                        break;
                    }
                }
                
                if(afterIndex != undefined) {
                    var $request = requests[afterIndex];
                    $request.after($newRequest);
                    requests.splice(afterIndex+1, 0, $newRequest);			        		
                }
                else {
                    var $request = requests[beforeIndex];
                    $request.before($newRequest);			        		
                    requests.splice(beforeIndex, 0, $newRequest);
                }	
                
                // Remove consecutive requests to reduce storage and search time
                var MIN_Q_LEN = 50;
                var MAX_Q_LEN = 100;
                if(requests.length > MAX_Q_LEN) {
                    var prevSeqNo;
                    for(var i = 0; i < requests.length; ++i) {
                        if(requests.length == MIN_Q_LEN) break;
                        var nextSeqNo = requests[i].find('.request__msg').data().sequenceNumber;			        		
                        if(prevSeqNo) {
                            if(prevSeqNo == nextSeqNo-1) {			        			
                                requests.splice(i-1,1);
                                --i;
                            }	
                            else {
                                break;
                            }
                        }
                        prevSeqNo = nextSeqNo;
                    }	
                }
                
                // Only display the last 100 requests	        	  	
                if($('.request__container').children().length > SettingsModal.getMaxMessages()) {	        		
                    $('.request__container').children().first().remove();
                }
            }    		  	
            
            if($('.header__auto-scroll-checkbox').prop('checked')) {
                $request = requests[requests.length-1].find('.request__msg');
                $request.click(); // select new request and show response 
                
                var totalHeight = 0;
                $('.request__container').find('.request__msg').each(function(){
                    totalHeight += $(this).outerHeight();
                });
                $('.request__container').scrollTop(totalHeight); 
            }
        });
    }    
				
	x.addHost = (host, path) => {
		var hostPath = host+(path?path:'');
		if(hostColor[hostPath] == undefined) {		
			var $hostPathDiv = $('<div class="header__host-path-container"></div>');			
			$('.header__container').append($hostPathDiv);
			
    		hostColor[hostPath] = hostPath == 'error' ? 'red' : colors.splice(0,1)[0];
    		   				
    		$hostPathDiv.append('<div class="fa fa-square header__container-host-icon" style="float: left; color: '+hostColor[hostPath]+'"></div>');
    		
    		var $filterIcon = $('<div class="header__filter-icon fa fa-filter" title="Filter"></div>');
    		$hostPathDiv.append($filterIcon);    		
    		
    		var $inputFilter = $('<input hidden type="text" class="header__input-filter" placeholder="Filter '+hostPath+'">');    		
    		$hostPathDiv.append($('<div class="header__input-filter-container"></div>').append($inputFilter));    
    		hostFilter[hostPath] = $inputFilter;
    		
    		$hostPathDiv.append('<label class="header__hostname">'+hostPath+'</label>');
    		
    		/**
    		 * Filter
    		 */
    		$inputFilter.on('input', function(e) {
    			filter();
    			if($(this).val() == '') {
    				$(this).parent().prev('.header__filter-icon').removeClass('active');
    			}
    			else {
    				$(this).parent().prev('.header__filter-icon').addClass('active');
    			}
    		})
    		
    		$inputFilter.focusout(function(e) {
    			$(this).hide();
    		})   		
    		
    		/**
			 * Filter requests
			 */
			$filterIcon.click(function(e) {	
				$inputFilter.show();
				$inputFilter.focus();
			})
        }        
        
        var $activeUrl;
    
        /**
         * Click event handler in request container
         */
        $('.request__container').click(function(e) {
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
                }

                if(activeSeqNo == thisSeqNo) {
                    $activeUrl = undefined;				
                }
                else {		
                    //console.log($activeUrl, $element)		
                    var json = $element.data();
                    
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
                    var $responseBody = $('<pre class="response__body active"></pre>').text(JSON.stringify(json.responseBody,null,2)
                                                .replace(/\\"/g, '"').replace(/\\\\n/g, '\n'));
                    //var $responseBody = $('<pre class="response__body active"></pre>').jsonViewer(json.responseBody);
                    $('.response__container').empty();				
                    var c = json.status < 300  ? '' : ' class="error"';
                    $('.response__container').append('<div'+c+'><label>Status:&nbsp;</label>'+json.status+'</div>');
                    $('.response__container').append('<div><label>Elapsed time:&nbsp;</label>'+json.elapsedTime+' ms</div>');
                    $('.response__container').append('<div class="request__headers-twisty twisty"></div><div><label class="twisty-label">Request Headers:</label></div>').append($requestHeaders);
                    $('.response__container').append('<div class="response__headers-twisty twisty"></div><div><label class="twisty-label">Response Headers:</label></div>').append($responseHeaders);
                    if(queryParams) {
                        $('.response__container').append('<div class="request__query-params-twisty twisty"></div><div><label class="twisty-label">Query Parameters:</label></div>').append($queryParams);
                    }
                    $('.response__container').append('<div class="response__body-twisty twisty active"></div><div><label class="twisty-label">Response:</label></div>').append($responseBody);						
                    $element.addClass('active');
                    $element.parent().find('.request__msg-seqno-container').addClass('active');
                    $element.next().show();
                    $activeUrl = $element;					
                }					
            }
            else if($element.hasClass('resend-icon')) {
                var json = $element.data();
                
                ResendModal.open(json)
                .then(function(results) {                                  
                    var method = (results.body ? 'POST' : results.method);
                    var headers = {};
                    var unsafeHeaders = ['host', 'connection', 'content-length', 'origin', 'user-agent', 'referer', 'accept-encoding', 'cookie'];
                    for(var header in json.requestHeaders) {
                        if(unsafeHeaders.indexOf(header) == -1) {
                            headers[header] = json.requestHeaders[header];
                        }
                    }
                    
                    headers['middleman_proxy'] = 'resend';
                    
                    var data = (results.body ? results.body : undefined);
                    
                    var protocolHost = document.location.protocol+'//'+document.location.host;
                
                    //console.log(JSON.stringify(json, null, 2));
                    $.ajax(
                    {
                        type: method,
                        method: method,
                        url : protocolHost+results.url,
                        headers : headers,				
                        data : data				
                    }).done(function(results) {	
                        
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        console.log(JSON.stringify(jqXHR));
                    }).catch(function(error) {
                        
                    })
                })		
            }		
        })
        
        /**
         * Click event handler in response container
         */
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
    }

    $('.header__freeze-checkbox').click((e) => { 
        if($('.header__freeze-checkbox').prop('checked')) {                          
            $('.header__freeze-label').addClass('active');                
        } else {
            $('.header__freeze-label').removeClass('active');
        }
    })  

    function isStopped() {
        return $('.header__freeze-checkbox').prop('checked');        
    }

    function resolveHost(ip) {
        if(ip === '127.0.0.1') return 'localhost';
        else return ip;
    }

    function getHostPort(host) {
        const tokens = host.split(':');
        if(tokens.length < 2) return host
        else return tokens[1];
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
    
    function isUrlFiltered($request) {
    	var json = $request.data();	
		
		var hostPath = json.serverHost+(json.path?json.path:'');
		var val = hostFilter[hostPath].val();	
		
    	var hide; 
		if(val.startsWith('!')) {				
			hide = $request.text().search(val.substring(1)) != -1;
		}
		else {
			hide = $request.text().search(val) == -1;
		}
		return hide;
	}
	
	function filter() {		
		$('.request__container').children().each(function(i, request) {	
			var $request = $(request).find('.request__msg');						
			
			if(isUrlFiltered($request)) {				
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
    } 

    return x;
}());