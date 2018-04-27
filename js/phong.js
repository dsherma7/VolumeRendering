/*
	Functions for building the controls to set 
	the Phong Lighting's color and direction.
*/ 

// For the Phong Lighting Dials
var cx = toolbar_width/2 + 15,
	cy = toolbar_height * 2 - 10,
	r  = 35;

var cursorbar = d3.scaleLinear();

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