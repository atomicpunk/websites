/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the 
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */

var home = new Home();

var homebase = {
	country_obj: null,
	country_elem: null,
	city_obj: null,
	city_elem: null
};

function City(cname, clat, clon, ishome) {
	"use strict";

	this.name = cname;
	this.lat = clat;
	this.lon = clon;
	this.pos = [];
	this.select = (ishome)?true:false;
}

function Country(cname, ishome) {
	"use strict";

	var self = this;
	this.name = cname;
	this.list = [];
	this.hash = [];
	this.select = (ishome)?true:false;
}

Country.prototype.addCity = function(cname, lat, lon, ishome) {
	var city = new City(cname, lat, lon, ishome);
	this.list.push(city);
	this.hash[cname] = city;
	if(ishome)
		homebase.city_obj = city;
}

Country.prototype.display = function(doshow) {
	var item = document.getElementById(this.id);
	if(doshow) {
		item.className = "listitem select";
		this.show = true;
	} else {
		item.className = "listitem";
		this.show = false;
	}
}

Country.prototype.loadList = function() {
	var self = this;
	var cityhtml = "";
	var list2 = document.getElementById("list2");
	var homedisplay = document.getElementById("homedisplay");
	for(var idx in this.list)
	{
		var c = this.list[idx];
		var select = (c.select)?" select":"";
		cityhtml += '<div id="p'+idx+
			'" class="listitem'+select+'"><div class="pcolor"></div>'+c.name+'</div>';
	}
	list2.innerHTML = cityhtml;
	homebase.city_elem = list2.getElementsByClassName('listitem select')[0];
	var items = list2.getElementsByClassName('listitem');
	for (var i = 0; i < items.length; i++) {
		items[i].onclick = function(e) {
			if(e.target.className.indexOf("listitem") == 0) {
				var idx = parseInt(e.target.id.slice(1));
				var c = self.list[idx];
				if(homebase.city_obj == c)
					return;
				if(homebase.city_elem)
					homebase.city_elem.className = "listitem";
				if(homebase.city_obj)
					homebase.city_obj.select = false;
				homebase.city_obj = c;
				homebase.city_elem = e.target;
				homebase.city_elem.className = "listitem select";
				homedisplay.innerHTML = c.name;
				c.select = true;
			}
		}
	}
}

function LocationList(file) {
	"use strict";

	var self = this;
	this.list = [];
	this.hash = [];

	this.myLocation = myLocation;
	function myLocation() {
		var lat = homebase.city_obj.lat;
		var lon = homebase.city_obj.lon;
		return [lat, lon];
	}

	this.loadList = loadList;
	function loadList() {
		var countryhtml = "";
		var selected_id = "";
		for(var cidx in self.list)
		{
			var c = self.list[cidx];
			var select = (c.select)?" select":"";
			countryhtml += '<div id="c'+cidx+
				'" class="listitem'+select+'"><div class="ccolor"></div>'+c.name+'</div>';
			if(c.select)
				selected_id = "c"+cidx;
		}
		var list1 = document.getElementById("list1");
		list1.innerHTML = countryhtml;
		homebase.country_elem = list1.getElementsByClassName('listitem select')[0];
		if(homebase.country_obj)
			homebase.country_obj.loadList();
		var items = list1.getElementsByClassName('listitem');
		for (var i = 0; i < items.length; i++) {
			items[i].onclick = function(e) {
				if(e.target.className.indexOf("listitem") == 0) {
					var idx = parseInt(e.target.id.slice(1));
					var c = self.list[idx];
					if(homebase.country_obj == c)
						return;
					if(homebase.country_elem)
						homebase.country_elem.className = "listitem";
					if(homebase.country_obj)
						homebase.country_obj.select = false;
					homebase.country_obj = c;
					homebase.country_elem = e.target;
					homebase.country_elem.className = "listitem select";
					homebase.city_elem = null;
					c.select = true;
					c.loadList();
				}
			}
		}
	}

	function init() {
		if(failure) return;

		var def_country = "United States Of America";
		var def_city = "Hillsboro, Oregon";

		var request = new XMLHttpRequest();
		request.open("GET", file, false);
		request.onload = function(e) {
			var text = this.responseText;
			var lines = text.split("\n");
			var homedisplay = document.getElementById("homedisplay");
			for(var i in lines)
			{
				var l = lines[i].split("|");
				if(l.length != 4)
					continue;
				var iscountry = (def_country == l[0]);
				var iscity = ((def_country == l[0])&&(def_city == l[1]));
				var country;
				if(l[0] in self.hash) {
					country = self.hash[l[0]];
				} else {
					country = new Country(l[0], iscountry);
					self.list.push(country);
					self.hash[l[0]] = country;
					if(iscountry)
						homebase.country_obj = country;
				}
				country.addCity(l[1], parseFloat(l[2]), parseFloat(l[3]), iscity);
				if(iscity)
					homedisplay.innerHTML = l[1];
			}
		}
		request.send();
	}
	init();
}

