
// For a drop-down of interpolators
var interpolators = [
    // These are from d3-scale.
    "Rainbow", 	"Viridis", "Inferno", "Magma", 
    "Plasma", "Warm", "Cool", "CubehelixDefault"
  ];

// Margins for the transfer function
var tf_margin = {'left':20,'top':5,'bottom':30,'right':5}
var toolbar_width = window.innerWidth,
	toolbar_height = window.innerHeight * 0.17,
	tf_width = toolbar_width / 2.5 - tf_margin.left - tf_margin.right,
	tf_height = toolbar_height - tf_margin.top - tf_margin.bottom;

// For the Phong Lighting Dials
var cx = toolbar_width/2 + 15,
	cy = toolbar_height * 2 - 10,
	r  = 35;

// scale the range of the data
var x = d3.scaleLinear().range([tf_margin.left, tf_width-tf_margin.right])
var y = d3.scaleLinear().range([tf_height, tf_margin.top])
var color = d3.scaleSequential(d3.interpolateRainbow).domain([tf_height,0])
var bisect = d3.bisector(function(d){return d.x});
var bisectColor = d3.bisector(d => d);

var transfer, result, selected_col = "#00000000", started = false;

var percent = d3.scaleLinear().domain([0,tf_width]).range([0,100])
var num_pts = 20;
var default_col = d3.rgb("grey");

var pts = $.map($(Array(num_pts)),function(val, i) { return tf_margin.left + tf_width*(i+1)/num_pts; });
var cols = Array(num_pts).fill(default_col);
var selectValue = 'Rainbow';
var cursorbar = d3.scaleLinear();

var default_colors = [d3.rgb('lightgreen'),d3.rgb('yellow'),d3.rgb('goldenrod'),d3.rgb('brown')];
var dx = Math.floor(num_pts/default_colors.length);
for (var i=0; i<default_colors.length; i++){
	for (var j=0; j<dx; j++)
		cols[dx*i + j] = default_colors[i]
}

// -------------- Loads the data. Replace with real data -------------
var f = function(x){return d3.max([0,x/8]);}
var xs = $.map($(Array(num_pts-1)),function(val, i) { return tf_margin.left + tf_width*(i+1)/num_pts; });
var ys = xs.map(f);
var data = [{'x':tf_margin.left,'y':0}];// [{"x":tf_margin.left,"y":tf_height}]
xs.forEach(function(_,i){
	data[i+1] = {'x':xs[i],'y':ys[i]};
})
data.push({'x':tf_width+tf_margin.left,'y':0})	
// ------------------------------------------------------------------


build_transfer_function = function(){

	toolbar_width = window.innerWidth,
	toolbar_height = window.innerHeight * 0.20,
	tf_width = toolbar_width / 2.5 - tf_margin.left - tf_margin.right,
	tf_height = toolbar_height - tf_margin.top - tf_margin.bottom;

	var div = d3.select("#toolbar");

	y.domain(d3.extent(data, d => d.y));	
	result = data;

	div.attr('width',toolbar_width)
	   .attr('height',toolbar_height);

	var toolbar = div.append('svg').classed('toolbar',true)
				 .attr('width',toolbar_width)
				 .attr('height',toolbar_height)

	transfer = toolbar.append('svg').attr('id','transfer_func');	
    transfer.attr('x',toolbar_width/2 - tf_width/2)
		    .attr('y',toolbar_height/2 - tf_height/2)
		    .attr('width',tf_width + tf_margin.left + tf_margin.right)
		    .attr('height',tf_height + tf_margin.top + tf_margin.bottom)


	build_plot();
	draw_legend(18);
	build_palette();
	build_phong_lighting_dials();

}


function reset_transfer_function() {
	pts = $.map($(Array(num_pts)),function(val, i) { return tf_margin.left + tf_width*(i+1)/num_pts; });
	cols = Array(num_pts).fill(default_col);

	default_colors = [d3.rgb('lightgreen'),d3.rgb('yellow'),d3.rgb('goldenrod'),d3.rgb('brown')];
	dx = Math.floor(num_pts/default_colors.length);
	for (var i=0; i<default_colors.length; i++){
		for (var j=0; j<dx; j++)
			cols[dx*i + j] = default_colors[i]
	}

	// -------------- Loads the data. Replace with real data -------------
	var f = function(x){return d3.max([0,x/8]);}
	xs = $.map($(Array(num_pts-1)),function(val, i) { return tf_margin.left + tf_width*(i+1)/num_pts; });
	ys = xs.map(f);
	data = [{'x':tf_margin.left,'y':0}];// [{"x":tf_margin.left,"y":tf_height}]
	xs.forEach(function(_,i){
		data[i+1] = {'x':xs[i],'y':ys[i]};
	})
	data.push({'x':tf_width+tf_margin.left,'y':0})	
	// ------------------------------------------------------------------
	results = data;


	transfer.selectAll('*').remove();		
	build_plot();
	draw_legend(18);	
	build_palette();
	reset_phong();
}

