/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

var loading = 0;
var mouseDown = false;
var starsize = 200;
var earthsize = 2;
var myWidth = 0;
var myHeight = 0;
var aristotle = new GeocentricModel();
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();
var povAzi = Math.PI*(190/180);
var povInc = Math.PI*(35/180);
var daylight = null;
var nightlight = null;
var norad = new Norad(earthsize);
var display = {
	earth: true,
	moon: false,
	stars: true,
	sun: true,
	sat: true
};

function GeocentricModel() {
    "use strict";

    var self = this;
    this.days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    this.inc = 0;
    this.azi = 0;
    this.sunvector = [0, 0, 0];
    this.moonvector = [0, 0, 0];
    this.moonrot = 0;
    this.latlon = [];
    this.terminator = [];
    this.tidx = [];
    function init() {
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
        moonSync();
        window.setInterval(function() {if(!mouseDown && !loading) sunSync();}, 5000);
        window.setInterval(function() {if(!mouseDown && !loading) moonSync();}, 60000);
    }

    function currentTime() {
        var date = new Date();
        var day = self.days[date.getUTCMonth()] + date.getUTCDate();
        var sec = (date.getUTCHours()*3600) + (date.getUTCMinutes()*60) + date.getUTCSeconds();
        return [day, sec];
    }

    function vecFromIncAzi(inclination, azimuth) {
        var vec = [];
        vec[0] = Math.cos(azimuth);
        vec[1] = Math.tan(inclination);
        vec[2] = Math.sin(azimuth);
        return vec;
    }

	function sunSync() {
		var t = currentTime();
		var ang = (((t[0] * 86400) + t[1]) * Math.PI) / 15768000;
		self.inc = -23.4 * (Math.PI/180) * Math.cos(ang + (0.054794521*Math.PI));
		self.azi = (t[1]/86400)*2.0*Math.PI;
		self.sunvector = vecFromIncAzi(self.inc, self.azi);
		self.terminator = [];
		self.tidx = [];
		for (var i = 0; i < 360; i++) {
			var a = Math.PI*i/180;
			var x = earthsize * Math.cos(a);
			var y = 0;
			var z = earthsize * Math.sin(a);
			self.terminator.push(x, y, z);
			self.tidx.push(i);
		}
		for (var i = 0; i < 360; i++) {
			var a = Math.PI*i/180;
			var x = earthsize * Math.cos(a);
			var y = earthsize * Math.sin(a);
			var z = 0;
			self.terminator.push(x, y, z);
			self.tidx.push(i+360);
		}
	}

    function moonSync() {
        var date = new Date();
        var t = date.getTime()/1000 + 200000;
        var a = earthsize * 30.103480715;
        var e = 0.0549;
        var i = (5.145*Math.PI)/180
        // northern major standstill = 9/15/2006
        // a = 384000 km  Er = 6378 km
        // orbital rotation period = 18.6 years = 6794 days
        // rotation counterclockwise from above
        // period = 27.321582 days
        var ang = -1 * (t/2360585)*2.0*Math.PI;
        var r = a*(1-(e*e))/(1 + e*Math.cos(ang));
        self.moonvector[0] = r * Math.cos(ang);
        self.moonvector[2] = r * Math.sin(ang);
        self.moonrot = -1 * ang;
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

function CosmicBody(gl, shaderProgram, idstr, imgfile, radius, lighting) {
    "use strict";

    var self = this;
    this.vertexPositionBuffer = null;
    this.vertexNormalBuffer = null;
    this.vertexTextureCoordBuffer = null;
    this.vertexIndexBuffer = [];
    this.texture = [];
    this.id = idstr;
    this.gl = gl;
    this.lighting = lighting;
    this.shaderProgram = shaderProgram;
    this.vertexPositionData = [];
    this.normalData = [];
    this.textureCoordData = [];
    this.indexData = [];

    function init() {
        for(var i = 0; i < imgfile.length; i++)
            initTexture(i);
        initVectors();
        if(self.id == "earth")
            window.setInterval(function() {if(!mouseDown && !loading) initVectors();}, 5000);
    }

    function initTexture(idx) {
        self.texture[idx] = gl.createTexture();
        self.texture[idx].image = new Image();
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
        }
        self.texture[idx].image.src = imgfile[idx];
    }

    function vectorDefault() {
        for (var lat=0; lat <= 180; lat++) {
            for (var lon=0; lon <= 360; lon++) {
                var x = aristotle.latlon[lat][lon].x;
                var y = aristotle.latlon[lat][lon].y;
                var z = aristotle.latlon[lat][lon].z;
                var v = 1 - (lat / 180);
                var u = 1 - (lon / 360);

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
        var square = []
        var dA = Math.PI/18;
        square[0] = [-1*dA, -1*dA];
        square[1] = [   dA, -1*dA];
        square[2] = [-1*dA,    dA];
        square[3] = [   dA,    dA];
        for(var i = 0; i < 4; i++) {
            var x = Math.cos(square[i][1]);
            var y = Math.tan(square[i][0]);
            var z = Math.sin(square[i][1]);
            var v = i%2;
            var u = parseInt(i/2);
            self.normalData.push(x, y, z);
            self.vertexPositionData.push(radius * x, radius * y, radius * z);
            self.textureCoordData.push(u, v);
        }
        self.indexData[0].push(0, 1, 2, 1, 3, 2);
    }

    function initVectors() {
		if(self.id == "earth") {
			self.tbuf = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.tbuf);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(aristotle.terminator), gl.STATIC_DRAW);
			self.tbuf.itemSize = 3;
			self.tbuf.numItems = aristotle.terminator.length / 3;

			self.tidx = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.tidx);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(aristotle.tidx), gl.STATIC_DRAW);
			self.tidx.itemSize = 1;
			self.tidx.numItems = aristotle.tidx.length;
		}

        self.vertexPositionData = [];
        self.normalData = [];
        self.textureCoordData = [];
        self.indexData = [];

        for (var i = 0; i < self.texture.length; i++) {
            self.indexData[i] = [];
        }

        if(self.id == "sun")
            vectorSun();
        else
            vectorDefault();

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

CosmicBody.prototype.drawHelper = function() {
	var gl = this.gl;
	var shader = this.shaderProgram;

	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniform1i(shader.monochromatic, 0);
	gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMatrix);

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

/*
	if(this.id == "earth") {
	    gl.uniform1i(shader.monochromatic, 1);
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuf);
	    gl.vertexAttribPointer(shader.vertexPositionAttribute, this.tbuf.itemSize, gl.FLOAT, false, 0, 0);
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.tidx);
	    gl.drawElements(gl.POINTS, this.tidx.numItems, gl.UNSIGNED_SHORT, 0);
	}
*/
}

