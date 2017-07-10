// ==UserScript==
// @name NPO Start Downloader
// @namespace NPO Start Downloader
// @author Laurvin
// @description Allows for NPO Start tv programs to be downloaded by right-clicking the video or using other tools.
// @version 1.0
// @icon http://i.imgur.com/XYzKXzK.png
// @include https://www.npo.nl/*
// @include http://www.npo.nl/*
// @grant GM_xmlhttpRequest
// @grant GM_setClipboard
// @require http://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @require https://github.com/Sighery/SRQ/releases/download/v0.1.0/SerialRequestsQueue-0.1.0.js
// @run-at document-idle
// ==/UserScript==

var queue = new SRQ();
var video_prid = '';
var token = '';

$( document ).ready(function()
{
	// Appending button, only shows up on episode pages.
	$('.npo-header-episode-buttons').append('<div class="btn secondary" id="DownloadIt">Download</div>');
	$('#DownloadIt').click(function()
	{
		var video_id = window.location.href;
		video_id = video_id.substring(video_id.lastIndexOf('/')+1);
		Downloader(video_id);
	});
	
	function Downloader(video_id)
	{
		queue.add_to_queue(
		{
			"link": 'http://e.omroep.nl/metadata/' + video_id,
			"method": "GET",
			"timeout": 6000
		});

		if (queue.is_busy() === false)
		{
			queue.start(metadata_request_callback);
		}
	}

	function metadata_request_callback(requested_obj)
	{
		if (requested_obj.successful)
		{
			var meta_response = requested_obj.response.responseText;
			meta_response = meta_response.substring(meta_response.indexOf('{')); // Remove "parseMetadata("
			meta_response = meta_response.substring(0, meta_response.lastIndexOf('}')+1); // Remove ") //ep"
			var video_meta_JSON = JSON.parse(meta_response);
			video_prid = video_meta_JSON.prid;
			
			// Getting title, subtitle, and date and copying them to clipboard for file title.
			var video_title = video_meta_JSON.titel;
			var video_subtitle = video_meta_JSON.aflevering_titel;
			var video_date = video_meta_JSON.gidsdatum;

			full_title = video_title + ' - ' + video_date;			
			if (video_subtitle !== '' && video_subtitle != video_title) full_title += ' - ' + video_subtitle;
			
			GM_setClipboard(full_title, "text");

			queue.add_to_queue(
			{
				"link": 'http://ida.omroep.nl/app.php/auth',
				"method": "GET",
				"timeout": 6000
			});

			if (queue.is_busy() === false)
			{
				queue.start(token_request_callback);
			}
		}
		else
		{
			alert('Failed getting video meta data!');
		}

		if (queue.is_busy() === false)
		{
			queue.start(normal_callback);
		}
	}

	function token_request_callback(requested_obj)
	{
		if (requested_obj.successful)
		{
			var token_JSON = JSON.parse(requested_obj.response.responseText);
			token = token_JSON.token;

			queue.add_to_queue(
			{
				"link": 'http://ida.omroep.nl/app.php/' + video_prid + '?adaptive=no&token=' + token,
				"method": "GET",
				"timeout": 6000
			});

			if (queue.is_busy() === false)
			{
				queue.start(videolist_request_callback);
			}
		}
		else
		{
			alert('Failed getting token!');
		}

		if (queue.is_busy() === false)
		{
			queue.start(normal_callback);
		}
	}

	function videolist_request_callback(requested_obj)
	{
		if (requested_obj.successful)
		{
			var videolist_JSON = JSON.parse(requested_obj.response.responseText);

			var Hoog = '';
			var Normaal = '';
			var Laag = '';
			var video_url = '';
			
			$.each(videolist_JSON.items, function (index, item)
			{
				$.each(item, function (index2, item2)
				{
					if(item2.label == 'Hoog') Hoog = item2.url;
					if(item2.label == 'Normaal') Normaal = item2.url;
					if(item2.label == 'Laag') Laag = item2.url;
				});
			});

			if (Laag !== '') video_url = Laag; // Grabbing best of the three.
			if (Normaal !== '') video_url = Normaal;
			if (Hoog !== '') video_url = Hoog;
			
			video_url = video_url.substring(0, video_url.indexOf('?')); // Removing everything after '?'.
			
			queue.add_to_queue(
			{
				"link": video_url,
				"method": "GET",
				"timeout": 6000
			});

			if (queue.is_busy() === false)
			{
				queue.start(video_url_request_callback);
			}
		}
		else
		{
			alert('Failed getting video list!');
		}

		if (queue.is_busy() === false)
		{
			queue.start(normal_callback);
		}
	}

	function video_url_request_callback(requested_obj)
	{
		if (requested_obj.successful)
		{
			var video_url_JSON = JSON.parse(requested_obj.response.responseText);
			download_url = video_url_JSON.url;
			download_url = download_url.substring(0, download_url.indexOf('?')); // Removing everything after '?'.

			window.location.href = download_url;			
		}
		else
		{
			alert('Failed getting video url!');
		}

		if (queue.is_busy() === false)
		{
			queue.start(normal_callback);
		}
	}

	function normal_callback(requested_obj)
	{
		if (requested_obj.fallback_requested)
		{
			console.log("fallback_requested");
		}
		else
		{
			console.log("fallback_NOT_requested");
		}
	}
});