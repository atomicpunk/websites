/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

var selected_group = null;
function satinfo_t(s_name, s_group, s_options) {
	"use strict";

	var self = this;
	this.name = s_name;
	this.group = s_group;
	this.imgfile = "";

	function init() {
		if(failure) return;

		if(!s_options)
			return;
		var field = s_options.split(" ");
		if(field.length > 0) {
			self.imgfile = field[0];
		}
	}
	init();
}

function Group(gid, gname, cfgtext) {
	"use strict";

	var self = this;
	this.id = gid;
	this.name = gname;
	this.satarray = [];
	this.imgsatarray = [];
	this.size = 1.0;
	this.show = true;
	this.hexcolor = "#000000";
	this.r = 0.0;
	this.g = 0.0;
	this.b = 0.0;
	this.texture = null;
	this.imgpath = "";
    this.posBuffer = null;
    this.idxBuffer = null;
    this.idxBufferUniq = null;

	function init() {
		if(failure) return;

		var field = cfgtext.split(" ");
		self.size = parseFloat(field[1]);
		self.hexcolor = field[0];
		self.r = parseInt("0x"+self.hexcolor.slice(1, 3))/255.0;
		self.g = parseInt("0x"+self.hexcolor.slice(3, 5))/255.0;
		self.b = parseInt("0x"+self.hexcolor.slice(5, 7))/255.0;
		if(field.length > 2) {
			self.texture = gl.createTexture();
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

Group.prototype.list = function() {
	var self = this;
	var sathtml = "";
	var list2 = document.getElementById("list2");
	selected_group = self;
	for(var idx in this.satarray)
	{
		var s = this.satarray[idx];
		var name = (s.name)?s.name:("Satellite number "+s.tle.id);
		var select = (s.show)?" select":"";
		if(s.texture) {
			sathtml += '<div title="select/unselect satellite" id="s'+idx+
				'" class="listitem'+select+'"><div title="view satellite info" class="scolor" style="background-image:'+
				s.imgpath+';background-color:'+this.hexcolor+';"></div>'+name+'</div>';
		} else {
			sathtml += '<div title="select/unselect satellite" id="s'+idx+
				'" class="listitem'+select+'"><div title="view satellite info" class="scolor" style="background-color:'+
				this.hexcolor+';"></div>'+name+'</div>';
		}
	}
	list2.innerHTML = sathtml;
	var items = list2.getElementsByClassName('listitem');
	for (var i = 0; i < items.length; i++) {
		items[i].onclick = function(e) {
			if(e.target.className.indexOf("listitem") == 0) {
				var idx = parseInt(e.target.id.slice(1));
				var s = self.satarray[idx];
				if(e.target.className == "listitem") {
					e.target.className = "listitem select";
					s.show = true;
				} else {
					e.target.className = "listitem";
					s.show = false;
				}
				webgl.satrefresh();
			} else {
				var idx = parseInt(e.target.parentNode.id.slice(1));
				var s = self.satarray[idx];
			}
		}
	}
	var all = document.getElementById("satselectall");
	all.onclick = function(e) {
		for (var i = 0; i < items.length; i++) {
			items[i].className = "listitem select";
		}
		for(var idx in self.satarray) {
			self.satarray[idx].show = true;
		}
		webgl.satrefresh();
	}
	var none = document.getElementById("satclearall");
	none.onclick = function(e) {
		for (var i = 0; i < items.length; i++) {
			items[i].className = "listitem";
		}
		for(var idx in self.satarray) {
			self.satarray[idx].show = false;
		}
		webgl.satrefresh();
	}
}

function SatelliteGroup(file) {
	"use strict";

	var self = this;
	this.list = [];
	this.hash = [];
	this.savedhtml = null;

	this.saveList1 = saveList1;
	function saveList1() {
		var list1 = document.getElementById("list1");
		self.savedhtml = list1.innerHTML;
	}

	this.loadList1 = loadList1;
	function loadList1() {
		var list1 = document.getElementById("list1");
		if(!self.savedhtml) {
			var grouphtml = "";
			for(var gidx in self.list)
			{
				var g = self.list[gidx];
				if(g.texture) {
					grouphtml += '<div title="select/unselect group" id="g'+gidx+
						'" class="listitem select"><div title="view satellite list" class="gcolor" style="background-image:'+
						g.imgpath+';background-color:'+g.hexcolor+';"></div>'+g.name+'</div>';
				} else {
					grouphtml += '<div title="select/unselect group" id="g'+gidx+
						'" class="listitem select"><div title="view satellite list" class="gcolor" style="background-color:'+
						g.hexcolor+';"></div>'+g.name+'</div>';
				}
			}
			list1.innerHTML = grouphtml;
		} else {
			list1.innerHTML = self.savedhtml;
		}
		if(selected_group)
			selected_group.list();
		var items = list1.getElementsByClassName('listitem');
		for (var i = 0; i < items.length; i++) {
			items[i].onclick = function(e) {
				if(e.target.className.indexOf("listitem") == 0) {
					var idx = parseInt(e.target.id.slice(1));
					var g = self.list[idx];
					if(selected_group != g) {
						g.list();
						return;
					}
					if(e.target.className == "listitem") {
						e.target.className = "listitem select";
						g.show = true;
					} else {
						e.target.className = "listitem";
						g.show = false;
					}
				} else {
					var idx = parseInt(e.target.parentNode.id.slice(1));
					var g = self.list[idx];
					if(selected_group != g) {
						g.list();
					}
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
		if(failure) return;

		var request = new XMLHttpRequest();
		request.open("GET", file, false);
		request.onload = function(e) {
			var text = this.responseText;
			var lines = text.split("\n");
			var group = new Group("g0", "All Other Satellites", "#FFFFFF 1.500");
			self.list.push(group);
			for(var i in lines)
			{
				var l = lines[i];
				var i = l.indexOf(";");
				if(i >= 0 && l[0] != ' ') {
					group = new Group("g"+self.list.length,
						l.slice(0, i), l.slice(i+2));
					self.list.push(group);
				} else if(l[0] == ' ' && l[1] != ' ' && group) {
					var id = parseInt(l.slice(1, 6));
					var name = (i < 0)?l.slice(8):l.slice(8, i);
					self.hash[id] = new satinfo_t(name, group, (i < 0)?"":l.slice(i+1));
				}
			}
			loadList1();
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
		if(info.imgfile) {
			info.group.imgsatarray.push(sat);
			sat.texture = gl.createTexture();
			sat.texture.image = new Image();
			startLoading();
			sat.texture.image.onload = function () {
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
				gl.bindTexture(gl.TEXTURE_2D, sat.texture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sat.texture.image);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.bindTexture(gl.TEXTURE_2D, null);
				doneLoading();
			}
			sat.texture.image.src = "images/"+info.imgfile;
			sat.imgpath = "url(images/"+info.imgfile+")";
		}
		return;
	}
	this.list[0].satarray.push(sat);
}

function Satellite(tledata) {
	"use strict";

	this.tle = new tle_t(tledata);
	this.name = "";
	this.texture = null;
	this.imgpath = "";
	this.deep = norad.is_deep_space(this.tle);
	this.position = [];
	this.show = true;
	this.idxBuffer = null;
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

function SatelliteArray(tlefile, groupfile) {
	"use strict";

	var self = this;
	this.group = new SatelliteGroup(groupfile);
	this.useimages = true;
	this.interval = null;
	this.fail = fail;

	function fail(e) {
		totalfailure();
		console.log(e.message);
		if(self.interval) clearInterval(self.interval);
	}

	function init() {
		if(failure) return;

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
			for(var g in self.group.list) {
				if((g != 35)&&(g != 15)&&(g != 23))
					self.group.list[g].display(false);
			}
			self.group.list[35].list();
			self.interval = window.setInterval(function() {if(!mouseDown && !loading && !failure) self.refresh();}, 1000);
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
			if(!sat.show) continue;
			var t = norad.sinceEpoch(sat.tle.epoch, julian);
			sat.position = norad.getPoint(sat.tle, t, sat.deep, julian, thetaJD);
			vertexData.push(sat.position[0], sat.position[1], sat.position[2]);
			if(sat.texture) {
				sat.idxBuffer = gl.createBuffer();
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sat.idxBuffer);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([idx]), gl.STATIC_DRAW);
				sat.idxBuffer.itemSize = 1;
				sat.idxBuffer.numItems = 1;
			} else {
				indexData.push(idx);
			}
			idx++;
		}

		try {
			g.posBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, g.posBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);
			g.posBuffer.itemSize = 3;
			g.posBuffer.numItems = vertexData.length / 3;
		} catch(e) {this.fail(e); return;}

		g.idxBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idxBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
		g.idxBuffer.itemSize = 1;
		g.idxBuffer.numItems = indexData.length;
	}
}

SatelliteArray.prototype.draw = function(bodyMatrix) {
	if(loading > 0 || failure) return;

	gl.uniform1i(shader.uselighting, 0);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, bodyMatrix);

	for(var gidx in this.group.list)
	{
		var g = this.group.list[gidx];
		if(!g.show) continue;
		if(!this.useimages && g.texture) {
			gl.uniform1f(shader.pointSize, 3.5);
		} else {
			gl.uniform1f(shader.pointSize, g.size);
		}

		if(this.useimages && g.texture) {
			gl.uniform1i(shader.monochromatic, 2);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, g.texture);
		} else {
			gl.uniform1i(shader.monochromatic, 1);
			gl.uniform3f(shader.monoColor, g.r, g.g, g.b)
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, g.posBuffer);
		gl.vertexAttribPointer(shader.vertexPositionAttribute, g.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.idxBuffer);
		gl.drawElements(gl.POINTS, g.idxBuffer.numItems, gl.UNSIGNED_SHORT, 0);

		for(var sidx in g.imgsatarray)
		{
			var s = g.imgsatarray[sidx];
			if(!s.show) continue;
			if(this.useimages && s.texture) {
				gl.uniform1f(shader.pointSize, 20.0);
				gl.uniform1i(shader.monochromatic, 2);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, s.texture);
			}
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.idxBuffer);
			gl.drawElements(gl.POINTS, 1, gl.UNSIGNED_SHORT, 0);
		}
	}
}
