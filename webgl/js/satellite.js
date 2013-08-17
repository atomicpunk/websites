function Satellite(gl, shaderProgram, tle) {
	"use strict";

	var self = this;
	this.vertexPositionBuffer = null;
	this.vertexIndexBuffer = null;
	this.gl = gl;
	this.shaderProgram = shaderProgram;
	this.tle = tle;
	this.track = [];

	function init() {
		var indexData= [];
		self.track = norad.getOrbit(tle, 360);
		var total = self.track.length / 3;
		for(var i = 0; i < total; i++) {
			indexData.push(i, (i+1)%total);
		}
		self.vertexPositionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, self.vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(self.track), gl.STATIC_DRAW);
		self.vertexPositionBuffer.itemSize = 3;
		self.vertexPositionBuffer.numItems = self.track.length / 3;

		self.vertexIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.vertexIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
		self.vertexIndexBuffer.itemSize = 1;
		self.vertexIndexBuffer.numItems = indexData.length;
	}
	init();
}

Satellite.prototype.draw = function(zoom) {
	var gl = this.gl;
	var shader = this.shaderProgram;

	mat4.identity(mvMatrix);
	mat4.translate(mvMatrix, [0, 0, zoom]);
	mat4.rotate(mvMatrix, povAzi, [0, 1, 0]);
	mat4.rotate(mvMatrix, povInc, [Math.cos(povAzi), 0, Math.sin(povAzi)]);

	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniform1i(shader.uselighting, 0);
	gl.uniform1i(shader.monochromatic, true);
	gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
	gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
	gl.vertexAttribPointer(shader.vertexPositionAttribute, this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);

	gl.lineWidth(1.0);
	gl.drawElements(gl.LINES, this.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}
