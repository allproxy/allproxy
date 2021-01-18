$(document).ready(function() {
	
	var iosocket = io.connect();

	iosocket.on('connect', function () {
    	
		$('.header__status').css('color', 'green');
		$('.header__status').addClass('fa-circle');
		$('.header__status').removeClass('fa-exclamation-triangle');
		$('.header__status').attr('title', 'proxy connected');

		SettingsModal.load(iosocket);

		Dashboard.start(iosocket);
	});

	iosocket.on('disconnect', function() {
		$('.header__status').css('color', 'red');
		$('.header__status').removeClass('fa-circle');
		$('.header__status').addClass('fa-exclamation-triangle');
		$('.header__status').attr('title', 'proxy unreachable');
	});
    
    /**
     * Click on title to clear all captured requests
     */
	$('.header__trash').unbind('click');
    $('.header__trash').click(function(e) {					
		window.location.reload();
	})
			
	$('.header__settings').unbind('click');
	$('.header__settings').click(function(e) {		
		SettingsModal.open(iosocket)
		.then(function(proxyDirectives) {
			// nothing to do				
		})
	})	
})