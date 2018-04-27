// Load a text resource from a file over the network
var loadTextResource = function (url, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', url + '?please-dont-cache=' + Math.random(), true);
	request.onload = function () {
		if (request.status < 200 || request.status > 299) {
			callback('Error: HTTP Status ' + request.status + ' on resource ' + url);
		} else {
			callback(null, request.responseText);
		}
	};
	request.send();
};

var loadImage = function (url, callback) {
	var image = new Image();
	image.onload = function () {
		callback(null, image);
	};
	image.src = url;
};

var loadJSONResource = function (url, callback) {
	loadTextResource(url, function (err, result) {
		if (err) {
			callback(err);
		} else {
			try {
				callback(null, JSON.parse(result));
			} catch (e) {
				callback(e);
			}
		}
	});
};


//  For Getting Color values from Transfer Functions for the GUI
function linearInterpolate(x,y) {
	return (x + y) / 2;
}

function getOpacity(value) {
	var i = d3.min([bisect.left(result, value), result.length-2])	
	return linearInterpolate(result[i].y, result[i+1].y) / d3.max(result, d => d.y);	
}

function getColor(value) {
	var i = d3.min([bisectColor.left(pts, value), pts.length-2])	
	var r = Math.round(linearInterpolate(cols[i].r, cols[i+1].r)),
		g = Math.round(linearInterpolate(cols[i].g, cols[i+1].g)),
		b = Math.round(linearInterpolate(cols[i].b, cols[i+1].b));
		o = Math.round(getOpacity(value)*100)/100;
		if (o == undefined){
			console.log('bad value: ' + value)
			o = 1.0;
		}
	return d3.rgb(r,g,b,o);
}

function setGUIColors() {
	var colors = xs.slice(0,-1).map(getColor);
	colors.forEach(function(d,i){
		for (var idx=0; idx<guiControlss.length; idx++){
			guiControlss[idx]['stepPos'+i] = xs[i] / tf_width;
			guiControlss[idx]['color'+i] = rgb2rgb(d);
		}
	})	
	updateTextures();
}

function rgb2rgb(val,o) {
	return "rgba(" + val.r + "," + val.g + "," + val.b + "," + val.opacity + ")";
}

function rgb2hex(val) {
    var rgb = val.b | (val.g << 8) | (val.r << 16);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
}

function getOpacities() {
	return xs.slice(0,-1).map(getOpacity);
}