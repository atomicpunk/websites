/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

function satinfo_t(s_name, s_group) {
	"use strict";

	this.name = s_name;
	this.group = s_group;
}

function Group(gl, gid, gname, cfgtext) {
	"use strict";

	var self = this;
	this.gl = gl;
	this.id = gid;
	this.name = gname;
	this.satarray = [];
	this.size = 1.0;
	this.show = true;
	this.hexcolor = "#000000";
	this.r = 0.0;
	this.g = 0.0;
	this.b = 0.0;
	this.texture = null;
	this.imgpath = "";
    this.vertexPositionBuffer = null;
    this.vertexIndexBuffer = null;

	function init() {
		var field = cfgtext.split(" ");
		self.size = parseFloat(field[1]);
		self.hexcolor = field[0];
		self.r = parseInt("0x"+self.hexcolor.slice(1, 3))/255.0;
		self.g = parseInt("0x"+self.hexcolor.slice(3, 5))/255.0;
		self.b = parseInt("0x"+self.hexcolor.slice(5, 7))/255.0;
		if(field.length > 2) {
			self.texture = self.gl.createTexture();
			self.texture.image = new Image();
			startLoading();
			self.texture.image.onload = function () {
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
				gl.bindTexture(gl.TEXTURE_2D, self.texture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, self.texture.image);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.bindTexture(gl.TEXTURE_2D, null);
				doneLoading();
			}
			self.texture.image.src = "images/"+field[2];
			self.imgpath = "url(images/"+field[2]+")";
		}
	}
	init();
}

Group.prototype.display = function(doshow) {
	var item = document.getElementById(this.id);
	if(doshow) {
		item.className = "listitem select";
		this.show = true;
	} else {
		item.className = "listitem";
		this.show = false;
	}
}

function SatelliteGroup(gl, file) {
	"use strict";

	var self = this;
	this.gl = gl;
	this.list = [];
	this.hash = [];

	function initGroupsList() {
		var grouphtml = "";
		var groups = document.getElementById("groups");
		for(var gidx in self.list)
		{
			var g = self.list[gidx];
			if(g.texture) {
				grouphtml += '<div id="g'+gidx+
					'" class="listitem select"><div class="gcolor" style="background-image:'+
					g.imgpath+';background-color:'+g.hexcolor+';"></div>'+g.name+'</div>';
			} else {
				grouphtml += '<div id="g'+gidx+
					'" class="listitem select"><div class="gcolor" style="background-color:'+
					g.hexcolor+';"></div>'+g.name+'</div>';
			}
		}
		groups.innerHTML = grouphtml;
		var items = groups.getElementsByClassName('listitem');
		for (var i = 0; i < items.length; i++) {
			items[i].onclick = function(e) {
				var idx = parseInt(e.target.id.slice(1));
				var g = self.list[idx];
				if(e.target.className == "listitem") {
					e.target.className = "listitem select";
					g.show = true;
				} else {
					e.target.className = "listitem";
					g.show = false;
				}
			}
		}
		var all = document.getElementById("grpselectall");
		all.onclick = function(e) {
			for (var i = 0; i < items.length; i++) {
				items[i].className = "listitem select";
			}
			for(var gidx in self.list) {
				self.list[gidx].show = true;
			}
		}
		var none = document.getElementById("grpclearall");
		none.onclick = function(e) {
			for (var i = 0; i < items.length; i++) {
				items[i].className = "listitem";
			}
			for(var gidx in self.list) {
				self.list[gidx].show = false;
			}
		}
	}

	function init() {
		var request = new XMLHttpRequest();
		request.open("GET", file, false);
		request.onload = function(e) {
			var text = this.responseText;
			var lines = text.split("\n");
			var group = new Group(self.gl, "g0", "All Other Satellites", "#FFFFFF 1.500");
			self.list.push(group);
			for(var i in lines)
			{
				var l = lines[i];
				var i = l.indexOf(";");
				if(i >= 0 && l[0] != ' ') {
					group = new Group(self.gl, "g"+self.list.length,
						l.slice(0, i), l.slice(i+2));
					self.list.push(group);
				} else if(l[0] == ' ' && l[1] != ' ' && group) {
					var id = parseInt(l.slice(1, 6));
					var name = l.slice(8);
					self.hash[id] = new satinfo_t(name, group);
				}
			}
			initGroupsList();
		}
		request.send();
	}
	init();
}

SatelliteGroup.prototype.add = function(sat) {
	var id = sat.tle.id;
	if(id in this.hash)
	{
		var info = this.hash[id];
		sat.name = info.name;
		info.group.satarray.push(sat);
		return;
	}
	this.list[0].satarray.push(sat);
}