function build_palette() {
	// BUild palette selector
	var selector = 
	  d3.select('#interpolate_select')  	
		.style('top',(height + tf_height + 40) + "px" )
	    .style('left',(width / 3 + tf_width / 2 + tf_margin.left) + "px")

	var select = d3.select('#palette')  
	  	.attr('class','select')
	    .on('change',change_palette)    
	    .property("selected", function(d){ return d === 'Rainbow'; })

	var options = select
	  .selectAll('option')
		.data(interpolators).enter()
		.append('option')
			.text(function (d) { return d; })
			.property('selected',d => d=="Rainbow")

	d3.select(".selector button").on('mousedown',reset_transfer_function);
}


function build_plot() {
	// transfer.selectAll('g, defs').remove();

	result = result.sort(function(a, b) { return  a.x - b.x; })

	x.domain(d3.extent(result, d => d.x));
	y.domain(d3.extent(result, d => d.y));

	var area = d3.line()
		.curve(d3.curveMonotoneY)
	    .x(function(d) { return x(d.x); })
	    .y(function(d) { return y(d.y); })

	var defs = transfer.append("defs");

	var gradient = defs.append("linearGradient")
	   .attr("id", "svgGradient")
	   .attr("x1", "0%")
	   .attr("x2", "100%")
	   .attr("y1", "0%")
	   .attr("y2", "0%")


	pts.forEach(function(pt,i){
		gradient.append("stop")
		   .attr('class', 'start')
		   .attr("offset", percent(pt) + "%")
		   .attr("stop-color", cols[i])
		   .attr("stop-opacity", getOpacity(pt));
	})

 	transfer.append('g').attr('id','filled_area')
			.append('path')
			.datum(result)
			.attr('d',area)		  
			.style('fill','url(#svgGradient)')
			.style('stroke',default_col)
			.style('stroke-width',0.5)
			.call(d3.drag()
				.on("drag", function(d) {
				    var event = d3.mouse(this);
					this.setAttribute('x',event[0])
					this.setAttribute('y',event[1])

					// console.log(event[0])
					if (event[0] < tf_width - tf_margin.right && event[0] > tf_margin.left){
						cnt = 0; pts.forEach(function(d,i){ if (d < event[0]){ cnt = i} });											
						pts = pts.slice(0,cnt).concat([event[0]]).concat(pts.slice(cnt+1));
						cols = cols.slice(0,cnt).concat([selected_col]).concat(cols.slice(cnt+1));																	
						setGUIColors();						
						transfer.selectAll('defs').remove();		 
						build_plot();
					}  
			    })
			    .on("end",function(){
			    	transfer.selectAll('g,defs').remove();
			    	build_plot();	
			    })
			)

	transfer.selectAll('circle')
			.data(result)
			.enter()
			.append('circle')
			.attr('cx',d=>x(d.x))
			.attr('cy',d=>y(d.y))
			.attr('r',2)
			.attr('fill', default_col)
			.style('z-index',2)
			.call(d3.drag()
				.on("drag", function(d,i){
					var event = d3.mouse(this);
					event[0] = x.invert(event[0]);
					event[1] = y.invert(event[1]);
					// console.log(event)
					var dx = toolbar_width/2 - tf_width/2,
						dy = toolbar_height/2 - tf_height/2
					if (i != 0 && i != result.length - 1 
						&& event[1] > y.domain()[0] && event[1] < y.domain()[1]){
						result[i] = {'x':event[0],'y':event[1]}	
						transfer.selectAll('g').remove();
						build_plot();					
						this.setAttribute('cx',x(event[0]))
						this.setAttribute('cy',y(event[1]))
						setGUIColors();
						updateTextures();
					}
				})
				.on('end',function(d){
					transfer.selectAll('circle').remove();
					build_plot();
				})
			)
			.style('cursor','pointer')	

	build_palette();
}

