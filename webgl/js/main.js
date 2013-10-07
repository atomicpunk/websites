/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

var display = {
	spaceview: true,
	earth: true,
	moon: true,
	stars: true,
	sun: true,
	sat: true,
	initmenu: true
};

var loading = 0;
var failure = false;
var menuopen = false;
var mouseDown = false;
var starsize = 200;
var earthsize = 2;
var myWidth = 0;
var myHeight = 0;
var aristotle = null;
var povAzi = 0;
var povAlt = 0;
var defzoom = { space: -6.0, ground: -50.0 };
var norad = new Norad(earthsize);
var gl = null;
var shader = null;
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var earthMatrix = mat4.create();
var starMatrix = mat4.create();
var moonMatrix = mat4.create();
var updateMatrices = (display.spaceview)?updateMatricesSpace:updateMatricesGround;
var zoomval = (display.spaceview)?defzoom.space:defzoom.ground;
var homepos = [45.518259, -122.902044]; // Portland
var home = new Home();
var webgl = null;

function totalfailure() {
	failure = true;
	var e = document.getElementById("main_page");
	e.style.color = "white";
	e.innerHTML = '<center><h1><br><br><br>' +
	'The page has failed to load, sorry for the inconvenience<br>' +
	'Please contact the administrator';
}

function startLoading() {
	loading++;
}

function doneLoading() {
	loading--;
	if(loading <= 0) {
		var e = document.getElementById("loading");
		e.style.display="none";

		/* start with an open menu */
		if(display.initmenu) {
			var menu = document.getElementById("menu");
			menu.className = "slide";
			menuopen = true;
		}
	}
}

function updateMatricesSpace(newAlt, newAzi, newZoom, geomodel) {
	if(newAlt != undefined) povAlt = newAlt;
	if(newAzi != undefined) povAzi = newAzi;
	if(newZoom != undefined) zoomval = newZoom;
	if(geomodel == undefined) geomodel = aristotle;

	var l_azi = povAzi - geomodel.sunazi;
	var s_azi = povAzi - geomodel.starazi;
	var m_azi = povAzi - geomodel.moonazi;

	var sunlight = mat4.create();
	mat4.identity(sunlight);
	mat4.rotate(sunlight, povAlt, [1, 0, 0]);

	mat4.set(sunlight, starMatrix);
	mat4.rotate(starMatrix, s_azi, [0, 1, 0]);

	mat4.rotate(sunlight, l_azi, [0, 1, 0]);
	mat4.rotate(sunlight, geomodel.sunalt, [0, 0, 1]);

	if(shader && gl) {
		gl.uniform3fv(shader.daylightDirection, vec3.create(sunlight));
		mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);
	}

	mat4.identity(earthMatrix);
	mat4.translate(earthMatrix, [0, 0, zoomval]);
	mat4.rotate(earthMatrix, povAlt, [1, 0, 0]);
	mat4.set(earthMatrix, moonMatrix);
	mat4.rotate(earthMatrix, povAzi, [0, 1, 0]);

	mat4.rotate(moonMatrix, m_azi, [0, 1, 0]);
	mat4.translate(moonMatrix, geomodel.moonpos);
}

