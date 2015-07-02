function Panorama(idx) {
	var self = this;
	var manualControl = false;
	var longitude = 0;
	var latitude = 0;
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

	var pano = [
		{'src' : 'toddshouse_500m_1000_June24_private.jpg', 'A0' : 60, 'dA' : 120},
		{'src' : 'toddshouse_500m_1000_june14_private.jpg', 'A0' : 65, 'dA' : 70},
		{'src' : 'toddshouse_500m_1000_June28_private.jpg', 'A0' : 60, 'dA' : 120},
		{'src' : 'Drone_Panorama_alt1500ft_private.jpg', 'A0' : 76, 'dA' : 50},
		{'src' : 'morning_sunshine_bright_private.jpg', 'A0' : 75, 'dA' : 60},
		{'src' : 'toddshouse_090m_1s4_private.jpg', 'A0' : 85, 'dA' : 95},
		{'src' : 'toddshouse_150m_1000_private.jpg', 'A0' : 65, 'dA' : 115},
		{'src' : 'toddshouse_150m_1600_private.jpg', 'A0' : 65, 'dA' : 115},
		{'src' : 'toddshouse_150m_1s4_private.jpg', 'A0' : 80, 'dA' : 100},
		{'src' : 'toddshouse_235m_1s4_private.jpg', 'A0' : 80, 'dA' : 65},
		{'src' : 'toddshouse_245m_1s4_private.jpg', 'A0' : 70, 'dA' : 60},
		{'src' : 'toddshouse_245m_1s8_private.jpg', 'A0' : 80, 'dA' : 100},
		{'src' : 'toddshouse_305m_1s8_private.jpg', 'A0' : 60, 'dA' : 120},
		{'src' : 'toddshouse_385m_1600_private.jpg', 'A0' : 60, 'dA' : 120},
		{'src' : 'toddshouse_500m_1000_private.jpg', 'A0' : 60, 'dA' : 80},
		{'src' : 'toddshouse_500m_1000_wb_private.jpg', 'A0' : 60, 'dA' : 80},
		{'src' : 'toddshouse_500m_1250_private.jpg', 'A0' : 60, 'dA' : 120},
		{'src' : 'toddshouse_500m_1s1_private.jpg', 'A0' : 70, 'dA' : 70},
		{'src' : 'toddshouse_500m_1s5_private.jpg', 'A0' : 75, 'dA' : 90},
		{'src' : 'toddshouse_500m_1s5_wb_private.jpg', 'A0' : 75, 'dA' : 90},
		{'src' : 'toddshouse_500m_400_private.jpg', 'A0' : 65, 'dA' : 114},
		{'src' : 'toddshouse_500m_640_private.jpg', 'A0' : 65, 'dA' : 114},
		{'src' : 'toddshouse_500m_800_private.jpg', 'A0' : 62, 'dA' : 118},
		{'src' : 'amberglen_095m_1s4_private.jpg', 'A0' : 59, 'dA' : 80},
		{'src' : 'amberglen_160m_2s5_private.jpg', 'A0' : 60, 'dA' : 70},
		{'src' : 'amberglen_455m_1600_private.jpg', 'A0' : 60, 'dA' : 120},
		{'src' : 'parknight_243m__private.jpg', 'A0' : 75, 'dA' : 60},
		{'src' : 'parknight_244m__private.jpg', 'A0' : 75, 'dA' : 60},
		{'src' : 'parknight_264m_1s_private.jpg', 'A0' : 75, 'dA' : 60},
		{'src' : 'parknight_271m__private.jpg', 'A0' : 75, 'dA' : 60},
		{'src' : 'Portland_Panorama_1640ft_Day_private.jpg', 'A0' : 60, 'dA' : 60},
		{'src' : 'skylineblvd_345m_12_private.jpg', 'A0' : 60, 'dA' : 90},
		{'src' : 'skylineblvd_380m_12_private.jpg', 'A0' : 59, 'dA' : 85},
	];
	var pidx = idx;

	init();
	function init()
	{
		// setting up the renderer
		self.renderer = new THREE.WebGLRenderer();
		self.renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(self.renderer.domElement);

		// creating a new scene
		self.scene = new THREE.Scene();

		// adding a camera
		self.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
		self.camera.target = new THREE.Vector3(0, 0, 0);

		// creation of a big sphere geometry
		self.sphere = new THREE.SphereGeometry(100, 50, 40, 0, Math.PI*2,
			Math.PI*(pano[pidx]['A0']/180.0), Math.PI*(pano[pidx]['dA']/180.0));
		self.sphere.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

		// creation of the sphere material
		self.sphereMaterial = new THREE.MeshBasicMaterial();
		self.sphereMaterial.map = THREE.ImageUtils.loadTexture('pimages/'+pano[pidx]['src'])

		// geometry + material = mesh (actual object)
		self.sphereMesh = new THREE.Mesh(self.sphere, self.sphereMaterial);
		self.scene.add(self.sphereMesh);

		// listeners
		document.addEventListener("mousedown", onDocumentMouseDown, false);
		document.addEventListener("mousemove", onDocumentMouseMove, false);
		document.addEventListener("mouseup", onDocumentMouseUp, false);

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
			longitude = (savedX - event.clientX) * 0.1 + savedLongitude;
			latitude = (event.clientY - savedY) * 0.1 + savedLatitude;
		}
	}

	// when the mouse is released, we turn manual control off
	function onDocumentMouseUp(event){
		manualControl = false;
	}

/*
	document.onkeyup = function(event){
		pidx = (pidx + 1) % pano.length
		self.sphereMaterial.map = THREE.ImageUtils.loadTexture('pimages/'+pano[pidx]['src'])
    }
*/
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
