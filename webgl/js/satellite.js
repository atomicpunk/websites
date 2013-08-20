/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

var mdaysnonleap = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
var mdaysleap = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

function Satellite(tledata) {
	"use strict";

	this.tle = new tle_t(tledata);
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

function SatelliteArray(gl, shaderProgram, tlefile) {
	"use strict";

	var self = this;
	this.vertexPositionBuffer = null;
	this.vertexIndexBuffer = null;
	this.gl = gl;
	this.shaderProgram = shaderProgram;
	this.satarray = [];

	function init() {
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
//				if(s.tle.id == "38913U")
				self.satarray.push(s);
			}
			self.refresh();
			window.setInterval(function() {self.refresh();}, 200);
		}
		request.send();
	}
	init();
}

SatelliteArray.prototype.sinceEpoch = function(epoch, year, day)
{
	var val = norad.modf(epoch*1E-3);
	var eyear = (val[0] < 57)?(val[0]+2000):(val[0]+1900);
	var eday = val[1]*1E3;
	var since = (((year-eyear)*365.25)+(day-eday))*1440;
	return since;
}

SatelliteArray.prototype.refresh = function() {
	var gl = this.gl;
	var shader = this.shaderProgram;

	var date = new Date();
	var year = date.getUTCFullYear();
	var day = date.getUTCDate() + (date.getUTCHours()/24) + (date.getUTCMinutes()/1440);
	if(year % 4 == 0)
		day += mdaysleap[date.getUTCMonth()];
	else
		day += mdaysnonleap[date.getUTCMonth()];
	day += (date.getUTCSeconds()/86400) + (date.getUTCMilliseconds()/86400000);

	var vertexData = [];
	var indexData = [];
	var idx = 0;
	for(var s in this.satarray)
	{
		var sat = this.satarray[s];
		var t = this.sinceEpoch(sat.tle.epoch, year, day);
		sat.position = norad.getPoint(sat.tle, t, sat.deep);
//		vertexData = norad.getOrbit(sat.tle, 100, t, sat.deep);
//		for(var i = 0; i <= 97; i++)
//			indexData[i] = i%100;
		vertexData.push(sat.position[0], sat.position[1], sat.position[2]);
		indexData.push(idx);
		idx++;
	}

	this.vertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
	this.vertexPositionBuffer.itemSize = 3;
	this.vertexPositionBuffer.numItems = vertexData.length / 3;

	this.vertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
	this.vertexIndexBuffer.itemSize = 1;
	this.vertexIndexBuffer.numItems = indexData.length;
}

SatelliteArray.prototype.draw = function(zoom) {
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

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
	gl.vertexAttribPointer(shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
	gl.drawElements(gl.POINTS, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}
