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
var povAlt = Math.PI*(35/180);
var zoomval = -6.0
var daylight = null;
var nightlight = null;
var norad = new Norad(earthsize);
var gl = null;
var shader = null;

var display = {
	earth: true,
	moon: true,
	stars: true,
	sun: true,
	sat: true
};

function startLoading() {
	loading++;
}

function doneLoading() {
	loading--;
	if(loading <= 0) {
		var e = document.getElementById("loading");
		e.style.display="none";

		/* start with an open menu */
		var menu = document.getElementById("menu");
		menu.className = "slide";
		menuopen = true;
	}
}

function GeocentricModel() {
    "use strict";

    var self = this;
    this.days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    this.inc = 0;
    this.azi = 0;
    this.sunvector = [0, 0, 0];
    this.moonazi = 0;
    this.moonpos = [earthsize * 30.103480715, 0, 0];
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
        window.setInterval(function() {if(!mouseDown && !loading) sunSync();}, 5000);
    }

    function currentTime() {
        var date = new Date();
        var day = self.days[date.getUTCMonth()] + date.getUTCDate();
        var sec = (date.getUTCHours()*3600) + (date.getUTCMinutes()*60) + date.getUTCSeconds();
		var t = date.getTime()/1000;
        return [day, sec, t];
    }

    function vecFromIncAzi(inclination, azimuth) {
        var vec = [];
        vec[0] = Math.cos(azimuth);
        vec[1] = Math.tan(inclination);
        vec[2] = Math.sin(azimuth);
        return vec;
    }

	this.sync = sunSync;
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

		ang = ((t[2] + 200000)/2360585)*2.0*Math.PI;
		var mooninc = self.inc*Math.cos(ang);
		self.moonazi = self.azi - ang;
		self.moonpos[1] = self.moonpos[0]*Math.sin(mooninc);
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
	if(this.lighting) {
		mat4.toInverseMat3(mvMatrix, normalMatrix);
		mat3.transpose(normalMatrix);
		gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMatrix);
	}
	gl.uniform1i(shader.monochromatic, 0);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);

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

CosmicBody.prototype.draw = function(zoom) {
	if(loading > 0) return;

    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, zoom]);
    mat4.rotate(mvMatrix, povAzi, [0, 1, 0]);
    mat4.rotate(mvMatrix, povAlt, [Math.cos(povAzi), 0, Math.sin(povAzi)]);
    this.drawHelper();
}

CosmicBody.prototype.drawStar = function() {
	if(loading > 0) return;

    var inc = aristotle.inc + povAlt;
    var azi = povAzi - aristotle.azi;
    mat4.identity(mvMatrix);
    mat4.rotate(mvMatrix, azi, [0, 1, 0]);
    mat4.rotate(mvMatrix, inc, [Math.cos(azi), 0, Math.sin(azi)]);
    this.drawHelper();
}

CosmicBody.prototype.drawMoon = function(zoom) {
	if(loading > 0) return;

	var azi = povAzi - aristotle.moonazi;
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, zoom]);
    mat4.rotate(mvMatrix, azi, [0, 1, 0]);
    mat4.rotate(mvMatrix, povAlt, [Math.cos(azi), 0, Math.sin(azi)]);
    mat4.translate(mvMatrix, aristotle.moonpos);
    this.drawHelper();
}

