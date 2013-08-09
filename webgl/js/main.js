var myWidth = 0;
var myHeight = 0;
var sun = new Sun();
var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var normalMatrix = mat3.create();

function Sun() {
    "use strict";

    var self = this;
    this.days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    this.inc = 0;
    this.azi = 0;
    this.sundec = [
        -23.1, -22.9, -22.9, -22.8, -22.7, -22.6, -22.4, -22.3, -22.2, -22.1,
        -21.9, -21.8, -21.6, -21.5, -21.3, -21.1, -20.9, -20.7, -20.5, -20.3,
        -20.1, -19.8, -19.6, -19.4, -19.2, -18.8, -18.6, -18.4, -18.1, -17.8,
        -17.6, -17.3, -17.1, -16.8, -16.5, -16.2, -15.8, -15.6, -15.2, -14.8,
        -14.6, -14.3, -13.9, -13.6, -13.3, -12.9, -12.6, -12.2, -11.8, -11.6,
        -11.2, -10.8, -10.5, -10.1, -9.7, -9.4, -9.0, -8.6, -8.3, -8.0, -7.8,
        -7.4, -7.0, -6.6, -6.3, -5.8, -5.5, -5.1, -4.7, -4.3, -3.9, -3.5, -3.1,
        -2.8, -2.3, -2.0, -1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6, 2, 2.6,
         2.8, 3.1, 3.5, 3.8, 4.3, 4.7, 5.1, 5.5, 5.8, 6.2, 6.6, 7, 7.3, 7.7, 8.1,
         8.5, 8.8, 9.2, 9.5, 9.9, 10.3, 10.6, 10.9, 11.3, 11.6, 12, 12.3, 12.4,
         13, 13.3, 13.6, 14, 14.3, 14.6, 14.9, 15.2, 15.5, 15.8, 16.1, 16.4,
         16.6, 16.9, 17.2, 17.4, 17.7, 18, 18.2, 18.5, 18.7, 19, 19.2, 19.4,
         19.6, 19.8, 20.1, 20.3, 20.4, 20.6, 20.8, 21, 21.2, 21.4, 21.5, 21.6,
         21.8, 22, 22.1, 22.2, 22.3, 22.5, 22.6, 22.7, 22.8, 22.9, 23, 23, 23.1,
         23.2, 23.2, 23.3, 23.3, 23.3, 23.4, 23.4, 23.5, 23.5, 23.5, 23.5, 23.4,
         23.4, 23.4, 23.3, 23.3, 23.2, 23.2, 23.1, 23.1, 23, 22.9, 22.8, 22.7,
         22.6, 22.5, 22.5, 22.3, 22.2, 22.1, 21.9, 21.8, 21.6, 21.5, 21.3, 21.1,
         20.9, 20.8, 20.6, 20.4, 20.2, 20, 19.8, 19.6, 19.3, 19.1, 18.9, 18.6,
         18.4, 18.1, 17.9, 17.6, 17.4, 17.1, 16.8, 16.6, 16.3, 16, 15.7, 15.4,
         15.1, 14.8, 14.5, 14.2, 13.9, 13.6, 13.3, 13, 12.6, 12.3, 12, 11.6,
         11.3, 10.9, 10.6, 10.3, 9.9, 9.6, 9.3, 8.8, 8.5, 8.1, 7.8, 7.4, 7,
         6.6, 6.3, 5.9, 5.5, 5.1, 4.8, 4.4, 4, 3.6, 3.3, 2.8, 2.5, 2.1, 1.7,
         1.3, 0.9, 0.5, 0.1, -0.2, -0.6, -1.0, -1.4, -1.8, -2.1, -2.6, -2.9,
        -3.3, -3.7, -4.1, -4.5, -4.8, -5.3, -5.6, -6.0, -6.4, -6.8, -7.1, -7.5,
        -7.9, -8.3, -8.6, -9.0, -9.4, -9.7, -10.1, -10.5, -10.8, -11.2, -11.5,
        -11.8, -12.2, -12.6, -12.9, -13.2, -13.6, -13.8, -14.2, -14.6, -14.8,
        -15.2, -15.5, -15.8, -16.1, -16.4, -16.6, -16.9, -17.2, -17.5, -17.8,
        -18.1, -18.3, -18.6, -18.8, -19.1, -19.3, -19.6, -19.8, -20.0, -20.2,
        -20.4, -20.6, -20.8, -21.0, -21.2, -21.3, -21.5, -21.7, -21.8, -22.0,
        -22.1, -22.3, -22.4, -22.5, -22.6, -22.7, -22.8, -22.9, -23.0, -23.1,
        -23.1, -23.2, -23.3, -23.3, -23.3, -23.4, -23.4, -23.4, -23.4, -23.4,
        -23.4, -23.4, -23.4, -23.3, -23.3, -23.2, -23.2, -23.1
    ];
    this.frontvector = [0, 0, 0];
    this.latlon = [];
    this.terminator = [];
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
    }
    init();
}