function Satellite(tledata) {
	"use strict";

	this.tle = new tle_t(tledata);
	this.name = "";
	this.deep = norad.is_deep_space(this.tle);
	this.position = [];
}

Satellite.prototype.print = function() {
	if(this.deep)
		console.log("DEEP (SDP)");
	else
		console.log("LEO (SGP)");
	this.tle.print();
	var x = this.position[0];
	var y = this.position[1];
	var z = this.position[2];
	console.log("X: "+x+" Y: "+y+" Z: "+z);
}

function SatelliteArray(gl, shaderProgram, tlefile, groupfile) {
	"use strict";

	var self = this;
	this.gl = gl;
	this.shaderProgram = shaderProgram;
	this.group = new SatelliteGroup(gl, groupfile);
	this.useimages = true;

	function init() {
		startLoading();
		var request = new XMLHttpRequest();
		request.open("GET", tlefile, false);
		request.onload = function(e) {
			var text = this.responseText;
			var lines = text.split("\n");
			var line = ""
			var tledata = [];
			for(var i in lines)
			{
				if(lines[i].indexOf("1 ") == 0) {
					line = lines[i];
				} else if(lines[i].indexOf("2 ") == 0 && line) {
					var tle = line+" "+lines[i];
					var id = line.split(" ")[1];
					tledata[id] = tle;
				}
			}
			for(var t in tledata)
			{
				var s = new Satellite(tledata[t]);
				self.group.add(s);
			}
			delete self.group.hash;
			self.group.hash = null;
			doneLoading();
			self.refresh();
			self.group.list[0].display(false);
			window.setInterval(function() {if(!mouseDown && !loading) self.refresh();}, 1000);
		}
		request.send();
		var useimgs = document.getElementById("satuseimages");
		useimgs.onclick = function(e) {
			if(e.target.className == "switchbtn") {
				e.target.className = "switchbtn on";
				self.useimages = true;
			} else {
				e.target.className = "switchbtn";
				self.useimages = false;
			}
		}
	}
	init();
}

SatelliteArray.prototype.refresh = function() {
	var gl = this.gl;
	var shader = this.shaderProgram;

	var julian = norad.Julian_Now();
	var thetaJD = norad.ThetaG_JD(julian);
	for(var gidx in this.group.list)
	{
		var vertexData = [];
		var indexData = [];
		var idx = 0;
		var g = this.group.list[gidx];
		if(!g.show) continue;
		for(var s in g.satarray)
		{
			var sat = g.satarray[s];
			var t = norad.sinceEpoch(sat.tle.epoch, julian);
			sat.position = norad.getPoint(sat.tle, t, sat.deep, julian, thetaJD);
//			vertexData = norad.getOrbit(sat.tle, 100, t, sat.deep, thetaJD);
//			for(var i = 0; i <= 97; i++)
//				indexData[i] = i%100;
			vertexData.push(sat.position[0], sat.position[1], sat.position[2]);
			indexData.push(idx);
			idx++;
		}

		g.vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, g.vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
		g.vertexPositionBuffer.itemSize = 3;
		g.vertexPositionBuffer.numItems = vertexData.length / 3;

		g.vertexIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.vertexIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
		g.vertexIndexBuffer.itemSize = 1;
		g.vertexIndexBuffer.numItems = indexData.length;
	}
}

SatelliteArray.prototype.draw = function(zoom) {
	if(loading > 0) return;

	var gl = this.gl;
	var shader = this.shaderProgram;

	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, [0, 0, zoom]);
	mat4.rotate(mvMatrix, povAzi, [0, 1, 0]);
	mat4.rotate(mvMatrix, povInc, [Math.cos(povAzi), 0, Math.sin(povAzi)]);
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);

	gl.uniform1i(shader.uselighting, 0);
	gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMatrix);

	for(var gidx in this.group.list)
	{
		var g = this.group.list[gidx];
		if(!g.show) continue;
		if(!this.useimages && g.texture) {
			gl.uniform1f(shader.pointSize, 2.5);
		} else {
			gl.uniform1f(shader.pointSize, g.size);
		}

		if(this.useimages && g.texture) {
			gl.uniform1i(shader.monochromatic, 2.0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, g.texture);
		} else {
			gl.uniform1i(shader.monochromatic, 1.0);
			gl.uniform3f(shader.monoColor, g.r, g.g, g.b)
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, g.vertexPositionBuffer);
		gl.vertexAttribPointer(shader.vertexPositionAttribute, g.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.vertexIndexBuffer);
		gl.drawElements(gl.POINTS, g.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}
