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
			var MAX_REQUESTS = 100;	
			localStorage.maxNumberOfMessages = MAX_REQUESTS;
		}
		return localStorage.maxNumberOfMessages;
	}
	
	x.load = function(iosocket) {
		var proxyDirectives = [];
		if(localStorage.proxyDirectives) {
			proxyDirectives = JSON.parse(localStorage.proxyDirectives);
			iosocket.emit('proxy config', proxyDirectives);	
		}			
	}

	x.open = function(iosocket) {		
		
		return new Promise(function(resolve, reject) {
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
			proxyDirectives.forEach(function(config) {
				var path = config.path;
				var host = config.hostname;
				if(config.port) host += ':'+config.port;
				addRow(path, config.protocol, host);
			})	
																		
			$('#settingsModal').modal({backdrop: 'static', keyboard: false});
			
			$('#settingsModal').on('hidden.bs.modal', function (e) {
				
				if(x.save) {
					
					proxyDirectives = [];
					
					$('.settings-modal__proxy-row').each(function() {
						var path = $(this).find('.settings-modal__proxy-path').val();
						var protocol = $(this).find('.settings-modal__proxy-protocol option:selected').text();
						var host = $(this).find('.settings-modal__proxy-host').val();
												
										
						var config = {							
							path: path,
							protocol: protocol,
							hostname: host.split(':')[0],
							port: host.split(':')[1]
						};
						proxyDirectives.push(config);
					})					
					
					console.log('save', JSON.stringify(proxyDirectives,null,2));
					localStorage.proxyDirectives = JSON.stringify(proxyDirectives);
					
					var number = $('.settings-modal__input-max-messages').val();					
					localStorage.maxNumberOfMessages = number;
					if(number < 100) number = 100;
					iosocket.emit('proxy config', proxyDirectives);
					
					//console.log(JSON.stringify(output, null, 2));
					resolve(proxyDirectives);
				}
				else {	
					console.log('canceled');
					reject('no save');
				}
			})			
		});
	}

	$('.settings-modal__cancel').click(function(e) {
		x.save = false;
	})
	
	$('.settings-modal__save').click(function(e) {
		x.save = true;
	})
	
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
		if(this.value === 'any:') {
			$('.settings-modal__input-path').attr('placeholder', 'Entry source port number');			
		}
		else {
			$('.settings-modal__input-path').attr('placeholder', 'Enter path (e.g., /xxx/yyy)');			
		}
	})
	
	$('.settings-modal__add-button').click(function() {		
		var path = $('.settings-modal__input-path').val();
		var protocol = $('.settings-modal__select-protocol option:selected').text();
		var host = $('.settings-modal__input-host').val();
		var error = false;
		
		if(protocol === 'any:') {
			if(parseInt(path) === 'NaN') {
				$('.settings-modal__error-message').text('When protocol "any:" is selected port number is requied');				
				error = true;
			}
		} else {
			if(!path.startsWith('/')) {
				$('.settings-modal__error-message').text(`When protocol "${protocol}" is selected the path must begin with "/"`);				
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
			addRow(path, protocol, host);
			$('.settings-modal__add-button').prop('disabled', true);
			$('.settings-modal__save').prop('disabled', false);			
			$('.settings-modal__input-path').val('');						
			$('.settings-modal__input-host').val('');
		}		
	})
	
	$('.settings-modal__table').click(function(e) {
		var $element = $(e.target);
		if($element.hasClass('settings-modal__proxy-delete-button')) {
			$element.closest('.settings-modal__proxy-row').remove();	
			$('.settings-modal__save').prop('disabled', false);
		}
	})	
	
	$('.settings-modal__table').on('input', function(e) {
		var $element = $(e.target);
		$('.settings-modal__error-message').text('');
		$('.settings-modal__save').prop('disabled', false);		
	})	
	
	$('.settings-modal__input-max-messages').on('input', function(e) {		
		$('.settings-modal__save').prop('disabled', false);		
	})	
	
	function addRow(path, protocol, host) {
		if(host.split(':').length == 1) host += ':80';
		let options = ['<option>http:</option>', '<option>https:</option>', '<option>any:</option>'];
		if(protocol === 'http:') options.unshift(options.splice(0,1)[0]);
		else if(protocol === 'https') options.unshift(options.splice(1,1)[0]);
		else if(protocol === 'any:') options.unshift(options.splice(2,1)[0]);
		var row = 
			'<tr class="settings-modal__proxy-row">' +				
				'<td>' +
					'<button class="settings-modal__proxy-delete-button btn btn-sm btn-danger">X</button>' +
				'</td>' +				
				'<td class="settings-modal__proxy-path-container">' +
					'<input class="settings-modal__proxy-path" value="'+path+'">' +
				'</td>' +
				'<td class="settings-modal__proxy-protocol-container">' +
					'<select class="settings-modal__proxy-protocol">' +
						options.join('') +
					'<select/>' +
				'</td>' +
				'<td class="settings-modal__proxy-host-container">' +
					'<input class="settings-modal__proxy-host" value="'+host+'">' +
				'</td>' +
			'</tr>';
			var $table = $('.settings-modal__table');
			$table.find('tbody').append(row);
			$table.show();
	}
	
	return x;
}());