function WebGl() {
    "use strict";

    var self = this;
    var earthdata = null;
    var stardata = null;
    var moondata = null;
    var sundata = null;
    var satarray = null;
    var mvMatrixStack = [];
    var lastMouseX = null;
    var lastMouseY = null;
	this.canvas = 0;
    this.resize = resize;

	function resize()
	{
		self.canvas = document.getElementById("main_canvas");
		self.canvas.width = myWidth;
		self.canvas.height = myHeight;
		gl.viewportWidth = self.canvas.width;
		gl.viewportHeight = self.canvas.height;
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);
	}

	this.lastview = [];
	this.groundView = groundView;
	function groundView(on) {
		if(on) {
			self.lastview[0] = povAzi;
			self.lastview[1] = povAlt;
			self.lastview[2] = zoomval;
			povAzi = Math.PI*(190/180);
			povAlt = Math.PI*(35/180);
			zoomval = -6.0;
			mat4.perspective(15, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);
		} else {
			povAzi = self.lastview[0];
			povAlt = self.lastview[1];
			zoomval = self.lastview[2];
			mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);
		}
	}

    function init()
    {
		startLoading();
        self.canvas = document.getElementById("main_canvas");
        try {
            gl = self.canvas.getContext("experimental-webgl");
            self.resize();
        } catch (e) {}

        if (!gl) {
            alert("Could not initialise WebGL");
            return;
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        initShaders();

		var n = (location.search.indexOf("?normal") == 0);
		var imgearthday = (n)?"images/earth_day.jpg":"images/earth_day_small.jpg";
		var imgearthnight = (n)?"images/earth_night.jpg":"images/earth_night_small.jpg";
		var imgmoon = (n)?"images/moon.jpg":"images/moon_small.jpg";
		var imgstars = "images/stars.png";
		var imgsun = "images/sun.png";

		if(display.earth)
			earthdata = new CosmicBody("earth",
				[imgearthday, imgearthnight], earthsize, false);
		if(display.sun)
	        sundata = new CosmicBody("sun", 
				[imgsun], starsize - 20, false);
		if(display.stars)
			stardata = new CosmicBody("stars",
				[imgstars], starsize, false);
		if(display.moon)
			moondata = new CosmicBody("moon",
				[imgmoon], earthsize*0.272798619, true);
		if(display.sat)
			satarray = new SatelliteArray("tle.txt", "groups.txt");

        var mousewheelevt=(/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
        self.canvas.addEventListener(mousewheelevt, handleMouseWheel);
        self.canvas.onmousedown = handleMouseDown;
        self.canvas.onmouseup = handleMouseUp;
        self.canvas.onmousemove = handleMouseMove;
        self.canvas.ontouchstart = handleTouchStart;
        self.canvas.ontouchend = handleTouchEnd;
        self.canvas.ontouchmove = handleTouchMove;
		doneLoading();
        tick();
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
        gl.enableVertexAttribArray(shader.textureCoordAttribute);

        shader.vertexNormalAttribute = gl.getAttribLocation(shader, "aVertexNormal");
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
        shader.nightlightDirection = gl.getUniformLocation(shader, "nightlightDirection");
        shader.nightAmbientColor = gl.getUniformLocation(shader, "nightAmbientColor");
        shader.nightDirectColor = gl.getUniformLocation(shader, "nightDirectColor");
        shader.monoColor = gl.getUniformLocation(shader, "monoColor");
        shader.pointSize = gl.getUniformLocation(shader, "pointSize");

        gl.uniform3f(shader.dayAmbientColor, 0.3, 0.3, 0.3);
        gl.uniform3f(shader.dayDirectColor, 1.5, 1.5, 1.5);
        gl.uniform3f(shader.nightAmbientColor, 0.8, 0.8, 0.8);
        gl.uniform3f(shader.nightDirectColor, 1, 1, 1);
        gl.uniform3f(shader.monoColor, 1, 1, 1);
		gl.uniform1f(shader.pointSize, 1.5);
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
        if(loading > 0 || event.button != 0) return;
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
        povAlt += degToRad(deltaY / 10);

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
        povAlt += degToRad(deltaY / 10);

        lastMouseX = newX
        lastMouseY = newY;
    }

    function handleMouseWheel(event) {
        var delta = (/Firefox/i.test(navigator.userAgent)) ? (event.detail*-1) : event.wheelDelta;
        if(delta > 0)
        {
            if(zoomval < -2.5)
                zoomval *= 0.97;
        }
        else
        {
            if(zoomval > -100)
                zoomval *= 1.03;
        }
    }

	function drawScene() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);

		var azi = povAzi - aristotle.azi;
		var light = mat4.create();
		mat4.identity(light);
		mat4.rotate(light, azi, [0, 1, 0]);
		mat4.rotate(light, povAlt, [Math.cos(azi), 0, Math.sin(azi)]);
		mat4.rotate(light, aristotle.inc, [0, 0, 1]);

		daylight = vec3.create(light);
		//nightlight = vec3.create(light);
		gl.uniform3fv(shader.daylightDirection, daylight);
		//vec3.scale(nightlight, -1);
		//gl.uniform3fv(shader.nightlightDirection, nightlight);

		if(stardata && display.stars) stardata.drawStar();
		if(sundata && display.sun) sundata.drawStar();
		if(earthdata) earthdata.draw(zoomval);
		if(satarray) satarray.draw(zoomval);
		if(moondata && display.moon) moondata.drawMoon(zoomval);
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

var menuopen = false;
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
	showmoon.onclick = function(e) {
		if(e.target.className == "switchbtn") {
			e.target.className = "switchbtn on";
			display.moon = true;
		} else {
			e.target.className = "switchbtn";
			display.moon = false;
		}
	}
	var showsun = document.getElementById("showsun");
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
	showstars.onclick = function(e) {
		if(e.target.className == "switchbtn") {
			e.target.className = "switchbtn on";
			display.stars = true;
		} else {
			e.target.className = "switchbtn";
			display.stars = false;
		}
	}
/*
	var viewpointbtn = document.getElementById("viewpointbtn");
	viewpointbtn.onclick = function(e) {
		if(e.target.className == "switchbtn") {
			e.target.className = "switchbtn on";
			webgl.groundView(false);
		} else {
			e.target.className = "switchbtn";
			webgl.groundView(true);
		}
	}
*/
}

var webgl;
if(window.addEventListener)
{
	window.addEventListener('load', function () {
		"use strict";
		setWindowSize();
		webgl = new WebGl();
		initMenu();
	});
	window.addEventListener('resize', function () {
		"use strict";
		if(loading > 0) return;
		setWindowSize();
		webgl.resize();
	});
}