function draw_legend(cnt) {
	var num_cols = $.map($(Array(cnt)),function(val, i) { return tf_height*i/cnt; });
	transfer.selectAll('rect').remove();
	transfer.selectAll('rect')
			.data(num_cols)
			.enter()
			.append('rect')
			.attr('x',tf_width + tf_margin.right) 
			.attr('y',d=>d)
			.attr('width',10)
			.attr('height',tf_height / (cnt-1))
			.attr('fill',d=>color(d))
			.style('cursor','pointer')
			.on('mousedown',function(d){
				selected_col = d3.rgb(color(d));
				makeCursor(color(d));			
			})			
}

function makeCursor(color) {
    
    var cursor = document.createElement('canvas'),
        ctx = cursor.getContext('2d');

    cursor.width = 16;
    cursor.height = 16;
    
    ctx.strokeStyle = color;
    
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    ctx.moveTo(2, 12);
    ctx.lineTo(2, 2);
    ctx.lineTo(12, 2);
    ctx.moveTo(2, 2);
    ctx.lineTo(30, 30)    
    ctx.stroke();
    
    transfer_func.style.cursor = 'url(' + cursor.toDataURL() + '), auto';
}



function change_palette() {
	selectValue = d3.select('select').property('value')
	color = d3.scaleSequential(d3["interpolate" + selectValue]).domain([tf_height,0]);
	draw_legend(18);
	build_dial_colorbar(18);
};

function setLighting() {
	var event = d3.mouse(this);

	var x_coord = -(event[0]-cx) / 2,
		y_coord =  (event[1]-cy) / 2,
		r = Math.sqrt(x_coord**2 + y_coord**2);

	var dial = d3.select('#xy-dial');

	if (r < dial.attr('r') / 2){

		sunDirection[1] = x_coord;
		sunDirection[0] = y_coord;

		var toolbar = d3.select('svg.toolbar');
		toolbar.selectAll('.dial-knob')
			   .attr('cx',event[0])
			   .attr('cy',event[1])
	}
}

function moveCursor() {
	var event = d3.mouse(this);

	var y_coord =  (event[1]-cy) / 2;		
	var dial = d3.select('#xy-dial');

	if (Math.abs(y_coord) < dial.attr('r') / 2){
		sunDirection[2] = -y_coord;
		var toolbar = d3.select('svg.toolbar');
		toolbar.selectAll('.cursorbar').attr('y',event[1]);
	}		

}

function build_phong_lighting_dials() {
	var toolbar = d3.select('svg.toolbar');
	toolbar.append('text')
	       .text('Phong Lighting')
	       .attr('x',cx - 40)
	       .attr('y',cy - 55)
	       .attr('class','tbl-bold')


	var dial_gradient = toolbar.append('defs')
		   .append('radialGradient')
		   .attr('id','dial')
		   .attr('cx','50%').attr('cy','50%').attr('cr','50%').attr('fx','50%').attr('fy','50%')
	dial_gradient.append('stop')
			.attr('offset','0%').style('stop-color','#999b9ede')			
	dial_gradient.append('stop')
			.attr('offset','85%').style('stop-color','#222222')
	dial_gradient.append('stop')
			.attr('offset','100%').style('stop-color','#333333')
	var dial = toolbar.append('circle')
			.attr('id','xy-dial')
			.attr('fill','url(#dial)')
			.attr('cx', cx)
			.attr('cy',cy)
			.attr('r',35)
			.call(d3.drag().on('drag',setLighting))

	build_dial_colorbar(25,cx-3,cy);

	// Build Axis Legend Across Dial
	toolbar.append('rect')
			.attr('x',cx-32.5)
			.attr('y',cy)
			.attr('width',65)
			.attr('height',0.5)
	toolbar.append('text').classed('axis',true)
		   .attr('x',cx-32).attr('y',cy+2).text('left')
	toolbar.append('text').classed('axis',true)
		   .attr('x',cx+20).attr('y',cy+2).text('right')
		   
	toolbar.append('rect')
			.attr('x',cx)
			.attr('y',cy-32.5)
			.attr('width',0.5)
			.attr('height',65)
	toolbar.append('text').classed('axis',true)
		   .attr('y',cy-32).attr('x',cx-7).text('back')
	toolbar.append('text').classed('axis',true)
		   .attr('y',cy+32).attr('x',cx-7).text('front')

	toolbar.append('circle')
			   .attr('class','dial-knob')
			   .attr('cx',cx+sunDirection[0])
			   .attr('cy',cy+sunDirection[1])
			   .attr('r',3)
			   .style('fill','#3ba1d6')
			   .style('cursor','pointer')
			   .call(d3.drag().on('drag',setLighting))
	
	var z_axis = toolbar.append('rect')
						.attr('x',cx+60)
						.attr('y',cy-40)
						.attr('height',80)
						.attr('width',10)
						.style('fill','#6f7172')
						.call(d3.drag().on('drag',moveCursor))

	cursorbar = d3.scaleLinear().domain([-r/2.2,r/2]).range([cy-40,cy+40]);
	toolbar.append('rect').attr('x',cx+60).attr('y',cursorbar(0))
						  .attr('width',10).attr('height',0.5)
	var cursor = toolbar.append('rect')
						.attr('class','cursorbar')
						.attr('x',cx+60-5)
						.attr('y',cursorbar(sunDirection[2]))
						.attr('width',20)
						.attr('height',5)
						.style('fill','#3ba1d6')
						.style('cursor','pointer')
						.call(d3.drag().on('drag',moveCursor))

	toolbar.append('text').classed('axis',true)
		   .attr('x',cx+60+15).attr('y',cy-40+5).text('top')
	toolbar.append('text').classed('axis',true)
		   .attr('x',cx+60+12).attr('y',cy+40-5).text('down')

	// Sun Direction Labels
	toolbar.append('text')
		   .attr('x',cx-11)
		   .attr('y',cy+50)
		   .text('Sun XY')
		   .attr('class','axis')
	toolbar.append('text')
		   .attr('x',cx+60-5)
		   .attr('y',cy+50)
		   .text('Sun Z')
		   .attr('class','axis')


}