function updateMatricesGround(newAlt, newAzi, newZoom, geomodel) {
	if(newAlt != undefined) {
		povAlt = (newAlt < 0.3)?0.3:newAlt;
		povAlt = (povAlt > 1.4)?1.4:povAlt;
	}
	if(newAzi != undefined) povAzi = newAzi;
	if(newZoom != undefined) zoomval = newZoom;
	if(geomodel == undefined) geomodel = aristotle;

	var e_azi = Math.PI/2 - (home.lon)*Math.PI/180;
	var e_alt = (home.lat)*Math.PI/180 - Math.PI/2;
	var northpole = [0, -earthsize, 0];

	var alt = -povAlt;
	var azi = povAzi - Math.PI;

	var l_azi = e_azi - geomodel.sunazi;
	var s_azi = e_azi - geomodel.starazi;
	var m_azi = e_azi - geomodel.moonazi;
	var m_alt = alt + e_alt;

	var sunlight = mat4.create();
	mat4.identity(sunlight);
	mat4.rotate(sunlight, alt, [1, 0, 0]);
	mat4.set(sunlight, starMatrix);
	mat4.set(sunlight, earthMatrix);

	mat4.rotate(starMatrix, e_alt, [1, 0, 0]);
	mat4.rotate(starMatrix, s_azi, [0, 1, 0]);
	mat4.rotate(starMatrix, azi, home.vecstar);

	mat4.rotate(earthMatrix, e_azi, [0, 1, 0]);
	mat4.translate(earthMatrix, northpole);
	mat4.rotate(earthMatrix, e_alt, [Math.cos(e_azi), 0, Math.sin(e_azi)]);
	mat4.rotate(earthMatrix, azi, home.vec);

	mat4.identity(moonMatrix);
	mat4.rotate(moonMatrix, m_alt, [1, 0, 0]);
	mat4.rotate(moonMatrix, m_azi, [0, 1, 0]);
	mat4.rotate(moonMatrix, azi, home.vecmoon);
	mat4.translate(moonMatrix, northpole);
	mat4.translate(moonMatrix, geomodel.moonpos);

	mat4.rotate(sunlight, l_azi, [0, 1, 0]);
	mat4.rotate(sunlight, geomodel.sunalt, [0, 0, 1]);
	mat4.rotate(sunlight, azi, home.vecsun);

	if(shader && gl) {
		gl.uniform3fv(shader.daylightDirection, vec3.create(sunlight));
		var p = 15 + ((-zoomval - 2.5)/97.5)*75.0;
		mat4.perspective(p, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);
	}
}

function Home() {
	"use strict";

	var self = this;
	this.lat = homepos[0];
	this.lon = homepos[1];
	this.pos = [0, 0, 0];
	this.vec = [0, 0, 0];

	this.initVectors = initVectors;
	function initVectors(geomodel) {
		if(failure) return;

		self.vecstar = vectorFromLatLon(self.lat, self.lon + geomodel.starazi*180/Math.PI);
		self.vecmoon = vectorFromLatLon(self.lat, self.lon + geomodel.moonazi*180/Math.PI);
		self.vecsun = vectorFromLatLon(self.lat, self.lon + geomodel.sunazi*180/Math.PI);
	}

	this.init = init;
	function init() {
		if(failure) return;

		povLatLon(self.lat, self.lon);
		self.pos = posFromLatLon(self.lat, self.lon);
		self.vec = vectorFromLatLon(self.lat, self.lon);
		if(aristotle) initVectors(aristotle);

		if(gl) {
			var posArray = [self.pos[0], self.pos[1], self.pos[2]];
			var idxArray = [0];

			self.posBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.posBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posArray), gl.STATIC_DRAW);
			self.posBuffer.itemSize = 3;
			self.posBuffer.numItems = posArray.length/3;

			self.idxBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.idxBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idxArray), gl.STATIC_DRAW);
			self.idxBuffer.itemSize = 1;
			self.idxBuffer.numItems = idxArray.length;
		}
	}

	this.newpos = newpos;
	function newpos(p) {
		if(gl) {
			self.pos = p;
			var posArray = [self.pos[0], self.pos[1], self.pos[2]];
			var idxArray = [0];

			self.posBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.posBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posArray), gl.STATIC_DRAW);
			self.posBuffer.itemSize = 3;
			self.posBuffer.numItems = posArray.length/3;

			self.idxBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.idxBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idxArray), gl.STATIC_DRAW);
			self.idxBuffer.itemSize = 1;
			self.idxBuffer.numItems = idxArray.length;
		}
	}

	function posFromLatLon(latitude, longitude) {
		var pos = [];
		var lat = (90 - latitude)*Math.PI/180;
		var lon = (180 - longitude)*Math.PI/180;
		pos[0] = earthsize*Math.cos(lon)*Math.sin(lat);
		pos[1] = earthsize*Math.cos(lat);
		pos[2] = earthsize*Math.sin(lon)*Math.sin(lat);
		return pos;
	}

	function vectorFromLatLon(latitude, longitude) {
		var vec = [];
		var lat = (90 - latitude)*Math.PI/180;
		var lon = (180 - longitude)*Math.PI/180;
		vec[0] = Math.cos(lon)*Math.sin(lat);
		vec[1] = Math.cos(lat);
		vec[2] = Math.sin(lon)*Math.sin(lat);
		return vec;
	}

	function posOpposite(pos) {
		return [-pos[0], -pos[1], -pos[2]];
	}

	this.povLatLon = povLatLon;
	function povLatLon(latitude, longitude) {
		povAlt = (latitude)*Math.PI/180;
		povAzi = (90 - longitude)*Math.PI/180;
	}
}

