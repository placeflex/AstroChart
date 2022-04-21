import Zodiac from './zodiac'
import AspectCalculator from './aspect'
import Transit from './transit'
import { 
	validate
	, radiansToDegree
	, getEmptyWrapper
	, getPointPosition
	, getRulerPositions
	, getDescriptionPosition
	, getDashedLinesPositions
	, assemble } from './utils'
import SVG from './svg'
import { Settings } from './settings'
    
	/**
	 * Radix charts.
	 * 
	 * @class
	 * @public
	 * @constructor
 	 * @param {this.settings.SVG} paper 
	 * @param {int} cx
	 * @param {int} cy
	 * @param {int} radius
	 * @param {Object} data
	 */
	class Radix {
		settings: Settings
		data: any
		paper: SVG
		cx: number
		cy: number
		radius: number
		locatedPoints: any[]
		rulerRadius: number
		pointRadius: number
		toPoints: any
		shift: number
		universe: Element
		context: this
		constructor( paper: SVG, cx: number, cy: number, radius: number, data: Object, settings: Settings ){
			this.settings = settings
			// Validate data
			var status = validate(data);		 		
			if( status.hasError ) {										
				throw new Error( status.messages.join(' | ') );
			}
			
			this.data = data;								
			this.paper = paper; 
			this.cx = cx;
			this.cy = cy;
			this.radius = radius;
			
			// after calling this.drawPoints() it contains current position of point
			this.locatedPoints = [];
			this.rulerRadius = ((this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO)/this.settings.RULER_RADIUS);
			this.pointRadius = this.radius - (this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO + 2*this.rulerRadius + (this.settings.PADDING * this.settings.SYMBOL_SCALE));
						
			//@see aspects()
			//@see setPointsOfInterest() 
			this.toPoints = JSON.parse(JSON.stringify(this.data.planets)); // Clone object
										
			this.shift = 0;		
			if(this.data.cusps && this.data.cusps[0]){
				var deg360 = radiansToDegree(2*Math.PI);
				this.shift = deg360 - this.data.cusps[0];	
			}	
			
			// preparing wrapper for aspects. It is the lowest layer
			var divisionForAspects = document.createElementNS(this.paper.root.namespaceURI, "g");
			divisionForAspects.setAttribute('id', this.paper.root.id + "-" + this.settings.ID_ASPECTS);
			this.paper.root.appendChild( divisionForAspects );
					
			this.universe = document.createElementNS(this.paper.root.namespaceURI, "g");
			this.universe.setAttribute('id', this.paper.root.id + "-" + this.settings.ID_RADIX);
			this.paper.root.appendChild( this.universe );														
							
			this.context = this;
		};

		/**
	 * Draw background
	 */
	drawBg(){				
		var universe = this.universe;	
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_BG, this.paper.root.id);	
		
		var LARGE_ARC_FLAG = 1;	
		var start = 0; //degree
		var end = 359.99; //degree 				
		var hemisphere = this.paper.segment( this.cx, this.cy, this.radius-this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO, start, end, this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO, LARGE_ARC_FLAG);
		hemisphere.setAttribute("fill", this.settings.STROKE_ONLY ? "none" : this.settings.COLOR_BACKGROUND);				
		wrapper.appendChild( hemisphere );					
	};

	/**
	 * Draw universe.
	 */
	 drawUniverse(){
		var universe = this.universe;		
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_SIGNS, this.paper.root.id);
						
		// colors 
        for( var i = 0, step = 30, start = this.shift, len = this.settings.COLORS_SIGNS.length; i < len; i++ ){ 
        	        	        	       	        	                	        	        	     
        	var segment = this.paper.segment( this.cx, this.cy, this.radius, start, start+step, this.radius-this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO);        	        	
					segment.setAttribute("fill", this.settings.STROKE_ONLY ? "none" : this.settings.COLORS_SIGNS[i]);
					segment.setAttribute("id", this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_SIGNS + "-" + i)
        	segment.setAttribute("stroke", this.settings.STROKE_ONLY ? this.settings.CIRCLE_COLOR: "none");
 					segment.setAttribute("stroke-width", this.settings.STROKE_ONLY ? '1' : '0');
        	wrapper.appendChild( segment );
        	        	        	        	        	        	               	
					start += step;
        };
                       
        // signs
        for( var i = 0, step = 30, start = 15 + this.shift, len = this.settings.SYMBOL_SIGNS.length; i < len; i++ ){ 
        	var position = getPointPosition( this.cx, this.cy, this.radius - (this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO)/2, start, this.settings);       	        	                	
        	wrapper.appendChild( this.paper.getSymbol( this.settings.SYMBOL_SIGNS[i], position.x, position.y));        	        	        	               		
			start += step;
        }        
	};


	/**
	 * Draw points
	 */
	 drawPoints = function(){
		if(this.data.planets == null){
			return;
		}
				
		var universe = this.universe;		
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_POINTS, this.paper.root.id);
					
		var gap = this.radius - (this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO + this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO);								
		var step = ( gap - 2*(this.settings.PADDING* this.settings.SYMBOL_SCALE) ) / Object.keys(this.data.planets).length;
					
		var pointerRadius = this.radius - (this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO + this.rulerRadius);
		var startPosition, endPosition;
		
		for (var planet in this.data.planets) {
 		   if (this.data.planets.hasOwnProperty( planet )) {
 		   	 		   	 		   		 		   		
 		   		var position = getPointPosition( this.cx, this.cy, this.pointRadius, this.data.planets[planet][0] + this.shift, this.settings); 		   	
 		   		var point = {name:planet, x:position.x, y:position.y, r:(this.settings.COLLISION_RADIUS * this.settings.SYMBOL_SCALE), angle:this.data.planets[planet][0] + this.shift, pointer:this.data.planets[planet][0] + this.shift}; 		   		 		   		 		   		 		  
 		   		this.locatedPoints = assemble(this.locatedPoints, point, {cx:this.cx, cy:this.cy, r:this.pointRadius}, this.settings);   
 		   	} 		
		}
		
		if( this.settings.DEBUG ) console.log( "Radix count of points: " + this.locatedPoints.length );
		if( this.settings.DEBUG ) console.log( "Radix located points:\n" + JSON.stringify(this.locatedPoints) );
											
		this.locatedPoints.forEach(function(point: any){
						        
        	// draw pointer        	
        	startPosition = getPointPosition( this.cx, this.cy, pointerRadius, this.data.planets[point.name][0] + this.shift, this.settings);
        	endPosition = getPointPosition(this.cx, this.cy, pointerRadius-this.rulerRadius/2, this.data.planets[point.name][0] + this.shift, this.settings );
        	var pointer = this.paper.line( startPosition.x, startPosition.y, endPosition.x, endPosition.y);
        	pointer.setAttribute("stroke", this.settings.CIRCLE_COLOR);		 
			pointer.setAttribute("stroke-width", (this.settings.CUSPS_STROKE * this.settings.SYMBOL_SCALE));
        	wrapper.appendChild(pointer);
        	
        	// draw pointer line
        	if( !this.settings.STROKE_ONLY && (this.data.planets[point.name][0] + this.shift) != point.angle){	        	
	        	startPosition = endPosition;
	        	endPosition = getPointPosition(this.cx, this.cy, this.pointRadius + (this.settings.COLLISION_RADIUS * this.settings.SYMBOL_SCALE), point.angle, this.settings );
	        	var line = this.paper.line( startPosition.x, startPosition.y, endPosition.x, endPosition.y);
	        	line.setAttribute("stroke", this.settings.LINE_COLOR);	
	        	line.setAttribute("stroke-width", 0.5 * (this.settings.CUSPS_STROKE * this.settings.SYMBOL_SCALE));        	
	        	wrapper.appendChild(line);
        	}        	
        	
        	// draw symbol						
			var symbol = this.paper.getSymbol(point.name, point.x, point.y);
        	symbol.setAttribute('id', this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_POINTS + "-" + point.name);        	
        	wrapper.appendChild( symbol );
        	        	        	        
        	// draw point descriptions
        	var textsToShow = [(Math.round(this.data.planets[point.name][0]) % 30).toString()];
        	
        	var zodiac = new Zodiac(this.data.cusps);
        	
        	if(this.data.planets[point.name][1] && zodiac.isRetrograde(this.data.planets[point.name][1])){
        		textsToShow.push("R");
        	}else{
        		textsToShow.push("");
        	}
        	textsToShow = textsToShow.concat(zodiac.getDignities({"name":point.name, "position":this.data.planets[point.name][0]}, this.settings.DIGNITIES_EXACT_EXALTATION_DEFAULT, this.settings).join(","));        	
        	        	        	        	        	        	      	        	         	        	        	      
        	var pointDescriptions = getDescriptionPosition(point, textsToShow, this.settings);         	
        	pointDescriptions.forEach(function(dsc){        		        		        		     
				wrapper.appendChild( this.paper.text( dsc.text, dsc.x, dsc.y, this.settings.POINTS_TEXT_SIZE, this.settings.SIGNS_COLOR) );	        		
        	}, this);
        	        	        	        	       	              	        	          			
		}, this);		
	};
	
	drawAxis = function(){
		if(this.data.cusps == null){
			return;
		}
		
		var universe = this.universe;
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_AXIS, this.paper.root.id);
		
		var axisRadius = this.radius + ((this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO)/4);
					
		var AS = 0;
		var IC = 3;
		var DC = 6;
		var MC = 9;
		var overlapLine, 
		startPosition, 
		endPosition, 
		line,
		lines;
				
		[AS,IC,DC,MC].forEach( function(i) {
			let textPosition;
			// overlap 												
			startPosition = getPointPosition( this.cx, this.cy, this.radius, this.data.cusps[i] + this.shift, this.settings);
			endPosition = getPointPosition( this.cx, this.cy, axisRadius, this.data.cusps[i] + this.shift, this.settings);
			overlapLine = this.paper.line( startPosition.x, startPosition.y, endPosition.x, endPosition.y); 				 			
			overlapLine.setAttribute("stroke", this.settings.LINE_COLOR);		 				 				 		
			overlapLine.setAttribute("stroke-width", (this.settings.SYMBOL_AXIS_STROKE * this.settings.SYMBOL_SCALE));
			wrapper.appendChild( overlapLine ); 
						 				 																
			// As
		 	if(i == AS){ 
		 		// Text
		 		textPosition = getPointPosition( this.cx, this.cy, axisRadius + (20 * this.settings.SYMBOL_SCALE), this.data.cusps[i] + this.shift, this.settings);
		 		wrapper.appendChild( this.paper.getSymbol( this.settings.SYMBOL_AS, textPosition.x, textPosition.y));
		 	}
		 	 		 	 		 	 		
		 	// Ds
		 	if(i == DC){  		 		 		 		 		 		 		 
		 		// Text
		 		textPosition = getPointPosition( this.cx, this.cy, axisRadius + (2 * this.settings.SYMBOL_SCALE), this.data.cusps[i] + this.shift, this.settings);
		 		wrapper.appendChild( this.paper.getSymbol( this.settings.SYMBOL_DS, textPosition.x, textPosition.y));
		 	}
		 	 		 	
		 	// Ic
		 	if(i == IC){ 
		 		// Text
		 		textPosition = getPointPosition( this.cx, this.cy, axisRadius + (10 * this.settings.SYMBOL_SCALE), this.data.cusps[i] - 2 + this.shift, this.settings);
		 		wrapper.appendChild( this.paper.getSymbol( this.settings.SYMBOL_IC, textPosition.x, textPosition.y));
		 	}
		 	
		 	// Mc
		 	if(i == MC){ 		 		 		 	
		 		// Text
		 		textPosition = getPointPosition( this.cx, this.cy, axisRadius + (10 * this.settings.SYMBOL_SCALE), this.data.cusps[i] + 2 + this.shift, this.settings);
		 		wrapper.appendChild( this.paper.getSymbol( this.settings.SYMBOL_MC, textPosition.x, textPosition.y));
		 	} 
	 	}, this);
	};
	
	/**
	 * Draw cusps
	 */
	drawCusps = function(){
		if(this.data.cusps == null){
			return;
		}
		
		var startPosition, endPosition, lines, line;
		var universe = this.universe;
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_CUSPS, this.paper.root.id);
				
		var numbersRadius = this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO + (this.settings.COLLISION_RADIUS * this.settings.SYMBOL_SCALE);
		
		var AS = 0;
		var IC = 3;
		var DC = 6;
		var MC = 9;
		var mainAxis = [AS,IC,DC,MC];
											
		//Cusps
		for (var i = 0, ln = this.data.cusps.length; i < ln; i++) {
 			
 			// Draws a dashed line when an point is in the way
 			lines = getDashedLinesPositions(
 				this.cx, 
 				this.cy, 
 				this.data.cusps[i] + this.shift, 
 				this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO, 
 				this.radius - (this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO + this.rulerRadius),
 				this.pointRadius,
 				this.locatedPoints,
				this.settings
 				);
 				
 			lines.forEach(function(line){ 				
 				let newLine = this.paper.line( line.startX, line.startY, line.endX, line.endY);
 				newLine.setAttribute("stroke", this.settings.LINE_COLOR);	 				 			 				 			
 				
 				if(mainAxis.indexOf(i) != -1){ 					
					newLine.setAttribute("stroke-width", (this.settings.SYMBOL_AXIS_STROKE * this.settings.SYMBOL_SCALE));
 				}else{
					newLine.setAttribute("stroke-width", (this.settings.CUSPS_STROKE * this.settings.SYMBOL_SCALE));	 					
 				}	 			 			 	
 				 				 				 				 			 						 			 			 	
 		 		wrapper.appendChild( newLine );  				
 			}, this);	
 			 			 			 			 		 			 		 	 		
 		 	// Cup number  		 	
 		 	var deg360 = radiansToDegree( 2 * Math.PI );
 		 	var startOfCusp = this.data.cusps[i];
 		 	var endOfCusp = this.data.cusps[ (i+1)%12 ];
 		 	var gap = endOfCusp - startOfCusp > 0 ? endOfCusp - startOfCusp : endOfCusp - startOfCusp + deg360;
 		 	var textPosition = getPointPosition( this.cx, this.cy, numbersRadius, ((startOfCusp + gap/2) % deg360) + this.shift, this.settings );
 		 	wrapper.appendChild( this.paper.getSymbol( (i+1).toString(), textPosition.x, textPosition.y )); 		 	  		 			  		 			
		}						      	      
	};
	
	/**
	 * Draw aspects
	 * @param{Array<Object> | null} customAspects - posible custom aspects to draw;
	 */
	aspects = function( customAspects: any ){
															
		var aspectsList = customAspects != null && Array.isArray(customAspects) ? 
						  customAspects : 
						  new AspectCalculator( this.toPoints ).radix( this.data.planets );
						  						  						 						  										
		var universe = this.universe;		
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_ASPECTS, this.paper.root.id);
								
		var duplicateCheck = [];
		
		for(var i = 0, ln = aspectsList.length; i < ln; i++){
			
			var key 		= aspectsList[i].aspect.name + "-" + aspectsList[i].point.name + "-" + aspectsList[i].toPoint.name;
			var opositeKey	= aspectsList[i].aspect.name + "-" + aspectsList[i].toPoint.name + "-" + aspectsList[i].point.name;									
			if( duplicateCheck.indexOf( opositeKey ) == -1 ){			
				duplicateCheck.push( key );
																			
				var startPoint = getPointPosition(this.cx, this.cy, this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO, aspectsList[i].toPoint.position + this.shift, this.settings );
				var endPoint = getPointPosition(this.cx, this.cy, this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO, aspectsList[i].point.position + this.shift, this.settings);
									
				var line = this.paper.line( startPoint.x, startPoint.y, endPoint.x, endPoint.y);       		       		       
				line.setAttribute("stroke", this.settings.STROKE_ONLY ? this.settings.LINE_COLOR : aspectsList[i].aspect.color);		 				 				 		
				line.setAttribute("stroke-width", (this.settings.CUSPS_STROKE * this.settings.SYMBOL_SCALE));    
				
				line.setAttribute("data-name", aspectsList[i].aspect.name);
				line.setAttribute("data-degree", aspectsList[i].aspect.degree);				
				line.setAttribute("data-point", aspectsList[i].point.name);   		
				line.setAttribute("data-toPoint", aspectsList[i].toPoint.name);
				line.setAttribute("data-precision", aspectsList[i].precision);
				
				wrapper.appendChild( line );			
			}
		}
										     
		return this.context;
	};
	
	/**
	 * Add points of interest for aspects calculation
	 * @param {Obect} points, {"As":[0],"Ic":[90],"Ds":[180],"Mc":[270]} 
	 * @see (this.settings.AspectCalculator( toPoints) )
	 */
	addPointsOfInterest = function( points: { [x: string]: any } ){
		
		for(const point in points){
			this.toPoints[ point ] = points[point]; 	
		}
						
        return this.context;	
	};
		
	drawRuler = function drawRuler(){
		
		var universe = this.universe;		
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_RULER, this.paper.root.id);
				
		var startRadius = (this.radius - (this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO + this.rulerRadius));		
		var rays = getRulerPositions( this.cx, this.cy, startRadius, startRadius + this.rulerRadius, this.shift, this.settings);
		
		rays.forEach(function( ray ){
			var line = this.paper.line( ray.startX, ray.startY, ray.endX, ray.endY);       		       		       
			line.setAttribute("stroke", this.settings.CIRCLE_COLOR);		 				 				 		
			line.setAttribute("stroke-width", (this.settings.CUSPS_STROKE * this.settings.SYMBOL_SCALE));       		
			wrapper.appendChild( line );				
		}, this);

		var circle;			
		circle = this.paper.circle( this.cx, this.cy, startRadius);
		circle.setAttribute("stroke", this.settings.CIRCLE_COLOR);		 
		circle.setAttribute("stroke-width", (this.settings.CUSPS_STROKE * this.settings.SYMBOL_SCALE));
        wrapper.appendChild( circle );       	       	
	};
	
	/**
	 * Draw circles
	 */
	drawCircles = function drawCircles(){
	
		var universe = this.universe;		
		var wrapper = getEmptyWrapper( universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_CIRCLES, this.paper.root.id);
														
		var circle;
						      
        //indoor circle
        circle = this.paper.circle( this.cx, this.cy, this.radius/this.settings.INDOOR_CIRCLE_RADIUS_RATIO);
        circle.setAttribute("stroke", this.settings.CIRCLE_COLOR);		 
		circle.setAttribute("stroke-width", (this.settings.CIRCLE_STRONG * this.settings.SYMBOL_SCALE));		
       	wrapper.appendChild( circle );     
       	
       	//outdoor circle
		circle = this.paper.circle( this.cx, this.cy, this.radius);
		circle.setAttribute("stroke", this.settings.CIRCLE_COLOR);		 
		circle.setAttribute("stroke-width", (this.settings.CIRCLE_STRONG * this.settings.SYMBOL_SCALE));
        wrapper.appendChild( circle );
       	
       	//inner circle
       	circle = this.paper.circle( this.cx, this.cy, this.radius-this.radius/this.settings.INNER_CIRCLE_RADIUS_RATIO);
       	circle.setAttribute("stroke", this.settings.CIRCLE_COLOR);		 
		circle.setAttribute("stroke-width", (this.settings.CIRCLE_STRONG * this.settings.SYMBOL_SCALE));
        wrapper.appendChild( circle );  	       	       	       	       	   
	};
			
	/**
	 * Display transit horoscope
	 * 
	 * @param {Object} data
	 * @example
	 *	{
	 *		"planets":{"Moon":[0], "Sun":[30],  ... },
	 *		"cusps":[300, 340, 30, 60, 75, 90, 116, 172, 210, 236, 250, 274],	*		 
	 *	} 
	 * 
	 * @return {this.settings.Transit} transit
	 */
	transit = function( data: any ){
		
		// remove axis (As, Ds, Mc, Ic) from radix
		getEmptyWrapper( this.universe, this.paper.root.id + "-" + this.settings.ID_RADIX + "-" + this.settings.ID_AXIS, this.paper.root.id);
		var transit = new Transit(this.context, data, this.settings);
		transit.drawBg();					
		transit.drawPoints();		
		transit.drawCusps();	
		transit.drawRuler();			
		transit.drawCircles();	
		return transit; 			
	};
} 
	
	
		
	
	
	

export default Radix;