function build_dial_colorbar(cnt) {
	var toolbar = d3.select('svg.toolbar');
	var colorbar = d3.scaleSequential(d3['interpolate'+selectValue]).domain([cy-40,cy+40])
	var num_cols = $.map($(Array(cnt)),function(val, i) { return cy-40 + 80*i/cnt; });
	toolbar.selectAll('g.colorbar').remove();

	toolbar.append('g').attr('class','colorbar')
			.selectAll('rect')
			.data(num_cols)
			.enter()
			.append('rect')
			.classed('colorbar',true)
			.attr('x',cx-70) 
			.attr('y',function(d){
				return d;
			})
			.attr('width',10)
			.attr('height',5)
			.attr('fill',d=>colorbar(d))
			.style('cursor','pointer')
			.on('mousedown',function(d){
				var selected = d3.rgb(colorbar(d));
				sunIntensity[0] = selected.r / 255;
				sunIntensity[1] = selected.g / 255;
				sunIntensity[2] = selected.b / 255;
			})

	// Lighting type text
	toolbar.append('text')
		   .attr('x',cx-70-12)
		   .attr('y',cy+50)
		   .text('Sun Color')
		   .attr('class','axis')
		   .attr('id','colorbar_lbl')

}

function reset_phong() {
	sunDirection = sunIntensity = [1,1,1];
	var toolbar = d3.select('svg.toolbar');
	toolbar.selectAll('.cursorbar').style('y',cursorbar(0));
	toolbar.selectAll('.dial-knob').style('cx',cx).style('cy',cy);
	build_dial_colorbar(18);	
}

//  For Getting Color values from Transfer Functions
function linearInterpolate(x,y) {
	return (x + y) / 2;
}

function getOpacity(value) {
	var i = d3.min([bisect.left(result, value), result.length-2])	
	return linearInterpolate(result[i].y, result[i+1].y) / d3.max(result, d => d.y);	
}

function getColor(value) {
	var i = d3.min([bisectColor.left(pts, value), pts.length-2])	
	var r = Math.round(linearInterpolate(cols[i].r, cols[i+1].r)),
		g = Math.round(linearInterpolate(cols[i].g, cols[i+1].g)),
		b = Math.round(linearInterpolate(cols[i].b, cols[i+1].b));
		o = Math.round(getOpacity(value)*100)/100;
		if (o == undefined){
			console.log('bad value: ' + value)
			o = 1.0;
		}
	return d3.rgb(r,g,b,o);
}

function setGUIColors() {
	var colors = xs.slice(0,-1).map(getColor);
	colors.forEach(function(d,i){
		for (var idx=0; idx<guiControlss.length; idx++){
			guiControlss[idx]['stepPos'+i] = xs[i] / tf_width;
			guiControlss[idx]['color'+i] = rgb2rgb(d);
		}
	})	
	updateTextures();
}

function rgb2rgb(val,o) {
	return "rgba(" + val.r + "," + val.g + "," + val.b + "," + val.opacity + ")";
}

function rgb2hex(val) {
    var rgb = val.b | (val.g << 8) | (val.r << 16);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
}

function getOpacities() {
	return xs.slice(0,-1).map(getOpacity);
}