Sun.prototype.sync = function() {
    var date = new Date();
    var day = this.days[date.getUTCMonth()] + date.getUTCDate();
    var hour = date.getUTCHours();
    var minute = date.getUTCMinutes();
    this.inc = this.sundec[day]*Math.PI/180;
    this.azi = ((((60*hour)+minute))/1440)*2.0*Math.PI;
    this.frontvector[0] = Math.cos(this.azi);
    this.frontvector[1] = Math.tan(this.inc);
    this.frontvector[2] = Math.sin(this.azi);
    for(var i = 0; i <= 360; i++) {
        var idx = (i >= 180)?(360-i):i;
//        var x = Math.cos(a) * Math.cos(s);
//        var y = this.latlon[idx][0];
//        var z = Math.sin(a) * Math.sin(s);
//        this.terminator[i] = { x: x, y: y, z: z };
    }
}

Sun.prototype.isNight = function(lat, lon) {
    var x1 = this.latlon[lat][lon].x, y1 = this.latlon[lat][lon].y, z1 = this.latlon[lat][lon].z;
    var x2 = this.frontvector[0], y2 = this.frontvector[1], z2 = this.frontvector[2];
    var dotp = x1*x2 + y1*y2 + z1*z2;
    var mag1 = Math.sqrt(x1*x1 + y1*y1 + z1*z1);
    var mag2 = Math.sqrt(x2*x2 + y2*y2 + z2*z2);
    var a = Math.acos(dotp / (mag1 * mag2));

    if(a < Math.PI/2)
        return false;
    return true;
}

function SphereData(gl, imgfile, radius, pos) {
    "use strict";

    var self = this;
    this.vertexPositionBuffer = null;
    this.vertexNormalBuffer = null;
    this.vertexTextureCoordBuffer = null;
    this.vertexIndexBuffer = [];
    this.texture = [];
    this.px = pos[0];
    this.py = pos[1];
    this.pz = pos[2];

    function init() {
        for(var i = 0; i < imgfile.length; i++)
            initTexture(i);
        initVectors();
        window.setInterval(function() {initVectors();}, 60000);
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

    function initVectors() {
        sun.sync();

        var vertexPositionData = [];
        var normalData = [];
        var textureCoordData = [];
        var indexData = [];

        for (var i = 0; i < self.texture.length; i++) {
            indexData[i] = [];
        }

        for (var lat=0; lat <= 180; lat++) {
            for (var lon=0; lon <= 360; lon++) {
                var x = sun.latlon[lat][lon].x;
                var y = sun.latlon[lat][lon].y;
                var z = sun.latlon[lat][lon].z;

                normalData.push(x);
                normalData.push(y);
                normalData.push(z);
                vertexPositionData.push(radius * x);
                vertexPositionData.push(radius * y);
                vertexPositionData.push(radius * z);

                var v = 1 - (lat / 180);
                var u = 1 - (lon / 360);

                textureCoordData.push(u);
                textureCoordData.push(v);

                if((lat < 180)&&(lon < 360)) {
                    var uright = (lat * (360 + 1)) + lon;
                    var uleft = uright + 1;
                    var lright = uright + 360 + 1;
                    var lleft = uleft + 360 + 1;
                    if(self.texture.length > 1) {
                        var ur = sun.isNight(lat, lon);
                        var idx = (ur)?1:0;
                        indexData[idx].push(uright, uleft, lright, uleft, lleft, lright);
                    } else {
                        indexData[0].push(uright, uleft, lright, uleft, lleft, lright);
                    }
                }
            }
        }

        self.vertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
        self.vertexNormalBuffer.itemSize = 3;
        self.vertexNormalBuffer.numItems = normalData.length / 3;

        self.vertexTextureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexTextureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
        self.vertexTextureCoordBuffer.itemSize = 2;
        self.vertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

        self.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
        self.vertexPositionBuffer.itemSize = 3;
        self.vertexPositionBuffer.numItems = vertexPositionData.length / 3;

        for (var i = 0; i < self.texture.length; i++) {
            self.vertexIndexBuffer[i] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.vertexIndexBuffer[i]);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData[i]), gl.STATIC_DRAW);
            self.vertexIndexBuffer[i].itemSize = 1;
            self.vertexIndexBuffer[i].numItems = indexData[i].length;
        }
    }

    init();
}

