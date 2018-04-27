
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var containers=[], statss=[], guis = [];
var cameras=[], sceneFirstPasses=[], sceneSecondPasses=[], renderers=[];

var clock = new THREE.Clock(), guiControlss = [];
var rtTextures = [], transferTextures = [], cubeTextureses = [['bonsai', 'foot', 'teapot'],['bonsai', 'foot', 'teapot']];

var width = window.innerWidth, height = window.innerHeight;

var sunDirection = [3.0, -2.0, 0.0],
	sunIntensity = [1.0, 1.0, 1.0],
	ambientLightIntensity = [0.2, 0.2, 0.2];

var materialSecondPasses = [];
init('container1');
init('container2');

function init(id) {
	// Load both sets of Shaders and starts the program
	loadTextResource('./gl/fragmentShaderFirstPass.glsl', function (fs_Err1, fs_first) {
		if (fs_Err1) {
			alert('Fatal error getting vertex shader (see console)');
			console.error(fs_Err1);
		} else {
			loadTextResource('./gl/vertexShaderFirstPass.glsl', function (vs_Err1, vs_first) {
				if (vs_Err1) {
					alert('Fatal error getting fragment shader (see console)');
					console.error(vs_Err1);
				} else {
					loadTextResource('./gl/fragmentShaderSecondPass.glsl', function (fs_Err2, fs_second) {
						if (fs_Err2) {
							alert('Fatal error getting Susan model (see console)');
							console.error(fs_Err2);
						} else {
							loadTextResource('./gl/vertexShaderSecondPass.glsl', function (vs_Err2, vs_second) {
								if (vs_Err2) {
									alert('Fatal error getting Susan texture (see console)');
									console.error(vs_Err2);
								} else { 
									InitDemo(id, fs_first, vs_first, fs_second, vs_second);
									if (!transfer)
										build_transfer_function();
									animate();
								}
							});
						}
					});
				}
			});
		}
	});
};

function InitDemo(id, fragmentShaderFirstPass, vertexShaderFirstPass, fragmentShaderSecondPass, vertexShaderSecondPass) {

	var idx = +id.slice(-1)-1;	
	//Parameters that can be modified.
	guiControlss[idx] = new function() {
		this.model = 'bonsai';
		this.steps = 20.0;
		this.useLinear = true;
		this.alphaCorrection = 1.0;
		this.transparent = false;
		this.width = 5;
		this.ray_distance = 500;
		this.color0 = "#00FA58";
		this.stepPos0 = 0.1;
		this.color1 = "#CC6600";
		this.stepPos1 = 0.7;
		this.color2 = "#F2F200";
		this.stepPos2 = 1.0;
	};

	containers[idx] = document.getElementById( id );

	cameras[idx] = new THREE.PerspectiveCamera( 40,  width / height, 0.01, 3000.0 );
	cameras[idx].position.z = 2.0;

	var controls = new THREE.OrbitControls( cameras[idx], containers[idx] );
	controls.center.set( 0.0, 0.0, 0.0 );

	//Load the 2D texture containing the Z slices.
	cubeTextureses[idx]['bonsai'] = THREE.ImageUtils.loadTexture('bonsai.raw.png' );
	cubeTextureses[idx]['teapot'] = THREE.ImageUtils.loadTexture('teapot.raw.png');
	cubeTextureses[idx]['foot']   = THREE.ImageUtils.loadTexture('foot.raw.png');

	//Don't let it generate mipmaps to save memory and apply linear filtering to prevent use of LOD.
	cubeTextureses[idx]['bonsai'].minFilter = THREE.LinearFilter;
	cubeTextureses[idx]['bonsai'].magFilter = THREE.LinearFilter;

	cubeTextureses[idx]['teapot'].minFilter = THREE.LinearFilter;
	cubeTextureses[idx]['teapot'].magFilter = THREE.LinearFilter;

	cubeTextureses[idx]['foot'].minFilter = THREE.LinearFilter;
	cubeTextureses[idx]['foot'].magFilter = THREE.LinearFilter;


	transferTextures[idx] = updateTransferFunction(idx);

	var screenSize = new THREE.Vector2( width, height );
	rtTextures[idx] = new THREE.WebGLRenderTarget( screenSize.x, screenSize.y,
											{ 	minFilter: THREE.LinearFilter,
												magFilter: THREE.LinearFilter,
												wrapS:  THREE.ClampToEdgeWrapping,
												wrapT:  THREE.ClampToEdgeWrapping,
												format: THREE.RGBFormat,
												type: THREE.FloatType,
												generateMipmaps: false} );

	var materialFirstPass = new THREE.ShaderMaterial( {
		vertexShader: vertexShaderFirstPass,
		fragmentShader: fragmentShaderFirstPass,
		side: THREE.BackSide
	} );

	materialSecondPasses[idx] = new THREE.ShaderMaterial( {
		vertexShader: vertexShaderSecondPass,
		fragmentShader: fragmentShaderSecondPass,
		side: THREE.FrontSide,		
		uniforms: {	tex:  { type: "t", value: rtTextures[idx] },
					cubeTex:  { type: "t", value: cubeTextureses[idx]['bonsai'] },
					transferTex:  { type: "t", value: transferTextures[idx] },
					steps : {type: "1f" , value: guiControlss[idx].steps },
					ray_distance : {type: "i" , value: guiControlss[idx].ray_distance },
					alphaCorrection : {type: "1f" , value: guiControlss[idx].alphaCorrection },
					useLinear : {type: "i", value: 1},
					phong : {type: "i", value: 1},
					opacities : {type: "fv", value: new Float32Array(18)},
					ambientLightIntensity :  {type: "fv", value: new Float32Array(3)},
					sunDirection :  {type: "fv", value: new Float32Array(3)},
					sunIntensity :  {type: "fv", value: new Float32Array(3)}}
	 });

	// Create Scene
	sceneFirstPasses[idx] = new THREE.Scene();
	sceneSecondPasses[idx] = new THREE.Scene();

	var boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
	boxGeometry.doubleSided = true;

	var meshFirstPass = new THREE.Mesh( boxGeometry, materialFirstPass );
	var meshSecondPass = new THREE.Mesh( boxGeometry, materialSecondPasses[idx] );
	
	sceneFirstPasses[idx].add( meshFirstPass );
	sceneSecondPasses[idx].add( meshSecondPass );

	renderers[idx] = new THREE.WebGLRenderer({alpha:true});
	containers[idx].appendChild( renderers[idx].domElement );

	statss[idx] = new Stats();
	statss[idx].domElement.id = "fps"+idx;
	containers[idx].appendChild( statss[idx].domElement );	
	
	updateGUI(idx);
	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );
	window.onload = setGUIColors;
}

