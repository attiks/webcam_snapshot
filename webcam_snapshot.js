(function ($) {
	$.webcam_snapshot = function(object, options) {

		// default settings
		var settings = $.extend({
			videoWidth: 0,
			videoHeight: 480,
			selectionAspectRatio: 0.75,
			selection: {
				top: 20,
				left: 100,
				right: 180,
				bottom: 140
			},
			overlayOpacity: 0.7,
			destinationSize: [120, 160],
			$destination: '',
			$preview: '',
			$trigger: ''
		}, options);

		// remove vendor prefixes
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.oGetUserMedia || navigator.msGetUserMedia;
		window.URL = window.URL || window.webkitURL;

		var localMediaStream = null;
		var canPlay = false;
		var selectionStart = [0, 0];

		var $video = $(object);
		var $message = $('<div>Loading...</div>').css({
			'position': 'absolute',
			'background': '#FFF',
			'opacity': '.5',
			'left': '1px',
			'top': '1px'
		});
		var $wrapper = $('<div />').css('position', 'relative').height($video.height());
		var $overlay = $('<canvas />').css('position', 'absolute');
		var overlay_ctx = $overlay[0].getContext('2d');
		var $destinationCanvas = $('<canvas />').css('display', 'none');

		// Display a message with optional timeout
		var setMessage = function(message, timeout) {
			$message.html(message).css('display', 'block');
			if (timeout) {
				window.setTimeout(function() {
					$message.fadeOut();
				}, timeout);
			}
		}

		var showTryAgainButton = function() {
			$retry = $("<br /><input type='button' value='Try again' />");
			$message.append($retry);
			$retry.click(requestCamAccess);
		}
		
		// Try and get access to the webcam
		var requestCamAccess = function() {
			if (navigator.getUserMedia) {
				setMessage('Attempting to start video...');
				showTryAgainButton();
				navigator.getUserMedia({video: {mandatory: {minWidth: 1280, minHeight: 720}}, audio: false}, onSuccess, onError);
//				navigator.getUserMedia({video: {mandatory: {minWidth: 800}}, audio: false}, onSuccess, onError);
//				navigator.getUserMedia({video: true, audio: false}, onSuccess, onError);
			}
			else {
				setMessage('HTML5 video from a webcam is not supported by your browser.');
			}
		}

		// When we get access to the webcam
		var onSuccess = function(stream) {
			localMediaStream = stream;
			setMessage('Video running...', 1500);
			if (navigator.mozGetUserMedia) {
				$video[0].mozSrcObject = stream;
			}
			else {
				$video[0].src =  window.URL.createObjectURL(stream);
			}
			$video[0].play();
		};

		// If we don't get access to the webcam
		var onError = function(error) {
			console.log('An error occurred starting the webcam', error);
			setMessage("Permission denied starting video stream.<br />On Chrome make sure you didn't accidentally blacklist yourself at:<br />chrome://settings/contentExceptions#media-stream");
			showTryAgainButton();
		};

		// Simulate a camera flash (badly)
		var flash = function() {
			overlay_ctx.globalAlpha = .8;
			overlay_ctx.fillStyle = '#DDDDDD';
			overlay_ctx.fillRect(0, 0, settings.videoWidth, settings.videoHeight);
			window.setTimeout(updateOverlay, 150);
		}

		// Take a picture
		var snapshot = function( ) {
			if (localMediaStream) {
				setMessage('Taking photo', 1000);
				flash();
				var sx = $video[0].videoWidth / settings.videoWidth * settings.selection.left;
				var sy = $video[0].videoHeight / settings.videoHeight * settings.selection.top;
				var swidth = $video[0].videoWidth / settings.videoWidth * (settings.selection.right - settings.selection.left);
				var sheight = $video[0].videoHeight / settings.videoHeight * (settings.selection.bottom - settings.selection.top);
				$destinationCanvas[0].getContext('2d').drawImage($video[0], sx, sy, swidth, sheight, 0, 0, settings.destinationSize[0], settings.destinationSize[1]);
				var data = $destinationCanvas[0].toDataURL('image/jpeg')
				if (settings.$preview) {
					settings.$preview.attr('src', data);
				}
				if (settings.$destination) {
					settings.$destination.val(data);
				}
			}
		}

		// rescale the video, overlay and wrapper that holds them
		var rescale = function() {
			if ($video[0].videoHeight * $video[0].videoWidth == 0) {
				// for some reason dimensions are not always available as soon as canplay fires so keep trying until they are
				// FIXME: try binding to the playing event instead
				setTimeout(rescale, 50);
			}
			else {
				if (settings.videoHeight == 0 && settings.videoWidth == 0) {
					// No dimensions specified so use full size stream
					settings.videoHeight = $video[0].videoHeight;
					settings.videoWidth = $video[0].videoWidth;
				}
				else if (settings.videoHeight == 0) {
					// Only a width was specified
					settings.videoHeight = $video[0].videoHeight / ($video[0].videoWidth / settings.videoWidth);
				}
				else if (settings.videoWidth == 0) {
					// Only a height was specified
					settings.videoWidth = $video[0].videoWidth / ($video[0].videoHeight / settings.videoHeight);
				}
				$wrapper.height(settings.videoHeight );
				$wrapper.width(settings.videoWidth);
				$video.width(settings.videoWidth);
				$video.height(settings.videoHeight);
				$overlay.width(settings.videoWidth); // css size of canvas element
				$overlay.height(settings.videoHeight);
				$overlay[0].width = settings.videoWidth; // size of the canvas itself
				$overlay[0].height = settings.videoHeight;
				updateOverlay();
			}
		};
		
		// draw the selection box
		var updateOverlay = function() {
			overlay_ctx.globalAlpha = settings.overlayOpacity;
			overlay_ctx.fillStyle = '#000000';
			overlay_ctx.strokeStyle = '#FFFFFF';
			overlay_ctx.lineWidth = 5;
			overlay_ctx.clearRect(0, 0, settings.videoWidth, settings.videoHeight);
			overlay_ctx.fillRect(0, 0, settings.videoWidth, settings.videoHeight);
			var width = settings.selection.right - settings.selection.left;
			var height = settings.selection.bottom - settings.selection.top;
			overlay_ctx.clearRect(settings.selection.left, settings.selection.top, width, height);
			overlay_ctx.strokeRect(settings.selection.left, settings.selection.top, width, height);
		};

		// insert elements into the document
		var init_dom = function() {
			$video.wrap($wrapper).css('position', 'absolute');
			$wrapper = $video.parent();
			$overlay.insertAfter($video);
			$destinationCanvas.insertAfter($wrapper);
			$message.insertAfter($overlay);
		}
		
		// Rescale on the first canplay event
		// FIXME why not just unbind the event rather than set a flag?
		// $video[0].removeEventListener('playing', 'onCanPlay', false);
		// canplay keeps firing on some platforms apparently, but we don't want to keep rescaling
		var onCanPlay = function(event) {
			if (!canPlay) {
				rescale();
//				console.log($video[0].videoWidth + "x" + $video[0].videoHeight);
				canPlay = true;
			}
		};
		
		// Get the current mouse position within the overlay
		var getMousePosition = function(event) {
			var x = event.pageX - $overlay.offset().left;
			var y = event.pageY - $overlay.offset().top;
			x = (x < 0) ? 0 : (x > $overlay.width()) ? $overlay.width() : x;
			y = (y < 0) ? 0 : (y > $overlay.height()) ? $overlay.height() : y;
			return [x, y];
		};
		
		// Start selection on mousedown event
		var onMouseDown = function(event) {
			event.preventDefault();
			event.stopPropagation();
			$(document).mousemove(onMouseMove).mouseup(onMouseUp);
			selectionStart = getMousePosition(event);
			settings.selection.left = selectionStart[0];
			settings.selection.top = selectionStart[1];
			settings.selection.right = selectionStart[0];
			settings.selection.bottom = selectionStart[1];
			updateOverlay();  
		};
		
		// Expand selection on mousemove event
		var onMouseMove = function(event) {
			event.preventDefault();
			event.stopPropagation();
			var mousePosition = getMousePosition(event);
			if (mousePosition[0] > selectionStart[0]) {
				// expand to the right
				settings.selection.left = selectionStart[0];
				settings.selection.right = mousePosition[0];
			}
			else {
				// expand to the left
				settings.selection.right = selectionStart[0];
				settings.selection.left = mousePosition[0];
			}
			if (mousePosition[1] > selectionStart[1]) {
				// expand down
				settings.selection.top = selectionStart[1];
				settings.selection.bottom = mousePosition[1];
			}
			else {
				// expand up
				settings.selection.bottom = selectionStart[1];
				settings.selection.top = mousePosition[1];
			}
			if(settings.selectionAspectRatio != 0) {
				var width = settings.selection.right - settings.selection.left;
				var height = settings.selection.bottom - settings.selection.top;
				if (width / height > settings.selectionAspectRatio) {
					// too narrow
					width = height * settings.selectionAspectRatio;
					if (mousePosition[0] > selectionStart[0]) {
						// expanding to the right
						settings.selection.right = settings.selection.left + width;
						if (settings.selection.right > settings.videoWidth) {
							// we'd have gone off the screen, so set width to max and limit height
							settings.selection.right = settings.videoWidth; // FIXME: off by 1 error
							height = width / settings.selectionAspectRatio;
							settings.selection.bottom = settings.selection.top + height;
						}
					}
					else {
						// expanding to the left
						settings.selection.left = settings.selection.right - width;
						if (settings.selection.left < 0) {
							settings.selection.left = 0;
							height = width / settings.selectionAspectRatio;
							settings.selection.bottom = settings.selection.top + height;
						}
					}
				}
				else {
					// too tall
					height = width / settings.selectionAspectRatio;
					if (mousePosition[1] > selectionStart[1]) {
						// expanding down
						settings.selection.bottom = settings.selection.top + height;
						if (settings.selection.bottom > settings.videoHeight) {
							// we'd have gone off the screen, so set height to max and limit width
							settings.selection.bottom = settings.videoHeight;
							width = height * settings.selectionAspectRatio;
							settings.selection.right = settings.selection.right + width;
						}
					}
					else {
						// expanding upwards
						settings.selection.top = settings.selection.bottom - height;
						if (settings.selection.top < 0) {
							settings.selection.top = 0;
							height = width / settings.selectionAspectRatio;
							settings.selection.right = settings.selection.right + width
						}
					}
				}
			}
			updateOverlay();
		}
		
		// Stop selection on mouseup event
		var onMouseUp = function(event) {
			event.preventDefault();  
			event.stopPropagation();  
			$(document).unbind('mousemove');  
			$(document).unbind('mouseup');
			updateOverlay();
		}
		
		$video[0].addEventListener('canplay', onCanPlay, false);
		$video[0].autoplay = true;
		$destinationCanvas[0].width = settings.destinationSize[0];
		$destinationCanvas[0].height = settings.destinationSize[1];
		init_dom();
		requestCamAccess();
		updateOverlay();
		$overlay.mousedown(onMouseDown);
		if (settings.$trigger) {
			settings.$trigger.click(snapshot);
		}
	};
	
	$.fn.webcam_snapshot = function(options) {
		this.each(function() {
			$.webcam_snapshot(this, options)
		});
		return this;
	};
})( jQuery );

Drupal.behaviors.webcam_snapshot = function(context) {
	var options = Drupal.settings.webcam_snapshot;
	var $destination = $('#' + options.id);
	options.$destination = $destination;
	options.$trigger = $destination.siblings().filter("input[type|='button']");
	options.$preview = $destination.siblings().filter('img');
	$destination.siblings().filter('video').webcam_snapshot(options);
};