Home.prototype.draw = function() {
	if(loading > 0 || failure) return;

	gl.uniform1i(shader.uselighting, 0);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, earthMatrix);
	gl.uniform1f(shader.pointSize, 10.0);
	gl.uniform1i(shader.monochromatic, 1);
	gl.uniform3f(shader.monoColor, 0.0, 1.0, 0.0);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
	gl.vertexAttribPointer(shader.vertexPositionAttribute, this.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
	gl.drawElements(gl.POINTS, this.idxBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function GeocentricModel() {
	"use strict";

	var self = this;
	this.days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
	this.sunalt = 0;
	this.sunazi = 0;
	this.sunvector = [0, 0, 0];
	this.moonazi = 0;
	this.moonpos = [earthsize * 30.103480715, 0, 0];
	this.latlon = [];
	this.starazi = Math.PI/2 + 0.027378508*2.0*Math.PI;
	this.interval = null;

	/* initial solar system position, time = Jan 1 12:00AM UTC */
	/* 10 days after winter solstice (10/365.25)*2*pi */
	function init() {
		if(failure) return;

		/* create the 3D representation of a sphere with lat/lon as vertices */
		for (var lat = 0; lat <= 180; lat++) {
			self.latlon[lat] = [];
			var theta = lat * Math.PI / 180;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			for (var lon = 0; lon <= 360; lon++) {
				var phi = lon * 2 * Math.PI / 360;
				var x = Math.cos(phi) * sinTheta;
				var y = cosTheta;
				var z = Math.sin(phi) * sinTheta;
				self.latlon[lat][lon] = { x: x, y: y, z: z };
			}
		}
		sunSync();
		self.interval = window.setInterval(function() {if(!mouseDown && !loading && !failure) sunSync();}, 5000);
	}

	function currentTime() {
		var date = new Date();
		var day = self.days[date.getUTCMonth()] + date.getUTCDate();
		var sec = (date.getUTCHours()*3600) + (date.getUTCMinutes()*60) + date.getUTCSeconds();
		var t = date.getTime()/1000;
		return [day, sec, t];
	}

    function vecFromIncAzi(altitude, azimuth) {
        var vec = [];
        vec[0] = Math.cos(azimuth)*Math.cos(altitude);
        vec[1] = Math.sin(altitude);
        vec[2] = Math.sin(azimuth)*Math.cos(altitude);
        return vec;
    }

	this.sunpos = sunPos;
	function sunPos() {
		var t = currentTime();
		var fyear = ((t[0] * 86400) + t[1]) / 31557600;
		var azi = (0.027378508 + fyear)*2.0*Math.PI;
		var alt = -0.41 * Math.cos(azi);
		return [azi, alt];
	}

	this.sync = sunSync;
	function sunSync() {
		var t = currentTime();
		var fyear = ((t[0] * 86400) + t[1]) / 31557600;
		var fday = (t[1]/86400);
		self.starazi = Math.PI/2 + (0.027378508 + fyear + fday)*2.0*Math.PI;
		self.suninc = -0.41 * Math.cos((0.027378508 + fyear)*2.0*Math.PI);
		self.sunazi = fday*2.0*Math.PI;
		self.sunvector = vecFromIncAzi(self.suninc, self.sunazi);

		var ang = ((t[2] + 150000)/2360585.0)*2.0*Math.PI;
		var mooninc = self.suninc*Math.cos(ang);
		self.moonazi = self.sunazi - ang;
		self.moonpos[0] = earthsize*30.103480715*Math.cos(mooninc);
		self.moonpos[1] = earthsize*30.103480715*Math.sin(mooninc);
		self.moonpos[2] = 0;

		home.initVectors(self);
		updateMatrices(povAlt, povAzi, zoomval, self);
	}

    init();
}

GeocentricModel.prototype.isNight = function(lat, lon) {
    var x1 = this.latlon[lat][lon].x, y1 = this.latlon[lat][lon].y, z1 = this.latlon[lat][lon].z;
    var x2 = this.sunvector[0], y2 = this.sunvector[1], z2 = this.sunvector[2];
    var dotp = x1*x2 + y1*y2 + z1*z2;
    var mag1 = Math.sqrt(x1*x1 + y1*y1 + z1*z1);
    var mag2 = Math.sqrt(x2*x2 + y2*y2 + z2*z2);
    var a = Math.acos(dotp / (mag1 * mag2));

    if(a < (Math.PI/2))
        return false;
    return true;
}

function CosmicBody(idstr, imgfile, radius, lighting) {
    "use strict";

    var self = this;
    this.vertexPositionBuffer = null;
    this.vertexNormalBuffer = null;
    this.vertexTextureCoordBuffer = null;
    this.vertexIndexBuffer = [];
    this.texture = [];
    this.id = idstr;
    this.lighting = lighting;
    this.vertexPositionData = [];
    this.normalData = [];
    this.textureCoordData = [];
    this.indexData = [];
	this.interval = null;

    function init() {
		if(failure) return;

        for(var i = 0; i < imgfile.length; i++)
            initTexture(i);
        initVectors();
		if(self.id == "earth")
			self.interval = window.setInterval(function() {if(!mouseDown && !loading && !failure) initVectors();}, 5000);
    }

	function initTexture(idx) {
        self.texture[idx] = gl.createTexture();
        self.texture[idx].image = new Image();
		startLoading();
        self.texture[idx].image.onload = function () {
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.bindTexture(gl.TEXTURE_2D, self.texture[idx]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, self.texture[idx].image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
			doneLoading();
        }
        self.texture[idx].image.src = imgfile[idx];
    }

    function vectorDefault(reverse) {
        for (var lat=0; lat <= 180; lat++) {
            for (var lon=0; lon <= 360; lon++) {
                var x = aristotle.latlon[lat][lon].x;
                var y = aristotle.latlon[lat][lon].y;
                var z = aristotle.latlon[lat][lon].z;
                var v = 1 - (lat / 180);
                var u = 1 - (lon / 360);
				if(reverse)
					u = (lon / 360);

                self.normalData.push(x, y, z);
                self.vertexPositionData.push(radius * x, radius * y, radius * z);
                self.textureCoordData.push(u, v);

                if((lat < 180)&&(lon < 360)) {
                    var uright = (lat * (360 + 1)) + lon;
                    var uleft = uright + 1;
                    var lright = uright + 360 + 1;
                    var lleft = uleft + 360 + 1;
                    if(self.id == "earth") {
                        var ur = aristotle.isNight(lat, lon);
                        var idx = (ur)?1:0;
                        self.indexData[idx].push(uright, uleft, lright, uleft, lleft, lright);
                    } else {
                        self.indexData[0].push(uright, uleft, lright, uleft, lleft, lright);
                    }
                }
            }
        }
    }

	function vectorSun() {
		var ang = aristotle.sunpos();
		var square = []
		var dA = Math.PI/18;
		square[0] = [-1*dA, -1*dA];
		square[1] = [   dA, -1*dA];
		square[2] = [-1*dA,    dA];
		square[3] = [   dA,    dA];
		for(var i = 0; i < 4; i++) {
			var theta = square[i][1] - ang[0];
			var phi = square[i][0] + ang[1];
			var x = Math.sin(theta)*Math.cos(phi);
			var y = Math.sin(phi);
			var z = -1*Math.cos(theta)*Math.cos(phi);
			var v = i%2;
			var u = parseInt(i/2);
			self.normalData.push(x, y, z);
			self.vertexPositionData.push(radius * x, radius * y, radius * z);
			self.textureCoordData.push(u, v);
		}
		self.indexData[0].push(0, 1, 2, 1, 3, 2);
	}

    function initVectors() {
        self.vertexPositionData = [];
        self.normalData = [];
        self.textureCoordData = [];
        self.indexData = [];

        for (var i = 0; i < self.texture.length; i++) {
            self.indexData[i] = [];
        }

		if(self.id == "sun")
			vectorSun();
		else if(self.id == "stars")
			vectorDefault(true);
		else
			vectorDefault(false);

        self.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(self.normalData), gl.STATIC_DRAW);
        self.vertexNormalBuffer.itemSize = 3;
        self.vertexNormalBuffer.numItems = self.normalData.length / 3;

        self.vertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(self.textureCoordData), gl.STATIC_DRAW);
        self.vertexTextureCoordBuffer.itemSize = 2;
        self.vertexTextureCoordBuffer.numItems = self.textureCoordData.length / 2;

        self.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(self.vertexPositionData), gl.STATIC_DRAW);
        self.vertexPositionBuffer.itemSize = 3;
        self.vertexPositionBuffer.numItems = self.vertexPositionData.length / 3;

		for (var i = 0; i < self.texture.length; i++) {
			self.vertexIndexBuffer[i] = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.vertexIndexBuffer[i]);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(self.indexData[i]), gl.STATIC_DRAW);
			self.vertexIndexBuffer[i].itemSize = 1;
			self.vertexIndexBuffer[i].numItems = self.indexData[i].length;
		}
	}

	init();
}