SphereData.prototype.draw = function(gl, shaderProgram, zoom, pov) {

    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, zoom]);
    mat4.multiply(mvMatrix, pov);
    mat4.translate(mvMatrix, [this.px, this.py, this.pz]);
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);

    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);

    for (var i = 0; i < this.texture.length; i++) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture[i]);
        gl.uniform1i(shaderProgram.samplerUniform, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexTextureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, this.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, this.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer[i]);
        gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer[i].numItems, gl.UNSIGNED_SHORT, 0);
    }
}

function WebGl() {
    "use strict";

    var self = this;
    var gl;
    var earthdata = null;
    var stardata = null;
    var moondata = null;
    var povRotationMatrix = mat4.create();
    var povAzi = Math.PI*(190/180);
    var povInc = Math.PI*(35/180);
    var starsize = 200;
    var earthsize = 2;

    function init()
    {
        var canvas = document.getElementById("main_canvas");
        canvas.width = myWidth;
        canvas.height = myHeight;
        try {
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } catch (e) {}

        if (!gl) {
            alert("Could not initialise WebGL");
            return;
        }

        sun.sync();
        mat4.identity(povRotationMatrix);
        mat4.rotate(povRotationMatrix, povAzi, [0, 1, 0]);
        mat4.rotate(povRotationMatrix, povInc, [Math.cos(povAzi), 0, Math.sin(povAzi)]);

        initShaders();
        earthdata = new SphereData(gl, ["images/earth_day.jpg", "images/earth_night.jpg"], 
                                      earthsize, [0, 0, 0]);
        stardata = new SphereData(gl, ["images/stars.png"], starsize, [0, 0, 0]);
        moondata = new SphereData(gl, ["images/moon.jpg"], earthsize*0.272798619, 
                                      [earthsize*30.167948517, 0, 0]);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        canvas.onmousedown = handleMouseDown;
        canvas.onmousewheel = handleMouseWheel;
        document.onmouseup = handleMouseUp;
        document.onmousemove = handleMouseMove;

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

    var shaderProgram;

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
        shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
        shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
    }

    var mvMatrixStack = [];

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

    var mouseDown = false;
    var lastMouseX = null;
    var lastMouseY = null;
    var zval = -6.0

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
        mat4.identity(povRotationMatrix);
        mat4.rotate(povRotationMatrix, povAzi, [0, 1, 0]);
        mat4.rotate(povRotationMatrix, povInc, [Math.cos(povAzi), 0, Math.sin(povAzi)]);

        lastMouseX = newX
        lastMouseY = newY;
    }

    function handleMouseWheel(event) {
        if(event.wheelDelta > 0)
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
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, starsize, pMatrix);

        var lighting = false;
        var acolor = [0.1, 0.1, 0.1];
        var dcolor = [1, 1, 1];

        gl.uniform1i(shaderProgram.useLightingUniform, lighting);
        if (lighting) {
            gl.uniform3f(shaderProgram.ambientColorUniform,
                         acolor[0], acolor[1], acolor[2]);
            var adjustedLD = vec3.create();
            vec3.normalize(sun.frontvector + povRotationMatrix, adjustedLD);
            vec3.scale(adjustedLD, -1);
            gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);
            gl.uniform3f(shaderProgram.directionalColorUniform,
                         dcolor[0], dcolor[1], dcolor[2]);
        }

        earthdata.draw(gl, shaderProgram, zval, povRotationMatrix);
        moondata.draw(gl, shaderProgram, zval, povRotationMatrix);
        stardata.draw(gl, shaderProgram, 0, povRotationMatrix);
    }

    function tick() {
        requestAnimFrame(tick);
        drawScene();
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
var busy = false;
if(window.addEventListener)
{
    window.addEventListener('load', function () {
        "use strict";
        busy = true;
        setWindowSize();
        webgl = new WebGl();
        setTimeout(function(){busy = false;},1000);
    });
    window.addEventListener('resize', function () {
        "use strict";
        if(busy) return;
        busy = true;
        setWindowSize();
        webgl = new WebGl();
        setTimeout(function(){busy = false;},1000);
    });
}
