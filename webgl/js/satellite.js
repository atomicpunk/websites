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

function Group(gname, hexcolor, psize) {
	"use strict";

	this.name = gname;
	this.satarray = [];
	this.size = parseFloat(psize);
	this.r = parseInt("0x"+hexcolor.slice(1, 3))/255.0;
	this.g = parseInt("0x"+hexcolor.slice(3, 5))/255.0;
	this.b = parseInt("0x"+hexcolor.slice(5, 7))/255.0;
    this.vertexPositionBuffer = null;
    this.vertexIndexBuffer = null;
}

function SatelliteGroup(file) {
	"use strict";

	var self = this;
	this.list = [];
	this.hash = [];

	function init() {
		var request = new XMLHttpRequest();
		request.open("GET", file, false);
		request.onload = function(e) {
			var text = this.responseText;
			var lines = text.split("\n");
			var group = new Group("Other", "#FFFFFF", "1.500");
			self.list.push(group);
			for(var i in lines)
			{
				var l = lines[i];
				var i = l.indexOf(";");
				if(i >= 0 && l[0] != ' ') {
					var j = l.indexOf("#");
					group = new Group(l.slice(0, i),
									  l.slice(j, j+7),
									  l.slice(j+8, j+13));
					self.list.push(group);
				} else if(l[0] == ' ' && l[1] != ' ' && group) {
					var id = parseInt(l.slice(1, 6));
					var name = l.slice(8);
					self.hash[id] = new satinfo_t(name, group);
				}
			}
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
	this.group = new SatelliteGroup(groupfile);

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
			window.setInterval(function() {if(!mouseDown && !loading) self.refresh();}, 1000);
		}
		request.send();
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
	gl.uniform1i(shader.monochromatic, 1);
	gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMatrix);

	for(var gidx in this.group.list)
	{
		var g = this.group.list[gidx];
		gl.uniform3f(shader.monoColor, g.r, g.g, g.b)
		gl.uniform1f(shader.pointSize, g.size);
		gl.bindBuffer(gl.ARRAY_BUFFER, g.vertexPositionBuffer);
		gl.vertexAttribPointer(shader.vertexPositionAttribute, g.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.vertexIndexBuffer);
		gl.drawElements(gl.POINTS, g.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	}
}
