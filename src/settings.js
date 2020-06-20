var settings = (function(){

	var x = {
		$rows: $('.settings-modal__table').find('tbody'),
		save: false
	};
	
	/**
	 * Maximum number of messages to capture
	 */
	x.getMaxMessages = function() {
		
		if(localStorage.maxNumberOfMessages == undefined) {
			var MAX_REQUESTS = 1000;	
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
			$('.settings-modal__table').hide();
			$('.settings-modal__add-button').prop('disabled', true);
			$('.settings-modal__input-path').val('');						
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
				var host = config.protocol+'//'+config.hostname;
				if(config.port) host += ':'+config.port;
				addRow(path, host);
			})	
																		
			$('#settingsModal').modal('show');
			
			$('#settingsModal').on('hidden.bs.modal', function (e) {
				
				if(x.save) {
					
					proxyDirectives = [];
					
					$('.settings-modal__proxy-row').each(function() {
						var path = $(this).find('.settings-modal__proxy-path').val();
						var host = $(this).find('.settings-modal__proxy-host').val();

						if(!host.startsWith('http') && !host.startsWith('https')) {
							host = 'http://' + host;
						}
												
						var url = new URL(host);						
						var config = {							
							path: path,
							protocol: url.protocol,
							hostname: url.hostname,
							port: url.port.length === 0 ? undefined : url.port
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
	
	$('.settings-modal__save').click(function(e) {
		x.save = true;
	})
	
	$('.settings-modal__input-path, .settings-modal__input-host').on('input', function(e) {
		var path = $('.settings-modal__input-path').val();
		var host = $('.settings-modal__input-host').val();
		
		$('.settings-modal__error-message').text('');
		
		if(path.length == 0 || host.length == 0) {
			$('.settings-modal__add-button').prop('disabled', true);
		}
		else {			
			$('.settings-modal__add-button').prop('disabled', false);					
		}
	})
	
	$('.settings-modal__add-button').click(function() {		
		var path = $('.settings-modal__input-path').val();
		var host = $('.settings-modal__input-host').val();
		var error = false;
		
		if(!path.startsWith('/')) {
			$('.settings-modal__error-message').text('The path must begin with a "/"');	
			error = true;
		}
		
		if(!error) {				
			addRow(path, host);
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
	
	function addRow(path, host) {
		if(host.split(':').length == 1) host += ':80';
		var row = 
			'<tr class="settings-modal__proxy-row">' +				
				'<td>' +
					'<button class="settings-modal__proxy-delete-button btn btn-sm btn-danger">X</button>' +
				'</td>' +				
				'<td class="settings-modal__proxy-path-container">' +
					'<input class="settings-modal__proxy-path" value="'+path+'">' +
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