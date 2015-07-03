/*
 * Copyright (c) 2012, Todd Brandt.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * The code is based on an example written by Emanuele Feronato:
 * http://www.emanueleferonato.com/2014/12/10/html5-webgl-360-degrees-panorama-viewer-with-three-js/
 *
 */

function Panorama(idx) {
	var self = this;
	/*
	 * Panorama image file array, all images should be 360 horizontal pan
	 *  src is the filename
	 *  A0 is the top of the image in degrees from straight up (90 is horizon)
	 *  dA is total vertical span of the panorama (180 degrees max)
	 */
	var pidx = idx;
	var pano = [
		{'src' : 'toddshouse_500m_1000_June24_private.jpg', 'A0' : 66, 'dA' : 114, 'lon' : 180 },
		{'src' : 'toddshouse_500m_1000_June28_private.jpg', 'A0' : 66, 'dA' : 114, 'lon' : 120 },
		{'src' : 'toddshouse_150m_1000_private.jpg', 		'A0' : 66, 'dA' : 114, 'lon' : 180 },
		{'src' : 'toddshouse_150m_1600_private.jpg', 		'A0' : 66, 'dA' : 114, 'lon' : 180 },
		{'src' : 'toddshouse_500m_1250_private.jpg', 		'A0' : 66, 'dA' : 114, 'lon' : 130 },
		{'src' : 'toddshouse_385m_1600_private.jpg', 		'A0' : 64, 'dA' : 116, 'lon' : 180 },
		{'src' : 'toddshouse_500m_400_private.jpg', 		'A0' : 64, 'dA' : 115, 'lon' : 85 },
		{'src' : 'toddshouse_500m_640_private.jpg', 		'A0' : 65, 'dA' : 114, 'lon' : 120 },
		{'src' : 'toddshouse_500m_800_private.jpg', 		'A0' : 65, 'dA' : 115, 'lon' : 120 },
		{'src' : 'toddshouse_500m_1000_june14_private.jpg', 'A0' : 66, 'dA' : 114, 'lon' : 180 },
		{'src' : 'toddshouse_500m_1000_june14_wb_private.jpg','A0' : 66, 'dA' : 114, 'lon' : 180 },
		{'src' : 'amberglen_455m_1600_private.jpg', 		'A0' : 65, 'dA' : 115, 'lon' : 170 },
		{'src' : 'cpassNskyline_500m_iso200_1000_private.jpg', 'A0' : 68, 'dA' : 112, 'lon' : 0 },
		{'src' : 'toddshouse_305m_1s8_private.jpg', 		'A0' : 65, 'dA' : 115, 'lon' : 200 }, //13
		{'src' : 'toddshouse_150m_1s4_private.jpg', 		'A0' : 85, 'dA' : 95, 'lon' : 180 },
		{'src' : 'toddshouse_090m_1s4_private.jpg', 		'A0' : 86, 'dA' : 94, 'lon' : 180 },
		{'src' : 'toddshouse_245m_1s8_private.jpg', 		'A0' : 79, 'dA' : 101, 'lon' : 190 },
		{'src' : 'toddshouse_500m_1s5_private.jpg', 		'A0' : 75, 'dA' : 90},
		{'src' : 'toddshouse_500m_1s5_wb_private.jpg', 		'A0' : 75, 'dA' : 90}, //18
		{'src' : 'morning_sunshine_bright_private.jpg', 	'A0' : 75, 'dA' : 60},
		{'src' : 'toddshouse_235m_1s4_private.jpg', 		'A0' : 80, 'dA' : 65},
		{'src' : 'toddshouse_245m_1s4_private.jpg', 		'A0' : 70, 'dA' : 60},
		{'src' : 'toddshouse_500m_1s1_private.jpg', 		'A0' : 70, 'dA' : 70},
		{'src' : 'amberglen_095m_1s4_private.jpg', 			'A0' : 64, 'dA' : 82},
		{'src' : 'amberglen_160m_2s5_private.jpg', 			'A0' : 63, 'dA' : 70},
		{'src' : 'parknight_243m__private.jpg', 			'A0' : 75, 'dA' : 60},
		{'src' : 'parknight_244m__private.jpg', 			'A0' : 75, 'dA' : 60},
		{'src' : 'parknight_264m_1s_private.jpg', 			'A0' : 75, 'dA' : 60},
		{'src' : 'parknight_271m__private.jpg', 			'A0' : 75, 'dA' : 60},
		{'src' : 'Portland_Panorama_1640ft_Day_private.jpg','A0' : 60, 'dA' : 60},
		{'src' : 'skylineblvd_345m_12_private.jpg', 		'A0' : 60, 'dA' : 90},
		{'src' : 'skylineblvd_380m_12_private.jpg', 		'A0' : 59, 'dA' : 85},
	];
	var manualControl = false;
	var longitude = 0;
	var latitude = -20;
	var savedX;
	var savedY;
	var savedLongitude;
	var savedLatitude;
	self.camera = 0;
	self.scene = 0;
	self.sphere = 0;
	self.sphereMaterial = 0;
	self.sphereMesh = 0;
	self.renderer = 0;
	self.panodir = 'pimages/';
	self.fov = 75;


	init();
	function init()
	{
		if('lon' in pano[pidx])
			longitude = pano[pidx]['lon'];

		// setting up the renderer
		self.renderer = new THREE.WebGLRenderer();
		self.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(self.renderer.domElement);

		// creating a new scene
		self.scene = new THREE.Scene();

		// adding a camera
		self.camera = new THREE.PerspectiveCamera(self.fov, window.innerWidth / window.innerHeight, 1, 1000);
		self.camera.target = new THREE.Vector3(0, 0, 0);

		// creation of a big sphere geometry
		self.sphere = new THREE.SphereGeometry(100, 128, 64, 0, Math.PI*2,
			Math.PI*(pano[pidx]['A0']/180.0), Math.PI*(pano[pidx]['dA']/180.0));
		self.sphere.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

		// creation of the sphere material
		self.sphereMaterial = new THREE.MeshBasicMaterial();
		self.sphereMaterial.map = THREE.ImageUtils.loadTexture(self.panodir+pano[pidx]['src'])

		// geometry + material = mesh (actual object)
		self.sphereMesh = new THREE.Mesh(self.sphere, self.sphereMaterial);
		self.scene.add(self.sphereMesh);

		// listeners
		document.addEventListener("mousedown", onDocumentMouseDown, false);
		document.addEventListener("mousemove", onDocumentMouseMove, false);
		document.addEventListener("mouseup", onDocumentMouseUp, false);
		document.addEventListener("keyup", onDocumentKeyUp, false);
		document.addEventListener("mousewheel", onDocumentMouseWheel, false);
		document.addEventListener("DOMMouseScroll", onDocumentMouseWheel, false);

		render();
	}

	function render(){
		requestAnimationFrame(render);
				
		if(!manualControl){
			longitude += 0.01;
		}

		// limiting latitude from -85 to 85 (cannot point to the sky or under your feet)
		latitude = Math.max(90-pano[pidx]['A0']-pano[pidx]['dA'], Math.min(0, latitude));

		// moving the camera according to current latitude (vertical movement) and longitude (horizontal movement)
		self.camera.target.x = 500 * Math.sin(THREE.Math.degToRad(90 - latitude)) * Math.cos(THREE.Math.degToRad(longitude));
		self.camera.target.y = 500 * Math.cos(THREE.Math.degToRad(90 - latitude));
		self.camera.target.z = 500 * Math.sin(THREE.Math.degToRad(90 - latitude)) * Math.sin(THREE.Math.degToRad(longitude));
		self.camera.lookAt(self.camera.target);

		// calling again render function
		self.renderer.render(self.scene, self.camera);
	}
			
	// when the mouse is pressed, we switch to manual control and save current coordinates
	function onDocumentMouseDown(event){
		event.preventDefault();
		manualControl = true;
		savedX = event.clientX;
		savedY = event.clientY;
		savedLongitude = longitude;
		savedLatitude = latitude;
	}

	// when the mouse moves, if in manual contro we adjust coordinates
	function onDocumentMouseMove(event){
		if(manualControl){
			var frac = 0.008 + ((0.1-0.008)*((self.fov - 5)/70));
			longitude = (savedX - event.clientX) * frac + savedLongitude;
			latitude = (event.clientY - savedY) * frac + savedLatitude;
		}
	}

	// when the mouse is released, we turn manual control off
	function onDocumentMouseUp(event){
		manualControl = false;
	}

	function onDocumentMouseWheel(e){
		var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail))) * -1;
		var newfov = self.fov + (delta*5);
		if ((newfov < 5) || (newfov > 75))
			return;
		self.fov = newfov;
		self.camera = new THREE.PerspectiveCamera(self.fov, window.innerWidth / window.innerHeight, 1, 1000);
		self.camera.target = new THREE.Vector3(0, 0, 0);
	}

	function onDocumentKeyUp(e){
		if(e.keyCode == 78) {
			pidx = (pidx + 1) % 10;
			self.sphereMaterial.map = THREE.ImageUtils.loadTexture(self.panodir+pano[pidx]['src']);
		}
	}
}

window.addEventListener('load', function () {
	"use strict";
	var idx = 0;
	var query = window.location.search.substring(1);
	if(query) {
		query = query.split('&');
		for(var i = 0; i < query.length; i++) {
			if(query[i].indexOf('index=') == 0) {
				idx = parseInt(query[i].slice(6));
			}
		}
	}
	var pano = new Panorama(idx);
});