CosmicBody.prototype.draw = function(zoom) {
	if(loading > 0) return;

    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, zoom]);
    mat4.rotate(mvMatrix, povAzi, [0, 1, 0]);
    mat4.rotate(mvMatrix, povInc, [Math.cos(povAzi), 0, Math.sin(povAzi)]);
    this.drawHelper();
}

CosmicBody.prototype.drawStar = function() {
	if(loading > 0) return;

    var inc = aristotle.inc + povInc;
    var azi = povAzi - aristotle.azi;
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, azi, [0, 1, 0]);
    mat4.rotate(mvMatrix, inc, [Math.cos(azi), 0, Math.sin(azi)]);
    this.drawHelper();
}

CosmicBody.prototype.drawMoon = function(zoom, pos, rot) {
	if(loading > 0) return;

    var inc = aristotle.inc + povInc;
    var azi = povAzi - aristotle.azi;
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, zoom]);
    mat4.rotate(mvMatrix, azi, [0, 1, 0]);
    mat4.rotate(mvMatrix, inc, [Math.cos(azi), 0, Math.sin(azi)]);
    mat4.translate(mvMatrix, pos);
    mat4.rotate(mvMatrix, rot, [0, 1, 0]);
    this.drawHelper();
}

function WebGl() {
    "use strict";

    var self = this;
    var gl;
    var shaderProgram;
    var earthdata = null;
    var stardata = null;
    var moondata = null;
    var sundata = null;
    var satarray = null;
    var mvMatrixStack = [];
    var lastMouseX = null;
    var lastMouseY = null;
    var zval = -6.0
    this.resize = resize;

    function resize()
    {
        var canvas = document.getElementById("main_canvas");
        canvas.width = myWidth;
        canvas.height = myHeight;
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);
		var ctx = canvas.getContext("2d");
		ctx.font="100px Arial";
		ctx.fillText("Hello World",10,50);
    }

    function init()
    {
		loading++;
        var canvas = document.getElementById("main_canvas");
        try {
            gl = canvas.getContext("experimental-webgl");
            self.resize();
        } catch (e) {}

        if (!gl) {
            alert("Could not initialise WebGL");
            return;
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        initShaders();
        tick();

		var n = (location.search.indexOf("?normal") == 0);
		var imgearthday = (n)?"images/earth_day.jpg":"images/earth_day_small.jpg";
		var imgearthnight = (n)?"images/earth_night.jpg":"images/earth_night_small.jpg";
		var imgmoon = (n)?"images/moon.jpg":"images/moon_small.jpg";
		var imgstars = "images/stars.png";
		var imgsun = "images/sun.png";

		if(display.earth)
			earthdata = new CosmicBody(gl, shaderProgram, "earth",
				[imgearthday, imgearthnight], earthsize, false);
		if(display.sun)
	        sundata = new CosmicBody(gl, shaderProgram, "sun", 
				[imgsun], starsize - 20, false);
		if(display.stars)
			stardata = new CosmicBody(gl, shaderProgram, "stars",
				[imgstars], starsize, false);
		if(display.moon)
			moondata = new CosmicBody(gl, shaderProgram, "moon",
				[imgmoon], earthsize*0.272798619, true);
		if(display.sat)
			satarray = new SatelliteArray(gl, shaderProgram, "tle.txt", "groups.txt");

        var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
        window.addEventListener(mousewheelevt, handleMouseWheel);
        window.onmousedown = handleMouseDown;
        window.onmouseup = handleMouseUp;
        window.onmousemove = handleMouseMove;
        window.ontouchstart = handleTouchStart;
        window.ontouchend = handleTouchEnd;
        window.ontouchmove = handleTouchMove;
		loading--;
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

        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        gl.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
        gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
        gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.uselighting = gl.getUniformLocation(shaderProgram, "uselighting");
        shaderProgram.monochromatic = gl.getUniformLocation(shaderProgram, "monochromatic");
        shaderProgram.daylightDirection = gl.getUniformLocation(shaderProgram, "daylightDirection");
        shaderProgram.dayAmbientColor = gl.getUniformLocation(shaderProgram, "dayAmbientColor");
        shaderProgram.dayDirectColor = gl.getUniformLocation(shaderProgram, "dayDirectColor");
        shaderProgram.nightlightDirection = gl.getUniformLocation(shaderProgram, "nightlightDirection");
        shaderProgram.nightAmbientColor = gl.getUniformLocation(shaderProgram, "nightAmbientColor");
        shaderProgram.nightDirectColor = gl.getUniformLocation(shaderProgram, "nightDirectColor");
        shaderProgram.monoColor = gl.getUniformLocation(shaderProgram, "monoColor");
        shaderProgram.pointSize = gl.getUniformLocation(shaderProgram, "pointSize");

        gl.uniform3f(shaderProgram.dayAmbientColor, 0.3, 0.3, 0.3);
        gl.uniform3f(shaderProgram.dayDirectColor, 2, 2, 2);
        gl.uniform3f(shaderProgram.nightAmbientColor, 0.8, 0.8, 0.8);
        gl.uniform3f(shaderProgram.nightDirectColor, 1, 1, 1);
        gl.uniform3f(shaderProgram.monoColor, 1, 1, 1);
		gl.uniform1f(shaderProgram.pointSize, 1.5);
    }

    function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        mvMatrixStack.push(copy);
    }

    function mvPopMatrix() {
        if (mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        mvMatrix = mvMatrixStack.pop();
    }

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }


    function handleMouseDown(event) {
        if(event.button != 0) return;
        mouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    function handleMouseUp(event) {
        mouseDown = false;
    }

    function handleMouseMove(event) {
        if (!mouseDown) return;

        var newX = event.clientX;
        var newY = event.clientY;
        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;

        povAzi += degToRad(deltaX / 10);
        povInc += degToRad(deltaY / 10);

        lastMouseX = newX
        lastMouseY = newY;
    }


    function handleTouchStart(event) {
        var touch = event.changedTouches[0];
        mouseDown = true;
        lastMouseX = touch.clientX;
        lastMouseY = touch.clientY;
    }

    function handleTouchEnd(event) {
        mouseDown = false;
    }

    function handleTouchMove(event) {
        if (!mouseDown) return;

        var touch = event.changedTouches[0];
        var newX = touch.clientX;
        var newY = touch.clientY;
        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;

        povAzi += degToRad(deltaX / 10);
        povInc += degToRad(deltaY / 10);

        lastMouseX = newX
        lastMouseY = newY;
    }

    function handleMouseWheel(event) {
        var delta = (/Firefox/i.test(navigator.userAgent)) ? (event.detail*-1) : event.wheelDelta;
        if(delta > 0)
        {
            if(zval < -2.5)
                zval *= 0.97;
        }
        else
        {
            if(zval > -100)
                zval *= 1.03;
        }
    }

    function drawScene() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var azi = povAzi - aristotle.azi;
        var light = mat4.create();
        mat4.identity(light);
        mat4.rotate(light, azi, [0, 1, 0]);
        mat4.rotate(light, povInc, [Math.cos(azi), 0, Math.sin(azi)]);
        mat4.rotate(light, aristotle.inc, [0, 0, 1]);

        daylight = vec3.create(light);
        nightlight = vec3.create(light);
        vec3.scale(nightlight, -1);
        gl.uniform3fv(shaderProgram.daylightDirection, daylight);
        gl.uniform3fv(shaderProgram.nightlightDirection, nightlight);

        if(stardata) stardata.drawStar();
        if(sundata) sundata.drawStar();
        if(earthdata) earthdata.draw(zval);
		if(satarray) satarray.draw(zval);
        if(moondata) moondata.drawMoon(zval, aristotle.moonvector, aristotle.moonrot);
    }

	var framebusy = false;
	function tick(timestamp) {
		requestAnimFrame(tick);
		if(!framebusy) {
			framebusy = true;
			drawScene();
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

var webgl;
if(window.addEventListener)
{
	window.addEventListener('load', function () {
		"use strict";
		setWindowSize();
		webgl = new WebGl();
	});
	window.addEventListener('resize', function () {
		"use strict";
		if(loading <= 0) return;
		setWindowSize();
		webgl.resize();
	});
}
