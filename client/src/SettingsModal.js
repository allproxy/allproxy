var SettingsModal = (function(){

	var x = {
		$rows: $('.settings-modal__table').find('tbody'),
		save: false
	};
	
	/**
	 * Maximum number of messages to capture
	 */
	x.getMaxMessages = function() {
		
		if(localStorage.maxNumberOfMessages == undefined) {
			var MAX_REQUESTS = 1000; // default	
			localStorage.maxNumberOfMessages = MAX_REQUESTS;
		}
		return localStorage.maxNumberOfMessages;
	}

	/**
	 * Get the proxy config with match path
	 * @param {*} path 
	 */
	x.getProxyConfigByPath = function(path) {
		var proxyDirectives = [];
		if(localStorage.proxyDirectives) {
			proxyDirectives = JSON.parse(localStorage.proxyDirectives);
		}			
		for(let config of proxyDirectives) {			
			if(path === config.path) {
				return config;
			}
		}
		return null;
	}
	
	x.load = function(iosocket) {
		var proxyDirectives = [];
		if(localStorage.proxyDirectives) {
			proxyDirectives = JSON.parse(localStorage.proxyDirectives);
			proxyDirectives.forEach(proxyConfig => {
				// backwards compatible with previously supported 'any:'
				if(proxyConfig.protocol === 'any:') proxyConfig.protocol = 'other:';
			});
			iosocket.emit('proxy config', proxyDirectives);	
		}	
	}

	x.open = function(iosocket) {	
		$('.settings-modal__table').hide();	
		$('.settings-modal__input-max-messages').val(x.getMaxMessages());
		return new Promise(function(resolve) {
			x.save = false;
			
			$('.settings-modal__save').prop('disabled', true);
			$('.settings-modal__cancel').prop('disabled', false);
			$('.settings-modal__table').hide();
			$('.settings-modal__add-button').prop('disabled', true);
			$('.settings-modal__input-path').val('');
			$('.settings-modal__input-protocol').val('');						
			$('.settings-modal__input-host').val('');
			$('.settings-modal__input-path').css('background-color', '');	
			$('.settings-modal__input-host').css('background-color', '');
			x.$rows.empty();
			
			var proxyDirectives = [];
			if(localStorage.proxyDirectives) {
				proxyDirectives = JSON.parse(localStorage.proxyDirectives);
			}
			proxyDirectives.sort((a,b) => a.path.localeCompare(b.path));		
			proxyDirectives.forEach(function(config) {
				var path = config.path;
				var host = config.hostname;
				if(config.port) host += ':'+config.port;
				const recording = config.recording === true || config.recording === undefined ? true : false;				
				addRow(path, config.protocol, host, recording);
			})	
																		
			$('#settingsModal').modal({backdrop: 'static', keyboard: false});
			
			$('#settingsModal').unbind('hidden.bs.modal');
			$('#settingsModal').on('hidden.bs.modal', function (e) {
				
				if(x.save) {
					
					proxyDirectives = [];
					
					$('.settings-modal__proxy-row').each(function() {
						var path = $(this).find('.settings-modal__proxy-path').val();
						var protocol = $(this).find('.settings-modal__proxy-protocol option:selected').text();
						var host = $(this).find('.settings-modal__proxy-host').val();
						const recording = $(this).find('.settings-modal__recording-checkbox').is(':checked');												
										
						var config = {							
							path: path,
							protocol: protocol,
							hostname: host.split(':')[0],
							port: host.split(':')[1],
							recording
						};
						proxyDirectives.push(config);
					})					
					
					//console.log('save', JSON.stringify(proxyDirectives,null,2));
					localStorage.proxyDirectives = JSON.stringify(proxyDirectives);
					
					var number = $('.settings-modal__input-max-messages').val();					
					localStorage.maxNumberOfMessages = number;
					
					iosocket.emit('proxy config', proxyDirectives);
					
					//console.log(JSON.stringify(output, null, 2));
					resolve(true);
				}
				else {
					resolve(false);
				}
			})			
		});
	}

	$('.settings-modal__cancel').unbind('click');
	$('.settings-modal__cancel').click(function(e) {
		x.save = false;
	})
	
	$('.settings-modal__save').unbind('click');
	$('.settings-modal__save').click(function(e) {
		x.save = true;
	})
	
	$('.settings-modal__input-path, .settings-modal__input-host').unbind('input');
	$('.settings-modal__input-path, .settings-modal__input-host').on('input', function(e) {
		var path = $('.settings-modal__input-path').val();
		var protocol = $('.settings-modal__select-protocol option:selected').text();
		var host = $('.settings-modal__input-host').val();
		
		$('.settings-modal__error-message').text('');
		
		if(path.length == 0 || host.length == 0) {
			$('.settings-modal__add-button').prop('disabled', true);
		}
		else {			
			$('.settings-modal__add-button').prop('disabled', false);					
		}
	})

	$('.settings-modal__select-protocol').change(function(e) {
		$('.settings-modal__error-message').text('');
		if(this.value === 'http:' || this.value === 'https:') {
			$('.settings-modal__input-path').attr('placeholder', 'Enter path (e.g., /xxx/yyy)');						
		}
		else {
			$('.settings-modal__input-path').attr('placeholder', 'Entry source port number');			
		}
	})	
	
	$('.settings-modal__add-button').click(function() {		
		var path = $('.settings-modal__input-path').val();
		var protocol = $('.settings-modal__select-protocol option:selected').text();
		var host = $('.settings-modal__input-host').val();
		var error = false;
		
		if(protocol === 'http:' || protocol === 'https:') {
			if(!path.startsWith('/')) {
				$('.settings-modal__error-message').text(`When protocol "${protocol}" is selected the path must begin with "/"`);				
				error = true;
			}
		} else {		
			if(parseInt(path) === 'NaN') {
				$('.settings-modal__error-message').text(`'When protocol "${protocol}" is selected port number must be specified`);				
				error = true;
			}
		} 

		if(!error) {
			try {
				const url = new URL(host);
				if(url.port === undefined) {
					$('.settings-modal__error-message').text(`The port number must be specified in the target host (e.g., localhost:80)`);			
					error = true;
				}
			} catch(e) {
				$('.settings-modal__error-message').text(`Invalid target host name (e.g., localhost:80)`)
				error = true;
			}	
		}	
				
		if(!error) {				
			addRow(path, protocol, host, true);
			$('.settings-modal__add-button').prop('disabled', true);
			$('.settings-modal__save').prop('disabled', false);			
			$('.settings-modal__input-path').val('');						
			$('.settings-modal__input-host').val('');
		}		
	})
	
	$('.settings-modal__table').unbind('click');
	$('.settings-modal__table').click(function(e) {
		var $element = $(e.target);
		if($element.hasClass('settings-modal__proxy-delete-button')) {
			$element.closest('.settings-modal__proxy-row').remove();	
			$('.settings-modal__save').prop('disabled', false);
		}
	})	
	
	$('.settings-modal__table').unbind('input');
	$('.settings-modal__table').on('input', function(e) {
		var $element = $(e.target);
		$('.settings-modal__error-message').text('');
		$('.settings-modal__save').prop('disabled', false);		
	})	
	
	$('.settings-modal__input-max-messages').unbind('input');
	$('.settings-modal__input-max-messages').on('input', function(e) {		
		$('.settings-modal__save').prop('recording', false);		
	})	
	
	function addRow(path, protocol, host, recording) {
		$('.settings-modal__table').show();
		if(host.split(':').length == 1) host += ':80';
		if(protocol === 'any:') protocol = 'other:'; // backwards compatible with previously supported 'any:'
		let protocols = ['http:', 'https:', 'sql:', 'mongo:', 'redis:', 'grpc:', 'other:'];		
		protocols.unshift(protocols.splice(protocols.indexOf(protocol),1)[0]); // put 'protocol' first		
		const recordingChecked = recording ? 'checked' : '';
		const recordingClass = recording ? '' : 'disabled';
		var row = 
			'<tr class="settings-modal__proxy-row">' +				
				'<td>' +
					'<button class="settings-modal__proxy-delete-button btn btn-xs btn-danger">X</button>' +
				'</td>' +
				'<td class="settings-modal__proxy-protocol-container">' +
					'<select class="settings-modal__proxy-protocol '+recordingClass+'">' +
						protocols.map(protocol => `<option>${protocol}</option>`).join('') +
					'<select/>' +
				'</td>' +
				'<td class="settings-modal__proxy-path-container">' +
					'<input class="settings-modal__proxy-path '+recordingClass+'" value="'+path+'">' +
				'</td>' +
				'<td class="settings-modal__proxy-host-container">' +
					'<input class="settings-modal__proxy-host '+recordingClass+'" value="'+host+'">' +
				'</td>' +
				'<td class="settings-modal__recording-container">' +
					'<input type="checkbox" class="settings-modal__recording-checkbox" '+recordingChecked+'>' +
				'</td>' +
			'</tr>';
			var $table = $('.settings-modal__table');
			$table.find('tbody').append(row);
			$table.show();

			$('.settings-modal__recording-checkbox').unbind();
			$('.settings-modal__recording-checkbox').change(function(e) {				
				$(this).closest('tr').find('input,select').toggleClass('disabled', !this.checked);
				$(this).removeClass('disabled');
			})
	}
	
	return x;
}());