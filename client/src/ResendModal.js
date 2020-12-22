var ResendModal = (function(){

	var x = {send : false};

	x.open = function(json) {	
		x.send = false;
		
		return new Promise(function(resolve, reject) {			
			
			$('.resend-modal__url').val('');
			$('.resend-modal__url').val(json.method+' '+unescape(json.url));
			
			$('.resend-modal__body').val('');
			$('.resend-modal__body').val(JSON.stringify(json.requestBody, null, 4));
			
			$('.resend-modal__error-message').text('');
			
			$('#editorModal').modal('show');
			
			$('#editorModal').on('hidden.bs.modal', function (e) {
				
				if(x.send == true) {					
					var method = 'GET';
					var url;
					var body;
					
					var tokens = $('.resend-modal__url').val().split(' ');
					if(tokens.length == 1) {
						method = 'GET';
						url = tokens[0];
					}
					else {
						method = tokens[0].toUpperCase();
						url = tokens[1];						
					}
					body = $('.resend-modal__body').val();
					if(body) {
						if(body.length > 0) {
							//body = JSON.parse(body);							
						}
						else if(body.length == 0) body = undefined;
					}
					
					var output = {
						method: method,
						url: url,
						body: body
					};
					//console.log(JSON.stringify(output, null, 2));
					resolve(output);
					x.send = false;					
				}
				else {					
					reject('canceled');
				}
			})		
		});
	}
	
	function validateBody() {
		var body = $('.resend-modal__body').val();
		if(body) {
			if(body.length > 0) {
				try {
					body = JSON.parse(body);
					if(!body instanceof Object) {
						$('.resend-modal__error-message').text('JSON format invalid!');
						$('.resend-modal__indent-button').prop('disabled', true);
					}
					else {
						$('.resend-modal__error-message').text('');		
						$('.resend-modal__indent-button').prop('disabled', false);
					}
				}
				catch(e) {
					$('.resend-modal__error-message').text('JSON format invalid!');
					$('.resend-modal__indent-button').prop('disabled', true);
					return false;
				}
			}					
		}
		
		return true;
	}
	
	$('.resend-modal__indent-button').click(function(e) {
		var body = $('.resend-modal__body').val();
		$('.resend-modal__body').val(JSON.stringify(JSON.parse(body),null,4));
	})
	
	$('.resend-modal__send').click(function(e) {
		x.send = true;
		
		//if(validateBody()) {
			$('#editorModal').modal('toggle');
		//}
	})
	
	$('.resend-modal__body').on('input', function(e) {
		validateBody();				
	})
	
	return x;
}());