CosmicBody.prototype.draw = function(bodyMatrix) {
	if(loading > 0 || failure) return;

	if(this.lighting) {
		mat4.toInverseMat3(bodyMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMatrix);
	}
	gl.uniform1i(shader.monochromatic, 0);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, bodyMatrix);

	for (var i = 0; i < this.texture.length; i++) {
		gl.uniform1i(shader.uselighting, (this.lighting)?(i+1):0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture[i]);
		gl.uniform1i(shader.samplerUniform, 0);


		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
		gl.vertexAttribPointer(shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
		gl.vertexAttribPointer(shader.textureCoordAttribute, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
		gl.vertexAttribPointer(shader.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer[i]);
		gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer[i].numItems, gl.UNSIGNED_SHORT, 0);
	}
}

function WebGl() {
    "use strict";

    var self = this;
	var satarray = null;
    var earthdata = null;
    var stardata = null;
    var moondata = null;
    var sundata = null;
    var lastMouseX = null;
    var lastMouseY = null;
	var click = false;
	this.canvas = 0;
    this.resize = resize;
	this.fail = fail;

	this.satrefresh = satrefresh;
	function satrefresh()
	{
		if(satarray) satarray.refresh();
	}

	function fail(e)
	{
		failure = true;
		if(e && e.message) console.log(e.message);
		if(aristotle) clearInterval(aristotle.interval);
		if(earthdata) clearInterval(earthdata.interval);
	}

	function resize()
	{
		self.canvas = document.getElementById("main_canvas");
		self.canvas.width = myWidth;
		self.canvas.height = myHeight;
		gl.viewportWidth = self.canvas.width;
		gl.viewportHeight = self.canvas.height;
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		if(aristotle) updateMatrices();
	}

	function init()
	{
		startLoading();
		self.canvas = document.getElementById("main_canvas");
		self.canvas.addEventListener("webglcontextlost", function(event) {
			console.log("CONTEXT LOST");
			self.fail(event);
			totalfailure();
			event.preventDefault();
		}, false);
		try {
			gl = self.canvas.getContext("experimental-webgl");
		} catch (e) {self.fail(e); return;}

		if (!gl) {
			failure = true;
			var e = document.getElementById("main_page");
			e.style.color = "white";
			e.innerHTML = '<center><h1><br><br><br>' +
			'Your browser does not appear to support WebGL<br>' +
			'Please download firefox or chrome and enable WebGL support<br>' +
			'<a style="color: red" href="http://www.mozilla.org/en-US/firefox/new/">Download Firefox</a><br>' +
			'<a style="color: red" href="https://www.google.com/intl/en/chrome/browser/">Download Google Chrome</a><br>' +
			'<a style="color: red" href="http://download-chromium.appspot.com/">Download Chromium</a><br>' +
			'<a style="color: pink" href="http://blog.laptopmag.com/how-to-enable-webgl-support-on-chrome-for-android">Enabling WebGL in Chrome</a><br>';
			return;
		}

		self.resize();

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		initShaders();

		home.init();
		aristotle = new GeocentricModel();

		var n = (location.search.indexOf("?normal") == 0);
		var imgearthday = (n)?"images/earth_day.jpg":"images/earth_day_small.jpg";
		var imgearthnight = (n)?"images/earth_night.jpg":"images/earth_night_small.jpg";
		var imgmoon = (n)?"images/moon.jpg":"images/moon_small.jpg";
		var imgstars = (n)?"images/skymap8192.jpg":"images/skymap4096.jpg";
		var imgsun = "images/sun.png";

		satarray = new SatelliteArray("tle.txt", "groups.txt");
		earthdata = new CosmicBody("earth",
			[imgearthday, imgearthnight], earthsize, false);
		sundata = new CosmicBody("sun", 
			[imgsun], starsize - 20, false);
		stardata = new CosmicBody("stars",
			[imgstars], starsize, false);
		moondata = new CosmicBody("moon",
			[imgmoon], earthsize*0.272798619, true);

		var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
		self.canvas.addEventListener(mousewheelevt, handleMouseWheel);
		self.canvas.onmousedown = handleMouseDown;
		self.canvas.onmouseup = handleMouseUp;
		self.canvas.onmousemove = handleMouseMove;
		self.canvas.ontouchstart = handleTouchStart;
		self.canvas.ontouchend = handleMouseUp;
		self.canvas.ontouchmove = handleTouchMove;
		initMenu();
		doneLoading();
		tick();
	}

	function initMenu() {
		var menu_tab = document.getElementById("menu_tab");
		menu_tab.onclick = function() {
			var menu = document.getElementById("menu");
			if(menuopen) {
				menu.className = "";
				menuopen = false;
			} else {
				menu.className = "slide";
				menuopen = true;
			}
		}
		var showmoon = document.getElementById("showmoon");
		showmoon.className = (display.moon)?"switchbtn on":"switchbtn";
		showmoon.onclick = function(e) {
			if(e.target.className == "switchbtn") {
				e.target.className = "switchbtn on";
				display.moon = true;
			} else {
				e.target.className = "switchbtn";
				display.moon = false;
			}
		}
		var showearth = document.getElementById("showearth");
		showearth.className = (display.earth)?"switchbtn on":"switchbtn";
		showearth.onclick = function(e) {
			if(e.target.className == "switchbtn") {
				e.target.className = "switchbtn on";
				display.earth = true;
			} else {
				e.target.className = "switchbtn";
				display.earth = false;
			}
		}
		var showsun = document.getElementById("showsun");
		showsun.className = (display.sun)?"switchbtn on":"switchbtn";
		showsun.onclick = function(e) {
			if(e.target.className == "switchbtn") {
				e.target.className = "switchbtn on";
				display.sun = true;
			} else {
				e.target.className = "switchbtn";
				display.sun = false;
			}
		}
		var showstars = document.getElementById("showstars");
		showstars.className = (display.stars)?"switchbtn on":"switchbtn";
		showstars.onclick = function(e) {
			if(e.target.className == "switchbtn") {
				e.target.className = "switchbtn on";
				display.stars = true;
			} else {
				e.target.className = "switchbtn";
				display.stars = false;
			}
		}
		var viewmode = document.getElementById("viewmode");
		viewmode.className = (display.spaceview)?"toggle p1":"toggle p2";
		viewmode.onclick = function(e) {
			if(e.target.className == "choice ch1") {
				e.target.parentNode.className = "toggle p1";
				updateMatrices = updateMatricesSpace;
				zoomval = defzoom.space;
				display.spaceview = true;
			} else if(e.target.className == "choice ch2") {
				e.target.parentNode.className = "toggle p2";
				updateMatrices = updateMatricesGround;
				zoomval = defzoom.ground;
				display.spaceview = false;
			}
			updateMatrices();
		}
		var selectmode = document.getElementById("selectmode");
		var list1title = document.getElementById("list1title");
		var list2title = document.getElementById("list2title");
		var grpallnone = document.getElementById("grpallnone");
		var satallnone = document.getElementById("satallnone");
		var list1 = document.getElementById("list1");
		var list2 = document.getElementById("list2");
		selectmode.onclick = function(e) {
			if(e.target.className == "choice ch1") {
				if(e.target.parentNode.className == "toggle p1")
					return;
				e.target.parentNode.className = "toggle p1";
				list1title.innerText="Categories";
				list2title.innerText="Satellites";
				grpallnone.style.display="block";
				satallnone.style.display="block";
				satarray.group.loadList1();
			} else if(e.target.className == "choice ch2") {
				if(e.target.parentNode.className == "toggle p2")
					return;
				e.target.parentNode.className = "toggle p2";
				list1title.innerText="Countries";
				list2title.innerText="Cities";
				grpallnone.style.display="none";
				satallnone.style.display="none";
				satarray.group.saveList1();
				list1.innerHTML = "";
				list2.innerHTML = "";
			}
		}
	}

    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        gl.shaderSource(shader, str);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    function initShaders() {
        var fragmentShader = getShader(gl, "shader-fs");
        var vertexShader = getShader(gl, "shader-vs");

        shader = gl.createProgram();
        gl.attachShader(shader, vertexShader);
        gl.attachShader(shader, fragmentShader);
        gl.linkProgram(shader);

        if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shader);

        shader.vertexPositionAttribute = gl.getAttribLocation(shader, "aVertexPosition");
        gl.enableVertexAttribArray(shader.vertexPositionAttribute);

        shader.textureCoordAttribute = gl.getAttribLocation(shader, "aTextureCoord");
        shader.vertexNormalAttribute = gl.getAttribLocation(shader, "aVertexNormal");
        gl.enableVertexAttribArray(shader.textureCoordAttribute);
        gl.enableVertexAttribArray(shader.vertexNormalAttribute);

        shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
        shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
        shader.nMatrixUniform = gl.getUniformLocation(shader, "uNMatrix");
        shader.samplerUniform = gl.getUniformLocation(shader, "uSampler");
        shader.uselighting = gl.getUniformLocation(shader, "uselighting");
        shader.monochromatic = gl.getUniformLocation(shader, "monochromatic");
        shader.daylightDirection = gl.getUniformLocation(shader, "daylightDirection");
        shader.dayAmbientColor = gl.getUniformLocation(shader, "dayAmbientColor");
        shader.dayDirectColor = gl.getUniformLocation(shader, "dayDirectColor");
        shader.monoColor = gl.getUniformLocation(shader, "monoColor");
        shader.pointSize = gl.getUniformLocation(shader, "pointSize");

        gl.uniform3f(shader.dayAmbientColor, 0.3, 0.3, 0.3);
        gl.uniform3f(shader.dayDirectColor, 1.5, 1.5, 1.5);
        gl.uniform3f(shader.monoColor, 1, 1, 1);
		gl.uniform1f(shader.pointSize, 1.5);
    }

	function handleMouseDown(event) {
		if(loading > 0 || event.button != 0 || failure) return;
		mouseDown = true;
		click = true;
		lastMouseX = event.clientX;
		lastMouseY = event.clientY;
	}

	function handleMouseUp(event) {
		mouseDown = false;
		if(click) {
			var x = event.clientX/myWidth*2.0-1.0;
			var y = 1.0-event.clientY/myHeight*2.0;
			var z = Math.sqrt(earthsize*earthsize - x*x - y*y);
			//var out = [x, y, z];
			//home.newpos(out);
			//console.log(out);
			//return;

			var inf = [x, y, z, 1.0];
			var e = mat4.create();
			var m = mat4.create();
			var out = vec3.create();

			mat4.identity(e);
			//mat4.translate(e, [0, 0, zoomval]);
			mat4.rotate(e, povAlt, [1, 0, 0]);
			mat4.rotate(e, povAzi, [0, 1, 0]);
			//mat4.multiply(earthMatrix, pMatrix, m);
			mat4.inverse(e, m);
			mat4.multiplyVec4(m, inf, out);
			home.newpos(out);
			console.log(out);
		}
	}

	function handleMove(newX, newY) {
		if (!mouseDown) return;
		click = false;

		var dAlt, dAzi;
		if(display.spaceview) {
			var deltaX = newX - lastMouseX;
			var deltaY = newY - lastMouseY;
			dAzi = (deltaX / 10) * Math.PI / 180;
			dAlt = (deltaY / 10) * Math.PI / 180;
		} else {
			var deltaX = lastMouseX - newX;
			var deltaY = newY - lastMouseY;
			dAzi = (deltaX / 20) * Math.PI / 180;
			dAlt = (deltaY / 20) * Math.PI / 180;
		}

		updateMatrices(povAlt + dAlt, povAzi + dAzi);

		lastMouseX = newX
		lastMouseY = newY;
	}

	function handleMouseMove(event) {
		handleMove(event.clientX, event.clientY);
	}

	function handleTouchStart(event) {
		if(loading > 0 || failure) return;
		var touch = event.changedTouches[0];
		mouseDown = true;
		lastMouseX = touch.clientX;
		lastMouseY = touch.clientY;
	}

	function handleTouchMove(event) {
		var touch = event.changedTouches[0];
		handleMove(touch.clientX, touch.clientY);
	}

	function handleMouseWheel(event) {
		click = false;
		var delta = (/Firefox/i.test(navigator.userAgent)) ? (event.detail*-1) : event.wheelDelta;
		if(delta > 0)
		{
			if(zoomval < -2.5)
				updateMatrices(povAlt, povAzi, zoomval * 0.97);
		}
		else
		{
			if(zoomval > -100)
				updateMatrices(povAlt, povAzi, zoomval * 1.03);
		}
	}

	function drawScene() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);

		gl.enableVertexAttribArray(shader.textureCoordAttribute);
		gl.enableVertexAttribArray(shader.vertexNormalAttribute);

		if(stardata && display.stars) stardata.draw(starMatrix);
		if(sundata && display.sun) sundata.draw(starMatrix);
		if(earthdata && display.earth) earthdata.draw(earthMatrix);
		if(moondata && display.moon) moondata.draw(moonMatrix);

		gl.disableVertexAttribArray(shader.textureCoordAttribute);
		gl.disableVertexAttribArray(shader.vertexNormalAttribute);

		if(satarray) satarray.draw(earthMatrix);

		home.draw();
	}

	var lastframe = 0;
	var framebusy = false;
	function tick(timestamp) {
		requestAnimFrame(tick);
		if(!framebusy) {
			framebusy = true;
			var date = new Date();
			var curr = date.getTime();
			/* keep the frame rate under 50 fps */
			if(curr - lastframe > 20) {
				drawScene();
				lastframe = curr;
			}
			framebusy = false;
		}
	}

	init();
}

function setWindowSize() {
    if (typeof (window.innerWidth) == 'number') {
        myWidth = window.innerWidth;
        myHeight = window.innerHeight;
    } else {
        if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight)) {
            myWidth = document.documentElement.clientWidth;
            myHeight = document.documentElement.clientHeight;
        } else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
            myWidth = document.body.clientWidth;
            myHeight = document.body.clientHeight;
        } else {
            myWidth = document.width;
            myHeight = document.height;
        }
    }
}

if(window.addEventListener)
{
	window.addEventListener('load', function () {
		"use strict";
		setWindowSize();
		webgl = new WebGl();
	});
	window.addEventListener('resize', function () {
		"use strict";
		if(loading > 0 || failure) return;
		setWindowSize();
		webgl.resize();
	});
}
