varying vec3 worldSpaceCoords;
varying vec4 projectedCoords;
uniform sampler2D tex, cubeTex, transferTex;
uniform float steps;
uniform float alphaCorrection;
// Custom Parameter Uniforms
uniform int useLinear;
uniform float opacities[20];
uniform int ray_distance;
// Phong Lighting Uniforms
uniform int phong;
uniform vec3 ambientLightIntensity;
uniform vec3 sunDirection;
uniform vec3 sunIntensity;

// Max Steps for ray to travel, but 
// ray_distance will take precendence.
const int MAX_STEPS = 1000;


// Clamps a vec4 to the range [min_val, max_val]
vec4 normV4(vec4 x, float min_val, float max_val)
{
	for (int i=0; i<4; i++)
		x[i] = max(min(x[i],max_val),min_val);
	return x;
}

// Performs linear interpolation between two points
vec4 interpolateLinear(vec4 x, vec4 y, vec3 a)
{
	return vec4(x.x * (1.0-a.x) + y.x * a.x,
				x.y * (1.0-a.y) + y.y * a.y,
				x.z * (1.0-a.z) + y.z * a.z,
				x.a);
}

// Uses Bezier Cubic splines to interpolate 4 points b0,b1,b2, and b3
float b(float x, int i, int k)  { return pow(1.0-x, float(k-i)) * pow(x, float(i)); }
float binom(float x, float b0, float b1, float b2, float b3)
{
	return 1.0 * b0 * b(x,0,3) + 
		   3.0 * b1 * b(x,1,3) + 
		   3.0 * b2 * b(x,2,3) + 
		   1.0 * b3 * b(x,3,3) ;
}

// Performs cubic interpolation between two points
vec4 interpolateCubic(vec4 x, vec4 y,  vec4 z, vec4 w, vec3 a)
{
	vec4 df0 = (x - z) / 2.0;
	vec4 df1 = (w - y) / 2.0;

	vec4 b0 = x;
	vec4 b1 = x + df0 / 3.0;
	vec4 b2 = y - df1 / 3.0;
	vec4 b3 = y;

	vec4 interpolate = vec4(binom(a.x, b0.x, b1.x, b2.x, b3.x), 
							binom(a.y, b0.y, b1.y, b2.y, b3.y),
							binom(a.z, b0.z, b1.z, b2.z, b3.z),
							y.a);
	
	return normV4(interpolate, 0.0, 255.0) ;	
}

//Acts like a texture3D using Z slices and trilinear filtering.
vec4 sampleAs3DTexture( vec3 texCoord )
{
	vec4 colorSlice1, colorSlice2, colorSlice3, colorSlice4;
	vec2 texCoordSlice1, texCoordSlice2, texCoordSlice3, texCoordSlice4;

	//The z coordinate determines which Z slice we have to look for.
	//Z slice number goes from 0 to 255.
	// Since we might use TriCubic, we need 4 points.
	float zSliceNumber1 = floor(texCoord.z  * 255.0);
	float zSliceNumber2 = min( zSliceNumber1 + 2.0, 255.0); //Clamp to 255
	float zSliceNumber3 = min( zSliceNumber1 - 2.0, 255.0); //Clamp to 255 and 0	
	float zSliceNumber4 = min( zSliceNumber1 + 4.0, 255.0); //Clamp to 255 and 0

	//The Z slices are stored in a matrix of 16x16 of Z slices.
	//The original UV coordinates have to be rescaled by the tile numbers in each row and column.
	texCoord.xy /= 16.0;

	texCoordSlice1 = texCoordSlice2 = texCoordSlice3 = texCoordSlice4 = texCoord.xy;

	//Add an offset to the original UV coordinates depending on the row and column number.
	texCoordSlice1.x += (mod(zSliceNumber1, 16.0 ) / 16.0);
	texCoordSlice1.y += floor((255.0 - zSliceNumber1) / 16.0) / 16.0;
	
	texCoordSlice2.x += (mod(zSliceNumber2, 16.0 ) / 16.0);
	texCoordSlice2.y += floor((255.0 - zSliceNumber2) / 16.0) / 16.0;

	texCoordSlice3.x += (mod(zSliceNumber3, 16.0 ) / 16.0);
	texCoordSlice3.y += floor((255.0 - zSliceNumber3) / 16.0) / 16.0;
	
	texCoordSlice4.x += (mod(zSliceNumber4, 16.0 ) / 16.0);
	texCoordSlice4.y += floor((255.0 - zSliceNumber4) / 16.0) / 16.0;

	//Get the opacity value from the 2D texture.
	//Bilinear filtering is done at each texture2D by default.
	colorSlice1 = texture2D( cubeTex, texCoordSlice1 ) ;
	colorSlice2 = texture2D( cubeTex, texCoordSlice2 ) ;
	colorSlice3 = texture2D( cubeTex, texCoordSlice3 ) ;
	colorSlice4 = texture2D( cubeTex, texCoordSlice4 ) ;

	//Based on the opacity obtained earlier, get the RGB color in the transfer function texture.
	colorSlice1.rgb = texture2D( transferTex, vec2( colorSlice1.a, 1.0) ).rgb;
	colorSlice2.rgb = texture2D( transferTex, vec2( colorSlice2.a, 1.0) ).rgb;
	colorSlice3.rgb = texture2D( transferTex, vec2( colorSlice3.a, 1.0) ).rgb;
	colorSlice4.rgb = texture2D( transferTex, vec2( colorSlice4.a, 1.0) ).rgb;

	//How distant is zSlice1 to ZSlice2. Used to interpolate between one Z slice and the other.
	vec3 Difference = mod(texCoord * 255.0, 1.0);

	//Finally interpolate between the two intermediate colors of each Z slice.
	
	if (useLinear == 1)	// Either Use Linear Interpolation or Cubic Interpolation
		return interpolateLinear(colorSlice3, colorSlice4, Difference);									
	return interpolateCubic(colorSlice1, colorSlice2, colorSlice3, colorSlice4, Difference) ;
}


