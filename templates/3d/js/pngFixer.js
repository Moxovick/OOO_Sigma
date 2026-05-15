
function fnFixPng($obj) {
	var version = navigator.appVersion;
	if (navigator.platform == "Win32" && navigator.appName == "Microsoft Internet Explorer" && window.attachEvent && parseInt($.browser.version, 10) < 10) {
		var bg	= $obj.css("background-image");
		var src = bg.substring(5,bg.length-2);
		$obj.css("filter", "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src + "', sizingMethod='scale')");
		$obj.css("background-image",  "url(x.gif)");
	}
}