function updateGUI(idx) 
{
	d3.select('div#gui'+idx).remove()

	var max_ray_distance = materialSecondPasses[idx].uniforms.steps.value * 1.5;
	if (guiControlss[0].ray_distance)
		guiControlss[idx].ray_distance = d3.min([guiControlss[idx].ray_distance, max_ray_distance])

	guis[idx] = new dat.GUI({autoplace: false});
	guis[idx].domElement.id = 'gui'+idx;
	var modelSelected = guis[idx].add(guiControlss[idx], 'model', [ 'bonsai', 'foot', 'teapot' ] ).name("Dataset");
	modelSelected.onChange(function(value) { materialSecondPasses[idx].uniforms.cubeTex.value =  cubeTextureses[idx][value]; } );

	guis[idx].add(guiControlss[idx], 'steps', 0.0, 512.0).name("# Steps").onFinishChange(function(){updateGUI(idx);});
	guis[idx].add(guiControlss[idx], 'alphaCorrection', 0.01, 5.0).step(0.01).name("&#945 Correction");
	guis[idx].add(guiControlss[idx], 'ray_distance', 0, max_ray_distance).name("Ray Distance");
	guis[idx].add(guiControlss[idx], 'width', 2, 12).step(1).name("TF Weight").onChange(updateTextures);
	guis[idx].add(guiControlss[idx], 'useLinear').name('Use Linear').listen();
	guis[idx].add(guiControlss[idx], 'transparent').name('Transparent').listen();

	onWindowResize();

}


function updateTextures(value)
{
	for (var idx=0; idx < cameras.length; idx++){
		materialSecondPasses[idx].uniforms.transferTex.value = updateTransferFunction(idx);		
	}
}
function updateTransferFunction(idx)
{
	
	var canvas = document.createElement('canvas');
	canvas.height = guiControlss[idx].width;
	canvas.width = 256;

	var ctx = canvas.getContext('2d');	

	var grd = ctx.createLinearGradient(0, 0, canvas.width -1 , canvas.height - 1);
	var num_colors = Object.getOwnPropertyNames(guiControlss[idx]).filter(d=>d.includes('color')).length;
	for (var i=0; i<num_colors; i++){
		grd.addColorStop(guiControlss[idx]['stepPos'+i], guiControlss[idx]['color'+i]);		
	}
	
	ctx.fillStyle = grd;
	ctx.fillRect(0,0,canvas.width -1 ,canvas.height*0.85 -1 );

	transferTextures[idx] =  new THREE.Texture(canvas);
	transferTextures[idx].wrapS = transferTextures[idx].wrapT =  THREE.ClampToEdgeWrapping;
	transferTextures[idx].needsUpdate = true;

	return transferTextures[idx];
}

function onWindowResize( event ) {
	
	for (var idx=0; idx < cameras.length; idx++){
		cameras[idx].aspect = width / height;
		cameras[idx].updateProjectionMatrix();

		width = window.innerWidth * 0.33;
		height = window.innerHeight * 0.5;

		renderers[idx].setSize( width, height );
		d3.select(containers[idx]).style("width",width+"px");
		d3.select(containers[idx]).style("height",height+"px");

		guis[idx].width = window.innerWidth * 0.26;
	}

}

function animate() {	

	setGUIColors();
	requestAnimationFrame( animate );

	render();
	for (var idx=0; idx < cameras.length; idx++)
		statss[idx].update();	
}

function render() {

	var delta = clock.getDelta();
	
	for (var idx=0; idx < cameras.length; idx++){
		//Render first pass and store the world space coords of the back face fragments into the texture.
		renderers[idx].render( sceneFirstPasses[idx], cameras[idx], rtTextures[idx], true );

		//Render the second pass and perform the volume rendering.
		renderers[idx].render( sceneSecondPasses[idx], cameras[idx] );	

		materialSecondPasses[idx].transparent = guiControlss[idx].transparent;
		materialSecondPasses[idx].uniforms.steps.value = guiControlss[idx].steps;
		materialSecondPasses[idx].uniforms.alphaCorrection.value = guiControlss[idx].alphaCorrection;
		materialSecondPasses[idx].uniforms.useLinear.value = guiControlss[idx].useLinear;
		materialSecondPasses[idx].uniforms.ray_distance.value = guiControlss[idx].ray_distance;
		materialSecondPasses[idx].uniforms.opacities.value = getOpacities();
		materialSecondPasses[idx].uniforms.ambientLightIntensity.value = ambientLightIntensity;
		materialSecondPasses[idx].uniforms.sunDirection.value = sunDirection;
		materialSecondPasses[idx].uniforms.sunIntensity.value = sunIntensity;
	}
}

//Leandro R Barbagallo - 2015 - lebarba at gmail.com