void main( void ) {

	//Transform the coordinates it from [-1;1] to [0;1]
	vec2 texc = vec2(((projectedCoords.x / projectedCoords.w) + 1.0 ) / 2.0,
					((projectedCoords.y / projectedCoords.w) + 1.0 ) / 2.0 );

	//The back position is the world space position stored in the texture.
	vec3 backPos = texture2D(tex, texc).xyz;

	//The front position is the world space position of the second render pass.
	vec3 frontPos = worldSpaceCoords;

	//The direction from the front position to back position.
	vec3 dir = backPos - frontPos;

	float rayLength = length(dir);

	//Calculate how long to increment in each step.
	float delta = 1.0 / steps;

	//The increment in each direction for each step.
	vec3 deltaDirection = normalize(dir) * delta;
	float deltaDirectionLength = length(deltaDirection);

	//Start the ray casting from the front position.
	vec3 currentPosition = frontPos;

	//The color accumulator.
	vec4 accumulatedColor = vec4(0.0);

	//The alpha value accumulated so far.
	float accumulatedAlpha = 0.0;

	//How long has the ray travelled so far.
	float accumulatedLength = 0.0;

	//If we have twice as many samples, we only need ~1/2 the alpha per sample.
	//Scaling by 256/10 just happens to give a good value for the alphaCorrection slider.
	float alphaScaleFactor = 25.6 * delta;

	vec4 colorSample;
	float alphaSample;

	//Perform the ray marching iterations
	for(int i = 0; i < MAX_STEPS; i++)
	{
		//Get the voxel intensity value from the 3D texture.
		colorSample = sampleAs3DTexture( currentPosition );

		// Add Phong Lighting if desired
		if (phong==1) {
			vec3 surfaceNormal = normalize( currentPosition );
			vec3 normSunDir = normalize( sunDirection );
			vec4 texel = colorSample;
			vec3 lightIntensity = ambientLightIntensity + sunIntensity * max(dot(surfaceNormal, normSunDir),0.0);
			colorSample = vec4(texel.xyz * lightIntensity, texel.a);
		}	

		//Allow the alpha correction customization.
		alphaSample = colorSample.a * alphaCorrection;

		//Applying this effect to both the color and alpha accumulation results in more realistic transparency.
		alphaSample *= (1.0 - accumulatedAlpha);

		//Scaling alpha by the number of steps makes the final color invariant to the step size.
		alphaSample *= alphaScaleFactor;

		//Perform the composition.
		accumulatedColor += colorSample * alphaSample;

		//Store the alpha accumulated so far.
		accumulatedAlpha += alphaSample;

		//Advance the ray.
		currentPosition += deltaDirection;
		accumulatedLength += deltaDirectionLength;

		//If the length traversed is more than the ray length, or if the alpha accumulated reaches 1.0 then exit.
		if(accumulatedLength >= rayLength || accumulatedAlpha >= 1.0 )
			break;
		if(i >= ray_distance)
			break;
	}

	gl_FragColor  = accumulatedColor;
}