function Home() {
	"use strict";

	var self = this;
	this.lat = 0.0;
	this.lon = 0.0;
	this.pos = [0, 0, 0];
	this.vec = [0, 0, 0];
	this.loclist = null;

	this.refresh = refresh;
	function refresh(e) {
		self.init();
		if(aristotle) updateMatrices();
	}

	this.loadList = loadList;
	function loadList() {
		self.loclist.loadList();
	}

	this.initVectors = initVectors;
	function initVectors(geomodel) {
		if(failure) return;

		self.vecstar = vectorFromLatLon(self.lat, self.lon + geomodel.starazi*180/Math.PI);
		self.vecmoon = vectorFromLatLon(self.lat, self.lon + geomodel.moonazi*180/Math.PI);
		self.vecsun = vectorFromLatLon(self.lat, self.lon + geomodel.sunazi*180/Math.PI);
	}

	this.init = init;
	function init(povchange) {
		if(failure) return;

		if(!self.loclist)
			self.loclist = new LocationList("loc.txt");
		var homepos = self.loclist.myLocation();
		self.lat = homepos[0];
		self.lon = homepos[1];
		if(povchange)
			povLatLon(self.lat, self.lon);
		self.vec = vectorFromLatLon(self.lat, self.lon);
		self.pos = posFromVector(self.vec);
		if(aristotle) initVectors(aristotle);

		if(gl) {
			/* home city marker */
			var mh = 1.4;
			var posArray = [0, 0, 0,
				self.pos[0], self.pos[1], self.pos[2],
				self.pos[0]*mh, self.pos[1]*mh, self.pos[2]*mh];
			var colorArray = [];
			var idxArray = [0, 1, 1, 2];
			colorArray.push(1.0, 0.0, 0.0, 0.0,
							0.5, 1.0, 1.0, 1.0,
							1.0, 1.0, 1.0, 0.0);

			/* telescope direction vector */
			var alt = 45;
			var azi = 45;
			var vx = vectorFromLatLon(self.lat, self.lon);
			var vy = [vx[0], vx[1], vx[2]];
			var vz = vectorFromLatLon(0, self.lon+90);
			vec3.cross(vy, vz);
			vec3.normalize(vy);
			var m = mat4.create();
			mat4.identity(m);
			for(var i = 0; i < 3; i++) m[i] = vx[i];
			for(var i = 0; i < 3; i++) m[i+4] = vy[i];
			for(var i = 0; i < 3; i++) m[i+8] = vz[i];
			//mat4.translate(m, [earthsize, 0, 0]);
			//mat4.rotate(m, (azi/180)*Math.PI, [1, 0, 0]);
			//mat4.rotate(m, (alt/180)*Math.PI, [0, 0, 1]);
			posArray.push(self.pos[0], self.pos[1], self.pos[2],
				m[12], m[13], m[14]);
			idxArray.push(3, 4);
			colorArray.push(1.0, 0.0, 0.0, 1.0,
							1.0, 0.0, 0.0, 1.0);

			/* North-South marker lines*/
			var cns = [0.0, 1.0, 1.0, 0.0];
			var crossradius = 10;
			var cv = 1.0/crossradius;
			var bounds = [180-crossradius, 180+crossradius];
			var dsize = earthsize * 1.002;
			var idx = 5;
			var phi = (180 - self.lon) * Math.PI / 180;
			for (var lat = bounds[0]; lat <= bounds[1]; lat++) {
				var theta = (lat - self.lat - 90) * Math.PI / 180;
				var sinTheta = Math.sin(theta);
				var cosTheta = Math.cos(theta);
				var x = dsize * Math.cos(phi) * sinTheta;
				var y = dsize * cosTheta;
				var z = dsize * Math.sin(phi) * sinTheta;
				posArray.push(x, y, z);
				if(lat <= 180) {
					cns[3] += cv;
					cns[2] -= cv*0.5;
				} else {
					cns[3] -= cv;
					cns[2] += cv*0.5;
				}
				colorArray.push(cns[0], cns[1], cns[2], cns[3]);
				if(lat < bounds[1])
					idxArray.push(idx, idx+1);
				idx++;
			}

			/* East-West marker lines*/
			var cew = [0.0, 1.0, 1.0, 0.0];
			var vx = vectorFromLatLon(self.lat, self.lon);
			var vy = [vx[0], vx[1], vx[2]];
			var vz = vectorFromLatLon(0, self.lon+90);
			vec3.cross(vy, vz);
			vec3.normalize(vy);
			var m = mat4.create();
			mat4.identity(m);
			for(var i = 0; i < 3; i++) m[i] = vx[i];
			for(var i = 0; i < 3; i++) m[i+4] = vy[i];
			for(var i = 0; i < 3; i++) m[i+8] = vz[i];
			if(bounds[0] > 0)
				mat4.rotate(m, (1+bounds[0]/180)*Math.PI, [0, 1, 0]);
			for (var lon = bounds[0]; lon <= bounds[1]; lon++) {
				posArray.push(dsize*m[0], dsize*m[1], dsize*m[2]);
				if(lon <= 180) {
					cew[3] += cv;
					cew[2] -= cv*0.5;
				} else {
					cew[3] -= cv;
					cew[2] += cv*0.5;
				}
				colorArray.push(cew[0], cew[1], cew[2], cew[3]);
				mat4.rotate(m, Math.PI/180, [0, 1, 0]);
				if(lon < bounds[1])
					idxArray.push(idx, idx+1);
				idx++;
			}

			self.posBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.posBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(posArray), gl.STATIC_DRAW);
			self.posBuffer.itemSize = 3;
			self.posBuffer.numItems = posArray.length/3;

			self.colBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, self.colBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArray), gl.STATIC_DRAW);
			self.colBuffer.itemSize = 4;
			self.colBuffer.numItems = colorArray.length/4;

			self.idxBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.idxBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idxArray), gl.STATIC_DRAW);
			self.idxBuffer.itemSize = 1;
			self.idxBuffer.numItems = idxArray.length;
		}
	}

	function posFromVector(vec) {
		var pos = [];
		pos[0] = earthsize*vec[0];
		pos[1] = earthsize*vec[1];
		pos[2] = earthsize*vec[2];
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

	this.povLatLon = povLatLon;
	function povLatLon(latitude, longitude) {
		povAlt = (latitude)*Math.PI/180;
		povAzi = (90 - longitude)*Math.PI/180;
	}
}

Home.prototype.draw = function(bodyMatrix) {
	if(loading > 0 || failure) return;

	gl.uniform1i(shader.uselighting, 0);
	gl.uniformMatrix4fv(shader.mvMatrixUniform, false, bodyMatrix);
	gl.uniform1i(shader.monochromatic, 3);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
	gl.vertexAttribPointer(shader.vertexPositionAttribute, this.posBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuffer);
	gl.vertexAttribPointer(shader.vertexColorAttribute, this.colBuffer.itemSize, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxBuffer);
	gl.drawElements(gl.LINES, this.idxBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}
