jQuery(document).ready(function ($){
    
    var $body = $('body');
    
    //IS MOBILE BOOLEAN
    var ismobile = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    
    //IS IE
    var isIE = jQuery.browser.msie;
    
    //MOUSE||TOUCH BINDINGS
    var mouseDownBind = "mousedown";
    var mouseMoveBind = "mousemove";
    var mouseUpBind = "mouseup";
    var mouseOverBind = "mouseover";
    var mouseOutBind = "mouseout";
    var clickBind = "click";
    var refreshRate = 10;
    
    if(ismobile){
    	refreshRate = 15;
        mouseDownBind = "vmousedown";
        mouseMoveBind = "vmousemove";
        mouseUpBind = "vmouseup";
        mouseOverBind = "vmouseover";
        mouseOutBind = "vmouseout";
        clickBind = "vclick";
    }
	var ignore2 = 0, ignored, ignored1 ;
    
    var Expo360obj = function(parameters){
    	this.xml = parameters.xml;
    	this.parameters = parameters;
    	
		this.singleImage = false;	    	
		this.focusable = true;
		
		//Image number control
		this.oldImage = -1, this.currentImage = 0, this.numImages;
    	
    	//Rotation Control
    	this.degrees = 0, this.speedDeg = 0, this.speedInc = 0, this.speedDegDefault = 0;
    	
    	//State control
    	this.dragging = false, this.panning = false;
    	
    	//Mouse actions control
    	this.positionClickedX, this.degWhenClicked;
    	this.currentX, this.oldDif;
    	
    	this.buttonsDisabledAlpha = 0.3;
    	
    	//PADDING AND ZOOM CONTROL VARS
    	this.viewLeft = 0, this.viewTop=0;
    	this.currentWidth, this.currentHeight;
    	this.zoomWhenPad = 1;
    	
    	
    	//MAIN EASE and INERTIA
    	this.ease = 5, this.inertia = 1;
    	
    	//MOUSEWHEEL
    	this.mouse_wheel_function = "zoom", this.mouse_wheel_speed = 1;
    	
    	//DRAGGING STATE
    	this.draggingZoomSlider = false, this.draggingPlaybackSlider = false;
    	
    	//SLIDERS WIDTH
        this.sliderWidth = 0, this.playbackSliderWidth=0;
        
        //ZOOM CONTROL
    	this.maxZoom, this.minZoom, this.zoomEase, this.zoomSpeed, this.zoom = 1, this.zoomCurrent = 1, this.focusTimer;
    	this.focused = false;
    	
    	//AUTOPLAY
    	this.autoplay = false, this.autoplaySpeed;
    	
    	//MODE
    	this.mode = "rotate";
    	
    	//REVERSE
    	this.reverse = false;
    	
    	//SIZING AND POSITIONING
    	this.width, this.height;
    	this.iniWidth, this.iniHeight;
    	this.posX=0, this.posY=0;
    	
    	//ZOOM WINDOW
    	this.include_zoom_window=false;
    	this.zoom_window_width, this.zoom_window_height, this.zoomWindowEnabled=true;
        this.viewLeftCurrent = 0, this.viewTopCurrent=0, this.paddingEase = 5;
    	
    	
    	//FROM XML
    	this.imagesPath, this.imagesBigPath, this.hotspotsImagesPath, this.grab_hand_cursor = false, this.loading_text;
    	this.imagesSrc = Array(), this.hotspots = Array(), this.hotspotsButtons = Array(), this.hotspotsTooltips = Array(), this.$hotspotsSmall;
    	this.images = Array(), this.zoom_window_images = Array();
    	this.controls = Array(), this.controlsExtras = Array();
    	this.include_tooltips = false;
    	
    	this.panel_options = Object();
    	this.loading_options = new Object();
    	this.tooltips_options = new Object();
    	this.zoom_window_options = new Object();
    	this.tooltips_texts = new Object();
    	
    	
    	//HOLDERS
    	this.$bigImage = null;
    	this.$zoomSlider = null, this.$zoomMinus = null, this.$zoomPlus = null, this.$playbackSlider = null, this.$panButton = null, this.$rotateButton = null;
    	this.$root = $(parameters.where);
    	this.$main = $("<div></div>");
    	this.$view = $("<div></div>");
    	this.$imagesHolder = $("<div></div>");
        this.$bigContent = $("<div></div>");
    	this.$panel = $("<div></div>");
    	this.$loader = $("<div></div>");
    	this.$zoomWindow, this.$zoomWindowBox, this.$zoomClickable;
    	
    	this.$loadingText = $("<div></div>");
    	
    	this.$autoplayPlay, this.$autoplayPause;
    	
    	//SLIDER
    	this.sliderFrom, this.sliderTo, this.sliderX;
     	this.posIniX, this.posIniY;
     	
     	this.zoomBtnInterval = 0;
     	
     	this.goToDegree = false, this.showedHotspots = false, this.focusedNum = -1, this.smallTweenTime =200;
    	this.currentHotspots = Array(), this.currentHotspotsTooltips = Array();
     	
    	/*this.relativeExcessW;
    	this.relativeExcessH;
    	var panPrevLeft, panPrevTop, panPrevX, panPrevY;  
    	var $smallHotspot, smallWidth, smallHeight;
    	var hotspotsTimer;
    	var focusing = false;
    	var focused = false;
    	var goToDegreeNum, 
        var $initScrollObj;
        var initScrollPrevLeft, initScrollPrevTop, initScrollPosX, initScrollPosY;
        var initwinWidth, initwinHeight, eleWidth, eleHeight;*/
    };
    
    Expo360obj.prototype = {
    	_this:this,
    	///////////////////////////////////////////////
    	// LOAD XML	
    	loadXml: function(){
    		var obj = this;
    		$.ajax({
	    	    type: "GET",
	    	    url: obj.xml,
	    	    dataType: "xml",
	    	    success: function(xml){obj.parseXml(xml);}
	    	})
    	},
    	parseXml: function(xml){
    		var _this = this;
    		var configuration = $(xml).find("ProductViewer");
    		
    		this.width = parseInt($(configuration).find("viewWidth").text(), 10);
    		this.height = parseInt($(configuration).find("viewHeight").text(), 10);
    		
    		this.ease = parseFloat($(configuration).find("ease").text(), 10);
    		this.paddingEase = parseFloat($(configuration).find("padding_ease").text(), 10);
    		this.inertia = parseFloat($(configuration).find("inertia").text(), 10);
    		
    		this.mouse_wheel_function = $(configuration).find("mouse_wheel_function").text();
    		this.mouse_wheel_speed = parseFloat($(configuration).find("mouse_wheel_speed").text(), 10);
    		
    		this.zoomSpeed = parseFloat($(configuration).find("zoomSpeed").text(), 10);
    		this.zoomEase = parseInt($(configuration).find("zoomEase").text(), 10);
    		
    		if($(configuration).find("maxZoom").text() == "auto")
    			this.maxZoom = "auto";
    		else
    			this.maxZoom = parseFloat($(configuration).find("maxZoom").text(), 10);
    		
    		if($(configuration).find("reverse").text() == "true")
    			this.reverse = true;
    		
    		if($(configuration).find("autoplay").text() == "true")
    			this.autoplay = true;
    			
            if($(configuration).find("grab_hand_cursor").text() == "true")
                this.grab_hand_cursor = true;
    			
    		this.autoplaySpeed = parseInt($(configuration).find("autoplaySpeed").text(), 10);
    		
    		if($(configuration).find("include_tooltips").text() == "true")
    			this.include_tooltips = true;
    		if($(configuration).find("include_zoom_window").text() == "true")
    			this.include_zoom_window = true;
    		
    		
    		//OPTIONS PANEL
    		var panel_xml = $(configuration).find("panel");
    		
            this.panel_options.width = parseInt($(panel_xml).find("width").text(), 10);
            this.panel_options.height = parseInt($(panel_xml).find("height").text(), 10);
            this.panel_options.xOffset = parseInt($(panel_xml).find("xOffset").text(), 10);
            this.panel_options.yOffset = parseInt($(panel_xml).find("yOffset").text(), 10);
    		this.panel_options.background_color = $(panel_xml).find("background_color").text();
    		this.panel_options.background_alpha = $(panel_xml).find("background_alpha").text();
    		this.panel_options.background_pattern = $(panel_xml).find("background_pattern").text();
            this.panel_options.round_corners = $(panel_xml).find("round_corners").text()+"px";
            this.panel_options.show = $(panel_xml).find("show").text();
            
            this.panel_options.buttons_side_margin = parseInt($(panel_xml).find("buttons_side_margin").text(), 10);
            this.panel_options.buttons_tween_time = parseInt($(panel_xml).find("buttons_tween_time").text(), 10);
            
            this.panel_options.ui_folder = $(panel_xml).find("ui_folder").text();
            
            this.panel_options.buttons_width = parseInt($(panel_xml).find("buttons_width").text(), 10);
            this.panel_options.buttons_height = parseInt($(panel_xml).find("buttons_height").text(), 10);
            this.panel_options.divider_width = parseInt($(panel_xml).find("divider_width").text(), 10);
            this.panel_options.divider_height = parseInt($(panel_xml).find("divider_height").text(), 10);
            
            this.panel_options.slider_width = $(panel_xml).find("slider_width").text();
            this.panel_options.slider_height = parseInt($(panel_xml).find("slider_height").text(), 10);
            this.panel_options.slider_background_color = $(panel_xml).find("slider_background_color").text();
            this.panel_options.slider_background_alpha = $(panel_xml).find("slider_background_alpha").text();
            this.panel_options.slider_background_pattern = $(panel_xml).find("slider_background_pattern").text();
            this.panel_options.slider_round_corners = $(panel_xml).find("slider_round_corners").text() +"px";
            
            this.panel_options.zoom_subbuttons_width = parseInt($(panel_xml).find("zoom_subbuttons_width").text(), 10);
            this.panel_options.zoom_subbuttons_height = parseInt($(panel_xml).find("zoom_subbuttons_height").text(), 10);
            this.panel_options.zoom_subbuttons_distance = parseInt($(panel_xml).find("zoom_subbuttons_distance").text(), 10);
            
            this.panel_options.dragger_width = parseInt($(panel_xml).find("dragger_width").text(), 10);
            this.panel_options.dragger_height = parseInt($(panel_xml).find("dragger_height").text(), 10);
    		
    		
    		//LOADING
    		var loading_xml = $(configuration).find("loading");
    		
    		this.loading_text = $(loading_xml).find("loading_text").text();
    		
    		this.loading_options.background_color = $(loading_xml).find("background_color").text();
    		this.loading_options.background_alpha = $(loading_xml).find("background_alpha").text();
    		this.loading_options.background_pattern = $(loading_xml).find("background_pattern").text();
    		
    		this.loading_options.text_font = $(loading_xml).find("text_font").text();
    		this.loading_options.text_size = $(loading_xml).find("text_size").text();
    		this.loading_options.text_color = $(loading_xml).find("text_color").text();
    		this.loading_options.text_span_color = $(loading_xml).find("text_span_color").text();
    		this.loading_options.text_background_color = $(loading_xml).find("text_background_color").text();
    		this.loading_options.text_background_alpha = $(loading_xml).find("text_background_alpha").text();
    		this.loading_options.text_background_pattern = $(loading_xml).find("text_background_pattern").text();
    		this.loading_options.text_background_round_corner = $(loading_xml).find("text_background_round_corner").text()+"px";
    		
    		
    		//CONTROLS
    		var controlsXml = $(configuration).find("controls");
    		$(controlsXml).find("control").each(function(index){
    			var $this = $(this);
    			
    			if($this.text() == "hyperlink")
    				_this.controlsExtras.push($this.attr("href"));
    			else
    				_this.controlsExtras.push("none");
    				
    			_this.controls.push($this.text());
    		});
    		
    		
    		//TOLTIPS TEXTS
            var tooltips_texts_xml = $(configuration).find("tooltips_texts");
            this.tooltips_texts.rotate = $(tooltips_texts_xml).find("rotate").text();
            this.tooltips_texts.pan = $(tooltips_texts_xml).find("pan").text();
            this.tooltips_texts.rotate_slider = $(tooltips_texts_xml).find("rotate_slider").text();
            this.tooltips_texts.rotate_left = $(tooltips_texts_xml).find("rotate_left").text();
            this.tooltips_texts.rotate_right = $(tooltips_texts_xml).find("rotate_right").text();
            this.tooltips_texts.reset = $(tooltips_texts_xml).find("reset").text();
            this.tooltips_texts.zoom_slider = $(tooltips_texts_xml).find("zoom_slider").text();
            this.tooltips_texts.zoom_in = $(tooltips_texts_xml).find("zoom_in").text();
            this.tooltips_texts.zoom_out = $(tooltips_texts_xml).find("zoom_out").text();
            this.tooltips_texts.hyperlink = $(tooltips_texts_xml).find("hyperlink").text();
            this.tooltips_texts.play = $(tooltips_texts_xml).find("play").text();
            this.tooltips_texts.pause = $(tooltips_texts_xml).find("pause").text();
    		
    		
    		//TOOLTIPS
    		var tooltips_xml = $(configuration).find("tooltips");
    		this.tooltips_options.text_font = $(tooltips_xml).find("text_font").text();
    		this.tooltips_options.text_size = $(tooltips_xml).find("text_size").text();
    		this.tooltips_options.text_color = $(tooltips_xml).find("text_color").text();
    		this.tooltips_options.left_right_padding = $(tooltips_xml).find("left_right_padding").text();
    		this.tooltips_options.top_bottom_padding = $(tooltips_xml).find("top_bottom_padding").text();
    		this.tooltips_options.background_color = $(tooltips_xml).find("background_color").text();
            this.tooltips_options.background_alpha = $(tooltips_xml).find("background_alpha").text();
    		this.tooltips_options.round_corners = $(tooltips_xml).find("round_corners").text()+"px";
            this.tooltips_options.fadeTime = parseInt($(tooltips_xml).find("fadeTime").text(), 10);
    		
    		
    		//ZOOM WINDOW
    		var zoom_window_xml = $(configuration).find("zoom_window");
    		this.zoom_window_options.window_width = $(zoom_window_xml).find("window_width").text();
    		this.zoom_window_options.window_height = $(zoom_window_xml).find("window_height").text();
    		this.zoom_window_options.background_color = $(zoom_window_xml).find("background_color").text();
    		this.zoom_window_options.background_alpha = $(zoom_window_xml).find("background_alpha").text();
    		this.zoom_window_options.background_pattern = $(zoom_window_xml).find("background_pattern").text();
    		this.zoom_window_options.padding = $(zoom_window_xml).find("padding").text();
    		this.zoom_window_options.selection_line_color = $(zoom_window_xml).find("selection_line_color").text();
    		this.zoom_window_options.selection_line_alpha = $(zoom_window_xml).find("selection_line_alpha").text();
    		
    		
    		//HOTSPOTS
    		this.hotspotsImagesPath = $(configuration).find("hotspotsImagesPath").text();
    		var hotspotsButtonsXml = $(configuration).find("hotspotsButtons");
    		$(hotspotsButtonsXml).find("button").each(function(index){
    			var $this = $(this);
    			
    			var obj = Object();
    			obj.id = $this.find("id").text();
    			obj.out = $this.find("out").text();
    			obj.over = $this.find("over").text();
    			obj.width = $this.find("width").text();
    			obj.height = $this.find("height").text();
    			obj.tweenTime = $this.find("tweenTime").text();
    			
    			_this.hotspotsButtons.push(obj);
    		});
    		
    		
    		//IMAGES
    		this.imagesPath = $(configuration).find("imagesPath").text();
    		this.imagesBigPath = $(configuration).find("imagesBigPath").text();
    		
    		if(this.parameters.imagesPath != undefined)
    			this.imagesPath = this.parameters.imagesPath;
    			
    		if(this.parameters.imagesBigPath != undefined)
    			this.imagesBigPath = this.parameters.imagesBigPath;
    			
    		
    		if(this.imagesBigPath == "none")
    		  this.focusable = false;
    		
    		var imagesXml = $(configuration).find("images");
    		var nImages = 0;
    		$(imagesXml).find("image").each(function(index){
    		    nImages++;
    			var $this = $(this);
    			_this.imagesSrc.push($this.attr("src"));
    			
    			var spots = $this.find("hotspot");
    			if(spots.length > 0){
    				var newArray = Array();
    				$(spots).each(function(index){
    					var $hotspot = $(this);
    					
    					var obj = Object();
    					obj.id = $hotspot.find("button_id").text();
    					obj.x = parseInt($hotspot.find("x").text(), 10);
    					obj.y = parseInt($hotspot.find("y").text(), 10);
    					obj.type = $hotspot.find("type").text();
                        obj.tooltip = $hotspot.find("tooltip").text();
    					
    					if(obj.type == "link")
    						obj.content = $hotspot.find("content").text();
    					if(obj.type == "small"){
    					    var contObj = Object();
    					    var content = $hotspot.find("content");
    					    
    					    contObj.width = $(content).find("width").text();
                            contObj.background_color = $(content).find("background_color").text();
                            contObj.background_alpha = $(content).find("background_alpha").text();
                            contObj.background_pattern = $(content).find("background_pattern").text();
                            contObj.padding = $(content).find("padding").text();
                            contObj.round_corners = $(content).find("round_corners").text()+"px";
                            contObj.html = $(content).find("html").text();
                            contObj.fadeTime = parseInt($(content).find("fadeTime").text(), 10);
                            
                            obj.content = contObj;
    					}
    					if(obj.type == "big"){
                            var contObj = Object();
                            var content = $hotspot.find("content");
                            
                            contObj.background_color = $(content).find("background_color").text();
                            contObj.background_alpha = $(content).find("background_alpha").text();
                            contObj.background_pattern = $(content).find("background_pattern").text();
                            contObj.html = $(content).find("html").text();
                            contObj.close_button_id = $(content).find("close_button_id").text();
                            contObj.closeOffsetX = parseInt($(content).find("closeOffsetX").text(), 10);
                            contObj.closeOffsetY = parseInt($(content).find("closeOffsetY").text(), 10);
                            contObj.fadeTime = parseInt($(content).find("fadeTime").text(), 10);
                            
                            obj.content = contObj;
                        }
    					
    					newArray.push(obj);
    				});
    				_this.hotspots.push(newArray);
    			}
    			else
    				_this.hotspots.push(null);
    		});
    		if(nImages == 1)
    		  this.singleImage = true;
    		  
            this.makeView();
    	}
    	///////////////////////////////////////////////
    	,
    	
    	///////////////////////////////////////////////
    	// MAKE COMPONENTS
    	makeView: function(){
    		//Main holder
    		var plus = this.panel_options.height + this.panel_options.yOffset;
    		if(plus < 0)
    		  plus = 0;
    		this.$main.css({
    			"position":"relative",
    			"width":this.width+"px",
    			"height": (this.height+plus)+"px",
    			"margin":"0",
    			"padding":"0",
    			"top":"0",
    			"left":"0",
    			"text-align":"center"
    		});
    		
    		//big content holder
            this.$bigContent.css({
                "position":"absolute"
            });
    		
    		//images holder
    		this.$imagesHolder.css({
    			"position":"absolute"
    		});
    		
    		//zoom window
    		if(this.include_zoom_window){
    			this.$zoomWindow = $("<div></div>");
    			this.$zoomWindowBox = $("<div></div>");
    			this.$zoomClickable = $("<div></div>");
                var $filler = $("<div></div>");
    			this.$zoomWindow.css({
    				"position": "absolute",
    				"top": "5px",
    				"left": "5px",
    				"padding": this.zoom_window_options.padding+"px",
    				"opacity":"0",
    				"display":"none"
    			});
    			this.$zoomClickable.css({
    			   "width":"100%",
    			   "height":"100%",
    			   "position":"absolute" 
    			});
    			this.$zoomWindowBox.css({
    				"position": "absolute",
    				"border":"solid 1px "+this.zoom_window_options.selection_line_color,
    				"opacity":this.zoom_window_options.selection_line_alpha
    			});
    			$filler.css({
    			   "width":"100%",
    			   "height":"100%",
    			   "background-color":"#ffffff",
    			   "opacity":"0"
    			});
    			this.$zoomWindowBox.append($filler);
    			this.$zoomWindow.append(this.$zoomClickable, this.$zoomWindowBox);
    			processColorAndPattern(this.$zoomWindow, this.zoom_window_options.background_color, this.zoom_window_options.background_alpha, this.zoom_window_options.background_pattern);
    			
    		}
    		
    		
    		//content holder
    		this.$view.css({
    			"position":"relative",
    			"width":"100%",
    			"height": this.height+"px",
    			"overflow":"hidden"
    		});
    		
    		//menu holder
    		this.$panel.css({
    			"position":"absolute",
    			"width": this.panel_options.width+"px",
    			"height": this.panel_options.height+"px",
    			"top": this.height+parseInt(this.panel_options.yOffset, 10)+"px",
    			"left":((this.width-this.panel_options.width)/2)+parseInt(this.panel_options.xOffset, 10)+"px"
    		});
            processColorAndPattern(this.$panel, this.panel_options.background_color, this.panel_options.background_alpha, this.panel_options.background_pattern);
            addRoundCorners(this.$panel, this.panel_options.round_corners);
    		
    		//loading screen
    		this.$loader.css({
    			"zoom" : "1",
    			"position":"absolute",
    			"width":"100%",
    			"height":"100%",
    			"text-align":"center",
    			"top":0,
    			"left":0
    		});
    		//loading text
    		this.$loadingText.css({
    			"padding":"8px 20px",
    			"position":"relative",
    			"top":this.height/2-20+"px",
    			"display":"inline-block"
    		});
    		addRoundCorners(this.$loadingText, this.loading_options.text_background_round_corner);
    		
    		processColorAndPattern(this.$loader, this.loading_options.background_color, this.loading_options.background_alpha, this.loading_options.background_pattern);
    		processColorAndPattern(this.$loadingText, this.loading_options.text_background_color, this.loading_options.text_background_alpha, this.loading_options.text_background_pattern);
    		
    		processFont(this.$loadingText, this.loading_options.text_font, this.loading_options.text_color, this.loading_options.text_size);	
    		
    		
    		
    		//MAKE MENU //////////////
    		for(var i=0 ; i< this.controls.length; i++){
    			if(	this.controls[i] == "left" || 
    				this.controls[i] == "right" ||
    				this.controls[i] == "rotate" ||
    				this.controls[i] == "pan" ||
    				this.controls[i] == "hyperlink" ||
    				this.controls[i] == "reset" ||
    				this.controls[i] == "zoom-in" ||
    				this.controls[i] == "zoom-out"){
    				var $btn = $('<a href="#"></a>').appendTo(this.$panel);
    				
    				$btn.css({
    					"position":"relative",
    					"float":"left",
    					"margin":(this.panel_options.height/2-this.panel_options.buttons_height/2)+"px "+this.panel_options.buttons_side_margin+"px",
    					"width":this.panel_options.buttons_width+"px",
    					"height":this.panel_options.buttons_height+"px",
    					"top":0,
    					"left":0
    				});	
    				
    				buttonsClass($btn, this.panel_options.ui_folder+this.controls[i]+"_out.png", this.panel_options.ui_folder+this.controls[i]+"_over.png", this.panel_options.buttons_width, this.panel_options.buttons_height, this.panel_options.buttons_tween_time);
    				
    				preventDragDefault($btn);
    				$btn.click(function(){return false;});
    					
    				//tooltip
    				if(this.include_tooltips){
    					var str = this.getHint(this.controls[i]);
    					
    					var $tooltip = this.makeTooltip(str, $btn, i);
    				}
    					
    				if(this.controls[i] == "left")
    				    $btn.bind(mouseDownBind, $.proxy(this.leftControlDown, this));
    				
    				else if(this.controls[i] == "right")
                        $btn.bind(mouseDownBind, $.proxy(this.rightControlDown, this));
    				
    				else if(this.controls[i] == "rotate"){
    					this.$rotateButton = $btn;
    					$btn.bind(clickBind, $.proxy(this.changeToRotate, this));
    				}
    				else if(this.controls[i] == "pan"){
    					this.$panButton = $btn;
    					$btn.bind(clickBind, $.proxy(this.changeToPan, this));
    				}
    				else if(this.controls[i] == "reset")
    					$btn.bind(clickBind, $.proxy(this.resetControlClick, this));
    				
    				else if(this.controls[i] == "zoom-out")
    					$btn.bind(clickBind, $.proxy(this.zoomoutControlClick, this));
    				
    				else if(this.controls[i] == "zoom-in")
    					$btn.bind(clickBind, $.proxy(this.zoominControlClick, this));
    				
    				else if(this.controls[i] == "hyperlink"){
    					//hyperlink
    					$btn.attr("href", this.controlsExtras[i]);
    					$btn.attr("target", "_blank");
    					$btn.unbind("click");
    					$btn.click(function(){return true;});
    				}
    					
    			}
    			else if(this.controls[i] == "zoom-slider"){
    				///////////////////
    				//ZOOM SLIDER
    				var $zoom_slider = $('<div></div>');
    				
    				var zoom_slider_height = Math.max(this.panel_options.slider_height, this.panel_options.dragger_height);
    				
    				$zoom_slider.css({
    					"position":"relative",
    					"float":"left",
                    	"height": zoom_slider_height,
    					"margin": (this.panel_options.height/2-zoom_slider_height/2)+"px "+this.panel_options.zoom_subbuttons_distance+"px",
    					"top":0,
    					"left":0
    				});	
    
    				var $minus = $('<a href="#"></a>');
    				buttonsClass($minus, this.panel_options.ui_folder+"minus_out.png", this.panel_options.ui_folder+"minus_over.png", this.panel_options.zoom_subbuttons_width, this.panel_options.zoom_subbuttons_height, this.panel_options.buttons_tween_time);
    				
    				var $plus = $('<a href="#"></a>');
    				buttonsClass($plus, this.panel_options.ui_folder+"plus_out.png", this.panel_options.ui_folder+"plus_over.png", this.panel_options.zoom_subbuttons_width, this.panel_options.zoom_subbuttons_height, this.panel_options.buttons_tween_time);
    				
    				var $slider = $('<a href="#"></a>');
    				buttonsClass($slider, this.panel_options.ui_folder+"slider_out.png", this.panel_options.ui_folder+"slider_over.png", this.panel_options.dragger_width, this.panel_options.dragger_height, this.panel_options.buttons_tween_time);
    				
    				var $back = $('<a href="#"></a>');
    				//buttonsClass($back, panel_options.ui_folder+"slider_background.png", panel_options.ui_folder+"slider_background.png", 178, 6, 500);
    				
    				if(this.panel_options.slider_width == "auto")
    				    this.sliderWidth = this.panel_options.width  -  ((this.controls.length-1)*(this.panel_options.buttons_width+this.panel_options.buttons_side_margin*2) + this.panel_options.zoom_subbuttons_width*2 + this.panel_options.buttons_side_margin*2 + this.panel_options.zoom_subbuttons_distance*2 + this.panel_options.divider_width*(this.controls.length-1) + 1);
    				else
    				    this.sliderWidth = parseInt(this.panel_options.slider_width, 10);

    				$back.css({
                       "position":"absolute",
    				   "width": this.sliderWidth,
    				   "height": this.panel_options.slider_height,
    				   "top":zoom_slider_height/2 - this.panel_options.slider_height/2,
                        "left":"0"
    				});
                    addRoundCorners($back, this.panel_options.slider_round_corners);
                    processColorAndPattern($back, this.panel_options.slider_background_color, this.panel_options.slider_background_alpha, this.panel_options.slider_background_pattern);
    				
    				$minus.css({
    					"position":"relative",
    					"float":"left",
    					"width":this.panel_options.zoom_subbuttons_width,
                        "height":this.panel_options.zoom_subbuttons_height,
                        "margin": (this.panel_options.height/2-this.panel_options.zoom_subbuttons_height/2)+"px 0px",
                        "margin-left":this.panel_options.buttons_side_margin
    				});
    				$plus.css({
    					"position":"relative",
    					"float":"left",
                        "width":this.panel_options.zoom_subbuttons_width,
                        "height":this.panel_options.zoom_subbuttons_height,
                        "margin": (this.panel_options.height/2-this.panel_options.zoom_subbuttons_height/2)+"px 0px",
                        "margin-right":this.panel_options.buttons_side_margin
    				});
    				$slider.css({
    					"position":"absolute",
    					"left":-this.panel_options.dragger_width/2+"px",
    					"width":this.panel_options.dragger_width
    				});
    				$zoom_slider.css({
                       "width": this.sliderWidth
                    });
    				
    				$zoom_slider.append($back, $slider);
    				this.$panel.append($minus, $zoom_slider, $plus);
    				
    				this.$zoomSlider = $slider;
    				this.$zoomMinus = $minus;
    				this.$zoomPlus = $plus;
    				
    				$slider.click(function () { return false; });
    				preventDragDefault($plus);
                    preventDragDefault($minus);
                    preventDragDefault($slider);
    					
                    this.sliderFrom = -this.panel_options.dragger_width/2;
                    this.sliderTo = this.sliderWidth-this.panel_options.dragger_width/2;
                        
    				$plus.click($.proxy(this.zoomPlusControlClick, this));
    				$plus.bind(mouseDownBind, $.proxy(this.zoomPlusControlDown, this));
    				$minus.click($.proxy(this.zoomMinusControlClick, this));
    				$minus.bind(mouseDownBind, $.proxy(this.zoomMinusControlDown, this));
    				
    				$slider.bind(mouseDownBind, $.proxy(this.zoomSliderDown, this));
    				$back.click($.proxy(this.zoomBackClick, this));
    				
    				//tooltip
    				if(this.include_tooltips){
    					var str = "Zoom 0%";
    					var $tooltip = this.makeTooltip(str, $slider, "zoom-slider", [$minus, $plus]);
    				}
    				///////////////////
    			}
    			else if(this.controls[i] == "playback-slider"){
    				///////////////////
    				//PLAYBACK SLIDER
    				var $playback_slider = $('<div></div>');
                    var playback_slider_height = Math.max(this.panel_options.slider_height, this.panel_options.dragger_height);
    				
    				$playback_slider.css({
    					"position":"relative",
    					"float":"left",
    					"height": playback_slider_height,
                        "margin": (this.panel_options.height/2-playback_slider_height/2)+"px "+this.panel_options.buttons_side_margin+"px",
    					"top":0,
    					"left":0
    				});	
    				
    				var $slider = $('<a href="#"></a>');
    				buttonsClass($slider, this.panel_options.ui_folder+"slider_out.png", this.panel_options.ui_folder+"slider_over.png", this.panel_options.dragger_width, this.panel_options.dragger_height, this.panel_options.buttons_tween_time);
    				
    				var $back = $('<a href="#"></a>');
    				//buttonsClass($back, panel_options.ui_folder+"slider_background.png", panel_options.ui_folder+"slider_background.png", 178, 6, 500);
    				
    				if(this.panel_options.slider_width == "auto")
                        this.playbackSliderWidth = this.panel_options.width  -  ((this.controls.length-1)*(this.panel_options.buttons_width+this.panel_options.buttons_side_margin*2) + this.panel_options.buttons_side_margin*2 + this.panel_options.divider_width*(this.controls.length-1) + 1);
                    else
                        this.playbackSliderWidth = parseInt(this.panel_options.slider_width, 10);
                        
    				var $p_slider = $('<div></div>');
    				
    				$back.css({
                       "position":"absolute",
                       "width": this.playbackSliderWidth,
                       "height": this.panel_options.slider_height,
                       "top": playback_slider_height/2 - this.panel_options.slider_height/2,
                        "left":"0"
                    });
                    addRoundCorners($back, this.panel_options.slider_round_corners);
                    processColorAndPattern($back, this.panel_options.slider_background_color, this.panel_options.slider_background_alpha, this.panel_options.slider_background_pattern);
    				
    				$slider.css({
    					"position":"absolute",
                        "left":-this.panel_options.dragger_width/2+"px",
    				});
    				$playback_slider.css({
    				   "width": this.playbackSliderWidth
    				});
    				
    				$playback_slider.append($back, $slider);
    				
    				this.$panel.append($playback_slider);
    				
    				this.$playbackSlider = $slider;
    				
    				$slider.click(function () { return false; });
    				preventDragDefault($slider);
    				
    				this.sliderFrom = -this.panel_options.dragger_width/2;
    				this.sliderTo = this.playbackSliderWidth-this.panel_options.dragger_width/2;
    				
    				$slider.bind(mouseDownBind, $.proxy(this.playbackSliderDown, this) );
    				$back.bind(clickBind, $.proxy(this.playbackBackClick, this));
    				
    				//tooltip
    				if(this.include_tooltips){
    					var str = "Rotate 0";
    					
    					var $tooltip = this.makeTooltip(str, this.$playbackSlider, "playback-slider");
    					
    				}
    				///////////////////
    				
    				///////////////////
    				
    			}
    			else if(this.controls[i] == "autoplay"){
    				var $btn = $('<div></div>');
    				
    				$btn.css({
                        "position":"relative",
                        "float":"left",
                        "margin":(this.panel_options.height/2-this.panel_options.buttons_height/2)+"px "+this.panel_options.buttons_side_margin+"px",
                        "width":this.panel_options.buttons_width+"px",
                        "height":this.panel_options.buttons_height+"px",
                        "overflow":"hidden",
    					"top":0,
    					"left":0
                    }); 
    				
    				var $play = $('<a href="#"></a>');
    				buttonsClass($play, this.panel_options.ui_folder+"play_out.png", this.panel_options.ui_folder+"play_over.png", this.panel_options.buttons_width, this.panel_options.buttons_height, this.panel_options.buttons_tween_time);
    				
    				var $pause = $('<a href="#"></a>');
    				buttonsClass($pause, this.panel_options.ui_folder+"pause_out.png", this.panel_options.ui_folder+"pause_over.png", this.panel_options.buttons_width, this.panel_options.buttons_height, this.panel_options.buttons_tween_time);
    				
    				$play.css({
    					"position":"absolute",
                        "top":"0",
                        "left":"0"
    				});
    				$pause.css({
    					"position":"absolute",
                        "top":"0",
                        "left":"0"
    				});
    				$btn.append($play, $pause);
    				this.$panel.append($btn);
    				
    				this.$autoplayPlay = $play;
                    this.$autoplayPause = $pause;
    				
    				if(this.autoplay)
    					$play.stop().fadeTo(0, 0).css("display", "none");
    				else
    					$pause.stop().fadeTo(0, 0).css("display", "none");
    					
    				$btn.click($.proxy(this.autoplayClick, this));
    				
    				//tooltip
    				if(this.include_tooltips){
    					var str = this.tooltips_texts.play;
    					
    					if(this.autoplay)
    						str = this.tooltips_texts.pause;
    					
    					var $tooltip = this.makeTooltip(str, $btn, "autoplay");
    				}
    			}
    			
    			//ADD SEPERATOR
    			if( i != this.controls.length-1){
    				var $sep = $("<div></div>");
    				$sep.css({
    						"position":"relative",
    						"float":"left",
    						"margin":(this.panel_options.height/2-this.panel_options.divider_height/2)+"px 0px",
    						"width":this.panel_options.divider_width,
    						"height":this.panel_options.divider_height
    					});	
    				$sep.append('<img src="'+this.panel_options.ui_folder+'divider.png" />');
    				this.$panel.append($sep);
    			}
    		}
    		////////////////////
    		
    		
    		//MOUSE WHEEL ZOOM
    		if(this.mouse_wheel_function != "none")
    			this.$view.mousewheel($.proxy(this.mouseWheelControl, this));
    		///////////////////
    		
    		
    		//APPENDS //////////////
    		this.$loader.append(this.$loadingText);
    		
    		this.$view.append(this.$imagesHolder, this.$zoomWindow, this.$bigContent);
    		
    		this.$main.append(this.$view);
    		this.$main.append(this.$panel);
    		this.$main.append(this.$loader);
    		
    		this.$root.append(this.$main);
            $('*', this.$main).bind(mouseDownBind, $.proxy(this.clearSmall, this));
            $('*', this.$view).unbind(mouseDownBind);
    		////////////////////
    		
    		if(this.panel_options.show == "roll_over" && !ismobile){
                this.$panel.css("opacity", "0");
                var _this = this;
    		    this.$main.hover(function(){
    		        if(!_this.$panel.hasClass("blocked"))
    		          _this.$panel.stop().fadeTo(500, 1);
    		    }, function(){
                    _this.$panel.stop().fadeTo(500, 0);
    		    });
    		}
    		  
    		
    		this.loadImage(0);
    	},
    	///////////////////////////////////////////////
    	 
    	///////////////////////////////////////////////
    	//CONTROL
        ///////////////////////////////////////////////
        changeToRotate: function(){
        	this.mode = "rotate";
        },
        changeToPan: function(){
        	this.mode = "pan";
        },
    	leftRightControlUp: function (){
            if(this.autoplay)
                this.speedDegDefault = this.autoplaySpeed;
            else
                this.speedDegDefault = 0;
            
            $(document).unbind(mouseUpBind);
            return false;
       	},
        leftControlDown: function (){
            this.speedDegDefault = 7;
            $(document).bind(mouseUpBind, $.proxy(this.leftRightControlUp, this));
            return false;
        },
        rightControlDown: function (){
            this.speedDegDefault = -7;
            $(document).bind(mouseUpBind, $.proxy(this.leftRightControlUp, this));
            return false;
        },
        resetControlClick:function (){
            this.zoom = this.minZoom;
            
            this.goToDegree = true;
            this.goToDegreeNum = 0;
        },
        zoomoutControlClick:function (){
            this.zoom = this.minZoom;
            return false;
        },
        zoominControlClick:function (){
            this.zoom = this.maxZoom;
            return false;
        },
        zoomPlusControlClick:function (){
            this.incrementZoom();
            return false;
        },
        zoomMinusControlClick:function (){
            this.decrementZoom();
            return false;
        },
        incrementZoom:function (){
            this.zoom += this.zoomSpeed;
        },
        decrementZoom:function (){
            this.zoom -= this.zoomSpeed;
        },
        zoomControlUp:function (){
            clearInterval(this.zoomBtnInterval);
            this.changeFocus();
            $(document).unbind(mouseUpBind);
            
            return false;
        },
        zoomPlusControlDown:function (){
            this.zoomBtnInterval = setInterval($.proxy(this.incrementZoom, this), 100);
            
            $(document).bind(mouseUpBind, $.proxy(this.zoomControlUp, this));
            return false;
        },
        zoomMinusControlDown:function (){
            this.zoomBtnInterval = setInterval($.proxy(this.decrementZoom, this), 100);
            
            $(document).bind(mouseUpBind, $.proxy(this.zoomControlUp, this));
            return false;
        },
        zoomSliderMove: function (e){
            var dif = e.pageX - this.posIniX;
                
            var pos = this.sliderX+dif;
            if(pos < this.sliderFrom)
                pos = this.sliderFrom;
            if(pos > this.sliderTo)
                pos = this.sliderTo;
            
            this.$zoomSlider.css({
                "left":pos+"px"
            });
            
            //0 - 168
            var perc = (pos+this.panel_options.dragger_width/2)/this.sliderWidth;
            
            //minZoom - maxZoom
            // 1 - maxZoom + (1-minZoom)
            this.zoom = perc * (this.maxZoom + (1-this.minZoom) - 1) + 1;
            this.zoomCurrent = this.zoom;
        },
        zoomSliderUp:function (){
            this.draggingZoomSlider = false;
            unbindMoveAndUp();
            return false;
        },
        zoomSliderDown:function (e){
            //mouse x position when clicked
            this.posIniX = e.pageX;
            this.sliderX = parseInt(this.$zoomSlider.css("left"), 10);
            this.draggingZoomSlider = true;
               
            $(document).bind(mouseMoveBind, $.proxy(this.zoomSliderMove, this));
            $(document).bind(mouseUpBind, $.proxy(this.zoomSliderUp, this));
            
            return false;
        },
        zoomBackClick:function (e){
            var offset = $(e.target).offset();
            var pos = e.pageX - offset.left - this.panel_options.dragger_width/2 -3;

            if(pos < this.sliderFrom)
                pos = this.sliderFrom;
            if(pos > this.sliderTo)
                pos = this.sliderTo;
            
            //0 - 168
            var perc = (pos+this.panel_options.dragger_width/2)/this.sliderWidth;
            
            //minZoom - maxZoom
            // 1 - maxZoom + (1-minZoom)
            this.zoom = perc * (this.maxZoom - this.minZoom) + 1;
            
            return false;
        },
        playbackSliderMove:function (e){
            var dif = e.pageX - this.posIniX;
                
            var pos = this.sliderX+dif;
            if(pos < this.sliderFrom)
                pos = this.sliderFrom;
            if(pos > this.sliderTo)
                pos = this.sliderTo;
            
            this.$playbackSlider.css({
                "left":pos+"px"
            });
            
            //0 - 168
            var perc = (pos+this.panel_options.dragger_width/2)/this.playbackSliderWidth;
            
            this.goToDegree = true;
            this.goToDegreeNum =  Math.round(perc * 360);
        },
        playbackSliderUp:function (e){
            this.draggingPlaybackSlider = false;
            unbindMoveAndUp();
            return false;
        },
        playbackSliderDown:function (e){
            //mouse x position when clicked
            this.posIniX = e.pageX;
            this.sliderX = parseInt(this.$playbackSlider.css("left"), 10);
            this.draggingPlaybackSlider = true;
            this.goToDegreeNum = this.degrees;
               
            $(document).bind(mouseMoveBind, $.proxy(this.playbackSliderMove, this));
            $(document).bind(mouseUpBind, $.proxy(this.playbackSliderUp, this));
            return false;
        },
        playbackBackClick:function (e){
            var offset = $(e.target).offset();
            var pos = e.pageX - offset.left - this.panel_options.dragger_width/2 -3;
            
            if(pos < this.sliderFrom)
                pos = this.sliderFrom;
            if(pos > this.sliderTo)
                pos = this.sliderTo;
            
            //0 - 168
            var perc = (pos+this.panel_options.dragger_width/2)/this.playbackSliderWidth;
            
            this.goToDegree = true;
            this.goToDegreeNum =  Math.round(perc * 360);
            
            return false;
        },
        autoplayClick:function (){
        	var _this = this;
            if(this.autoplay){
                changeTooltipText("autoplay", this.tooltips_texts.play);
                this.autoplay = false;
                this.speedDegDefault = 0;
                this.$autoplayPlay.stop().css("display", "block").fadeTo(this.panel_options.buttons_tween_time, 1);
                this.$autoplayPause.stop().fadeTo(this.panel_options.buttons_tween_time, 0, function(){ _this.$autoplayPause.css("display", "none"); });
            }
            else{
                changeTooltipText("autoplay", this.tooltips_texts.pause);
                this.autoplay = true;
                this.speedDegDefault = this.autoplaySpeed;
                this.$autoplayPause.stop().css("display", "block").fadeTo(this.panel_options.buttons_tween_time, 1);
                this.$autoplayPlay.stop().fadeTo(this.panel_options.buttons_tween_time, 0, function(){ _this.$autoplayPlay.css("display", "none"); });
            }
            updateTooltipPosition(this.$autoplayPlay, "autoplay");
            return false;
        },
        mouseWheelControl:function (event, delta) {
            this.clearSmall();
            if(this.mouse_wheel_function == "zoom")
                this.zoom+=delta*this.mouse_wheel_speed;
            
             else if(this.mouse_wheel_function == "rotate")
                this.speedDeg+=delta*this.mouse_wheel_speed;
                
            return false;
        },
        ///////////////////////////////////////////////
        
        ///////////////////////////////////////////////
    	// INITIAL IMAGES LOADING
    	loadImage: function (num){
    		var img = new Image();
    		var _this = this;
    		
    		img.onload = function() {
    			if(num == 0){
    				var imgW = img.width;
    				var imgH = img.height;
    				
    				if(!(imgW == _this.width && imgH == _this.height)){
    					var ratio = imgW / _this.width;
    										
    					if(ratio > (imgH/ _this.height))
    						ratio = imgH / _this.height;
    				
    					_this.iniWidth = imgW/ratio;
    					_this.iniHeight = imgH/ratio;
    					
    					_this.zoom = 1-(ratio-1);
    					_this.zoomCurrent = _this.zoom;
    				}
    				else{
    					_this.iniWidth = imgW;
    					_this.iniHeight = imgH;
    					_this.zoom = 1;
    					_this.zoomCurrent = _this.zoom;
    				}
    				_this.minZoom = _this.zoom;
    				_this.$imagesHolder.css({
    					"width":_this.iniWidth+"px",
    					"height":_this.iniHeight+"px"
    				});
    				
    				if(_this.include_zoom_window){
    					var ratio = 1;
    					if(_this.zoom_window_options.window_width == "auto")
    						//Fixed Height
    						ratio = imgH / _this.zoom_window_options.window_height;
    					
    					else if(_this.zoom_window_options.window_height == "auto")
    						//Fixed Width
    						ratio = imgW / _this.zoom_window_options.window_width;
    					
    					else{
    						alert("Error on a zoom window parameter on the xml -> width OR height must be 'auto'");
    						return;
    					}
    					var w1 = Math.round(imgW/ratio);
    					var h1 = Math.round(imgH/ratio);
    					
    					_this.$zoomWindow.css({
    						"width":w1+"px",
    						"height":h1+"px"
    					});
    					
    					_this.zoom_window_width = w1;
    					_this.zoom_window_height = h1;
    				}
    			}
    			
    			$(img).css({
    					"width":"100%",
    					"height":"100%"
    				});
    			
    			
    			var $image = $("<div rel='"+num+"'></div>");
    			$image.css({
    				"position":"absolute",
    				"width":"100%",
    				"height":"100%"
    			});
    			
    			$image.append(img);
    			_this.$imagesHolder.append($image);
    			
    			if(_this.include_zoom_window){
    				var $small = $image.clone().css({
    					"padding":_this.zoom_window_options.padding+"px",
    					"width":"auto",
    					"height":"auto"}).prependTo(_this.$zoomWindow);
    				_this.zoom_window_images.push($small);
    			}
    			
    			
    			_this.images.push($image);
                $image.bind(mouseDownBind, $.proxy(_this.clearSmall, _this));
    			
    			if(num == _this.imagesSrc.length-1)
    				_this.loadFinished();
    			else
    				_this.loadImage(++num);
    				
    		};
    		
            var str = this.loading_text;
            str = str.replace("loaded_images", (num+1));
            str = str.replace("total_images", this.imagesSrc.length);
            str = str.replace("#span#", "<span style='color:"+this.loading_options.text_span_color+"'>");
            str = str.replace("#spanEnd#", "</span>");
            this.$loadingText.html(str);
    		//$("span", $loadingText).html((num+1)+"/"+imagesSrc.length);
    		
    		img.src = (this.imagesPath+this.imagesSrc[num]);
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// LOAD FINISHED CALLER
    	loadFinished: function (){
    		this.$loader.fadeOut(500);
    		this.currentImage = 0;
    		this.numImages = this.imagesSrc.length;
    		
    		if(this.include_zoom_window){
    			this.relativeExcessW = ((this.zoom_window_width/this.iniWidth) * (this.iniWidth-this.width));
    			this.relativeExcessH = ((this.zoom_window_height/this.iniHeight) * (this.iniHeight-this.height));
    		}
    		//Start updating image
    		this.updateImage();
    		
    		if(this.autoplay)
    			this.speedDegDefault = this.autoplaySpeed;
    			
    			
    		//updateTransition();
    		this.dragAndDrop();
    		
    	},
    	///////////////////////////////////////////////«
    	
    	
    	///////////////////////////////////////////////
    	// DRAG AND THROW 	
    	onRotateMove: function (e){
    		if(ismobile){
	    		if(ignored != e.pageX && ignore2 > 2)
	    	    	this.currentX = e.pageX;
	    	    else if(ignore2 <= 2){
	    	    	ignored = e.pageX;
	    	    	ignore2++;
	    	    }
    	   	}
    	   	else
    	   		this.currentX = e.pageX;
    	},
    	onRotateUp: function (){
            this.grabHandOpen(this.$imagesHolder, this);
            this.dragging = false;
            this.changeFocus();
            
            unbindMoveAndUp();
       	},
    	onPanMove: function (e){
    		var x ;
    		var y ;
    		
    		if(ismobile){
	    		if(ignored != e.pageX && ignored1 != e.pageY && ignore2 > 2){
	    	    	x = e.pageX;
            		y = e.pageY;
	    	    }
	    	    else if(ignore2 <= 2){
	    	    	ignored = e.pageX;
	    	    	ignored1 = e.pageY;
	    	    	x = this.panPrevX;
	    	    	y = this.panPrevY;
	    	    	ignore2++;
	    	    }
    	   	}
    	   	else{
    	   		x = e.pageX;
            	y = e.pageY;
    	   	}
    	   		
             
            
            var toX = this.panPrevLeft + (this.panPrevX-x);
            var toY = this.panPrevTop + (this.panPrevY-y);
            
            var excessWidth = (this.currentWidth-this.width)/2;
            var excessHeight = (this.currentHeight-this.height)/2;
            
            if(toX < -excessWidth)
                toX = -excessWidth;
            if(toX > excessWidth)
                toX = excessWidth;
                
            if(toY < -excessHeight)
                toY = -excessHeight;
            if(toY > excessHeight)
                toY = excessHeight;
                
            this.viewLeft = toX;
            this.viewTop = toY;
       },
        onPanUp: function (){
            this.grabHandOpen(this.$imagesHolder, this);
            this.panning = false;
            
            unbindMoveAndUp();
            
            return false;
        },
    	startDrag: function (e){
            this.grabHandClose(this.$imagesHolder, this);
            ignore2 = 0;
                
            if(this.mode == "rotate" && !this.singleImage){
                this.removeFocus();
                
                //mouse x position when clicked
                this.positionClickedX = e.pageX;
                
                this.oldDif = 0;
                this.degWhenClicked = this.degrees;
                this.currentX = this.positionClickedX;
                
                //dragging
                this.dragging = true;
                   
                //MOUSE MOVE BIND
                $(document).bind(mouseMoveBind, $.proxy(this.onRotateMove, this) );
                
                //MOUSE UP BIND
                $(document).bind(mouseUpBind, $.proxy(this.onRotateUp, this) );
                
                
                return false;
            }
            else{
                //mouse x position when clicked
                this.panPrevX = e.pageX;
                this.panPrevY = e.pageY;
                
                //panning
                this.panning = true;
                
                this.panPrevLeft = this.viewLeft;
                this.panPrevTop = this.viewTop;
                
                this.zoomWhenPad = this.zoom;
                  
                //MOUSE MOVE BIND
                $(document).bind(mouseMoveBind, $.proxy(this.onPanMove, this) );
                
                //MOUSE UP BIND
                $(document).bind(mouseUpBind, $.proxy(this.onPanUp, this) );
                
                return false;
            }
    	},
    	dragAndDrop: function (){
			var _this = this;
            preventDragDefault(this.$imagesHolder);
    			
    		this.$imagesHolder.hover(function(){
    		    _this.grabHandOpen(_this.$imagesHolder, _this);
    		}, function(){
    			_this.$imagesHolder.css("cursor" , "auto");
    		});
    			
    		//MOUSE DOWN BIND
            this.$imagesHolder.bind(mouseDownBind, $.proxy(this.startDrag, this));
    		
    		
    		//ZOOM WINDOW DRAGGER
    		if(this.include_zoom_window){
    			preventDragDefault(this.$zoomWindowBox);
    				
    			this.$zoomWindowBox.hover(function(){
    			    _this.grabHandOpen(_this.$zoomWindowBox, _this);
    			}, function(){
    				_this.$zoomWindowBox.css("cursor" , "auto");
    			});
    			this.$zoomClickable.click(function(e){
                    var x = e.pageX;
                    var y = e.pageY;
                    
                    var off = _this.$zoomWindow.offset();
                    
                    var excessWidth = (_this.currentWidth-_this.width)/2;
                    var excessHeight = (_this.currentHeight-_this.height)/2;
                    
                    var zoomWindowWidth = parseInt(_this.$zoomWindowBox.css("width"), 10);
                    var zoomWindowHeight = parseInt(_this.$zoomWindowBox.css("height"), 10);
                    
                    var toX = -excessWidth + ((x-off.left - zoomWindowWidth/2) * (_this.width/zoomWindowWidth));
                    var toY = -excessHeight + ((y-off.top - zoomWindowHeight/2) * (_this.height/zoomWindowHeight)); 
                    
                    
                    if(toX < -excessWidth)
                        toX = -excessWidth;
                    if(toX > excessWidth)
                        toX = excessWidth;
                        
                    if(toY < -excessHeight)
                        toY = -excessHeight;
                    if(toY > excessHeight)
                        toY = excessHeight;
                        
                    _this.viewLeft = toX;
                    _this.viewTop = toY;
    			});
    			_this.$zoomWindowBox.bind(mouseDownBind , function(e){
    			    _this.grabHandClose(_this.$zoomWindowBox, _this);
    				//mouse x position when clicked
    				var positionX = e.pageX;
    				var positionY = e.pageY;
    				
    				//panning
    				_this.panning = true;
    				
    				var prevLeft = _this.viewLeft;
    				var prevTop = _this.viewTop;
    				
    				_this.zoomWhenPad = _this.zoom;
    				   
    				$(document).bind(mouseMoveBind, function(e){ 
    					var x = e.pageX;
    					var y = e.pageY;
    					
    					var toX = prevLeft - ((positionX-x) * (_this.width/parseInt(_this.$zoomWindowBox.css("width"), 10)));
    					var toY = prevTop - ((positionY-y) * (_this.height/parseInt(_this.$zoomWindowBox.css("height"), 10)));
    					
    					var excessWidth = (_this.currentWidth-_this.width)/2;
    					var excessHeight = (_this.currentHeight-_this.height)/2;
    					
    					if(toX < -excessWidth)
    						toX = -excessWidth;
    					if(toX > excessWidth)
    						toX = excessWidth;
    						
    					if(toY < -excessHeight)
    						toY = -excessHeight;
    					if(toY > excessHeight)
    						toY = excessHeight;
    						
    					_this.viewLeft = toX;
    					_this.viewTop = toY;
    					
                        return false;
    				});
    				$(document).bind(mouseUpBind, function(e){ 
                        _this.grabHandOpen(_this.$imagesHolder, _this);
    					_this.panning = false;
    					
    					unbindMoveAndUp();
    					
    					return false;
    				});
    				return false;
    			});
    		}
    		
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// TOOLTIPS CONTROL FUNCTIONS
    	makeTooltip: function (tip, $obj, rel, $objArray){
    		var $tooltip = $('<div class="tooltip"><span>'+tip+'</span></div>');
    					
    		var $triangle = $('<div></div>');
    		
    		$tooltip.css({
    			"-moz-font-feature-settings": "normal",
    		    "-moz-font-language-override": "normal",
    		    "display": "inline-block",
    		    "pointer-events": "none",
    		    "position": "absolute",
    		    "text-align": "center",
    		    "text-decoration": "none",
    			"padding": this.tooltips_options.top_bottom_padding+"px "+this.tooltips_options.left_right_padding+"px",
    			"background-color":this.tooltips_options.background_color,
    			"opacity":"0"
    	 	});
    		$triangle.css({
    			"float":"left",
    		    "position": "absolute",
    		    "top":"100%",
    		    "left":"50%",
    		    "margin-left":"-5px",
    			"width": "0px",
    			"height": "0px",
    			"border-left": "5px solid transparent",
    			"border-right": "5px solid transparent",
    			"border-top": "5px solid "+this.tooltips_options.background_color,
    			"opacity":this.tooltips_options.background_alpha
    		});
    		processFont($tooltip, this.tooltips_options.text_font, this.tooltips_options.text_color, this.tooltips_options.text_size);
    		addRoundCorners($tooltip, this.tooltips_options.round_corners);
    		
    		processColorAndPattern($tooltip, this.tooltips_options.background_color, this.tooltips_options.background_alpha, "none");
    		
    		$tooltip.append($triangle);
    		
    		
    		$body.append($tooltip);
            $tooltip.attr("rel", rel);
            
            updateTooltipPosition($obj, rel);
            var _this = this;
            
            function over(){
                if( !$(this).hasClass("disabled") ){
                    var $tooltip = updateTooltipPosition($obj, rel);
                    $tooltip.stop().fadeTo(_this.tooltips_options.fadeTime, 1);  
                    if (isIE) 
                        $triangle.stop().fadeTo(_this.tooltips_options.fadeTime, _this.tooltips_options.background_alpha);    
                }    
            }
            function out(){
                if( !$(this).hasClass("removing") ){
                    var $tooltip = $(".tooltip[rel='"+rel+"']");
                    $tooltip.stop().fadeTo(_this.tooltips_options.fadeTime, 0);  
                    if (isIE)  
                        $triangle.stop().fadeTo(_this.tooltips_options.fadeTime, 0);  
                }
            }
            if (isIE)  {
                $tooltip.stop().fadeTo(0, 0);  
                $triangle.stop().fadeTo(0, 0); 
            }
            
            $obj.bind(mouseOverBind, over);
            $obj.bind(mouseOutBind, out);
            
            if($objArray != null)
                $($objArray).each(function(){
                    $(this).bind(mouseOverBind, over);
                    $(this).bind(mouseOutBind, out);
                });
    		
    		return $tooltip;
    	},
        getHint: function (control){
    		var str;
    		switch(control){
    			case "left":
    				str = this.tooltips_texts.rotate_left;
    				break;
    			case "right":
                    str = this.tooltips_texts.rotate_right;
    				break;
    			case "rotate":
                    str = this.tooltips_texts.rotate;
    				break;
    			case "pan":
                    str = this.tooltips_texts.pan;
    				break;
    			case "hyperlink":
                    str = this.tooltips_texts.hyperlink;
    				break;
    			case "reset":
                    str = this.tooltips_texts.reset;
    				break;
    			case "zoom-in":
                    str = this.tooltips_texts.zoom_in;
    				break;
    			case "zoom-out":
                    str = this.tooltips_texts.zoom_out;
    				break;
    			case "zoom_slider":
                    var perc = Math.round((this.zoom - this.minZoom)/(this.maxZoom - this.minZoom)*100) + "";
                    str = this.tooltips_texts.zoom_slider;
                    str = str.replace("zoom_number", perc);
    			    break;
                case "rotate_slider":
                    var deg;
                    var degreesCalc = this.degrees;
                    if(this.degrees < 0)
                        degreesCalc = 360+this.degrees;
                    if(this.draggingPlaybackSlider)
                        deg = Math.round(this.goToDegreeNum)+"";
                    else
                        deg = Math.round(degreesCalc)+"";
                        
                    str = this.tooltips_texts.rotate_slider;
                    str = str.replace("rotate_number", deg);
                    break;
    		}
    		return str;
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// HOTSPOTS HANDLING
    	clearSmall: function (){
    	    if(this.$hotspotsSmall != null){
    	       this.$hotspotsSmall.stop().fadeTo(this.smallTweenTime, 0, function(){
    	           $(this).remove();
    	       });
               this.$hotspotsSmall = null;
    	   }
    	},
        updateSmall: function (){
            if(this.$hotspotsSmall != null){
                this.$hotspotsSmall.css({
                    "left": parseInt(this.$smallHotspot.css("left"), 10)-this.smallWidth/2,
                    "top": parseInt(this.$smallHotspot.css("top"), 10)-this.smallHeight/2
                });
                //hotspots[currentImage][parseInt(smallRel, 10)].x
            }
        },
    	getHotspotButton: function (hotspot, rel){
    		var _this = this;
    		var num = -1;
    		for(var i = 0; i<this.hotspotsButtons.length ; i++)
    			if(this.hotspotsButtons[i].id == hotspot.id){
    				num = i;
    				break;
    			}
    			
    		if(num == -1)
    			return null;
    			
    		var w = parseInt(this.hotspotsButtons[num].width, 10);
    		var h = parseInt(this.hotspotsButtons[num].height, 10);
    		
    		var $btn = $("<a href='#' rel="+rel+"></a>").css({
    			"position":"absolute",
    			"margin-left":Math.round(-w/2)+"px",
    			"margin-top":Math.round(-h/2)+"px"
    		});
    		
    		buttonsClass($btn, this.hotspotsImagesPath+this.hotspotsButtons[num].out, this.hotspotsImagesPath+this.hotspotsButtons[num].over, w, h, parseInt(this.hotspotsButtons[num].tweenTime, 10));
    		
    		//TOOLTIP
    		if(hotspot.tooltip!="none" && hotspot.tooltip!=null){
    		    var str = hotspot.tooltip;
                        
                var $tooltip = this.makeTooltip(str, $btn, "cont"+rel);
                this.currentHotspotsTooltips.push($tooltip);
    		}
    		
    		if(hotspot.type=="link"){
    			$btn.attr({"href": hotspot.content, "target" : "_blank"});
    			if(ismobile)
    			$btn.bind(clickBind, function(){window.location = hotspot.content; return false;});
    		}
            if(hotspot.type=="small")
                $btn.bind(clickBind, function(){
                	//close previous hotspots
                	_this.clearSmall();
                	
                    //make small hotspot
                    var contentObj = hotspot.content;
                    var $hotspot = $(this);
                    
                    var $small_content = $("<div></div>").css({
                        "width":contentObj.width,
                        "position":"absolute",
                        "padding":contentObj.padding+"px",
                        "opacity":"0"
                    }).html(contentObj.html);
                    
                    addRoundCorners($small_content, contentObj.round_corners);
                    processColorAndPattern($small_content, contentObj.background_color, contentObj.background_alpha, contentObj.background_pattern);
                    
                    _this.smallTweenTime = contentObj.fadeTime;
                    _this.$imagesHolder.append($small_content.fadeTo(_this.smallTweenTime, 1));
                    
                    _this.$hotspotsSmall = $small_content;
                    _this.$smallHotspot = $hotspot;
                    _this.smallWidth = contentObj.width;
                    _this.smallHeight = $small_content.outerHeight();
                    
                    $("a", $small_content).live(mouseDownBind, function(){return true;});
                    $("a", $small_content).live(mouseUpBind, function(){return true;});
                    $("a", $small_content).live(clickBind, function(){return true;});
                    
                    return false;
                });
            else if(hotspot.type == "big")
                $btn.bind(clickBind, function makeBigHotspotContent(){
                    //make big hotspot
                    var contentObj = hotspot.content;
                    var $hotspot = $(this);
                    var $iframe;
                    var $big_content = $("<div></div>");
                    _this.$bigContent.append($big_content);
            
                    //ajax load
                    $big_content.load(contentObj.html);
                    $.proxy(_this.initScroll($big_content, _this.width, _this.height), _this);
            
                    $big_content.css({
                        "width":"100%",
                        "position":"absolute",
                        "left":"0",
                        "top":"0"
                    });
                    
                    
                    _this.$bigContent.css({
                        "width":"100%",
                        "height":"100%",
                        "opacity":"0"
                    });
                    
                    processColorAndPattern(_this.$bigContent, contentObj.background_color, contentObj.background_alpha, contentObj.background_pattern);
                    
                    //CLOSE BUTTON
                    var numClose = -1;
                    for(var i = 0; i<_this.hotspotsButtons.length ; i++)
                        if(_this.hotspotsButtons[i].id == contentObj.close_button_id){
                            numClose = i;
                            break;
                        }
                        
                    if(numClose == -1)
                        return null;
                        
                    var wClose = parseInt(_this.hotspotsButtons[numClose].width, 10);
                    var hClose = parseInt(_this.hotspotsButtons[numClose].height, 10);
                    
                    var $closeBtn = $("<a href='#' rel="+rel+"></a>").css({
                        "position":"absolute",
                        "left":_this.width-wClose+contentObj.closeOffsetX+"px",
                        "top":contentObj.closeOffsetY+"px"
                    });
                    
                    buttonsClass($closeBtn, _this.hotspotsImagesPath+_this.hotspotsButtons[numClose].out, _this.hotspotsImagesPath+_this.hotspotsButtons[numClose].over, wClose, hClose, parseInt(_this.hotspotsButtons[numClose].tweenTime, 10));
                            
                    _this.$bigContent.append($closeBtn).stop().fadeTo(contentObj.fadeTime, 1);
                    
                    $closeBtn.click(function(){
                        if(_this.panel_options.show == "roll_over")
                            _this.$panel.removeClass("blocked").stop().fadeTo(500, 1);
                         _this.$bigContent.stop().fadeTo(contentObj.fadeTime, 0, function(){
                             $(this).empty().css({
                                 "width":"0",
                                 "height":"0"
                             });
                         });
                         return false;
                    });
                    
                    if(_this.panel_options.show == "roll_over")
                        _this.$panel.addClass("blocked").stop().fadeTo(500, 0);
                    
                    return false;
                });
    		
    		return $btn;
    	},
    	clearHotspots: function (){
    		for(var i = 0; i<this.currentHotspots.length ; i++){
    			this.currentHotspots[i].addClass("disabled removing").stop().fadeTo(500, 0, function(){
    				$(this).remove();
    			});
    		}
    		for(var i = 0; i<this.currentHotspotsTooltips.length ; i++){
                this.currentHotspotsTooltips[i].stop().fadeTo(500, 0, function(){
                    $(this).remove();
                });
            }
    		this.currentHotspots = Array();
            this.currentHotspotsTooltips = Array();
    	},
    	updateHotspots: function (){
    		for(var i = 0; i<this.currentHotspots.length ; i++){
    			if(this.hotspots[this.currentImage] != null){
    				var hotspot = this.hotspots[this.currentImage][i];
    				
    				this.currentHotspots[i].css({
    					"left" : Math.round(hotspot.x * this.zoomCurrent) +"px",
    					"top" : Math.round(hotspot.y * this.zoomCurrent) +"px"
    				});
    				
    				updateTooltipPosition(this.currentHotspots[i], "cont"+this.currentHotspots[i].attr("rel"));
    			}
    		}
    		this.updateSmall();
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// BRINGS currentImage NUMBER TO FRONT
    	bringHotspotsTimeout: function (){
    	    //this image has hotspots
            if(this.hotspots[this.currentImage] != null){
                for(var i =0; i<this.hotspots[this.currentImage].length ; i++){
                    var hotspot = this.hotspots[this.currentImage][i];
                    var $btn = this.getHotspotButton(hotspot, i).css({
                        "left":hotspot.x+"px",
                        "top":hotspot.y+"px",
                        "opacity":"0"
                    }).fadeTo(500, 1);
                    if($btn!=null){
                        this.$imagesHolder.append($btn);
                        this.currentHotspots.push($btn);
                    }
                }   
            }
    	},
    	bringHotspots: function (){
            clearTimeout(this.hotspotsTimer);
    	    if(this.hotspots[this.currentImage] != null)
                this.hotspotsTimer = setTimeout($.proxy(this.bringHotspotsTimeout, this), 100);
    	},
    	getToFront: function (){
    		if(this.currentImage >= 0 && this.currentImage < this.numImages)
    			if(this.currentImage != this.oldImage){
    				for(var i = 0; i<this.numImages ; i++){
    					this.images[i].css("display", "none");
    					
    					if(this.include_zoom_window)
    						this.zoom_window_images[i].css("display", "none");
    				}
    					
    				this.images[this.currentImage].css("display", "block");
    				if(this.include_zoom_window)
    					this.zoom_window_images[this.currentImage].css("display", "block");
    					
    				this.oldImage = this.currentImage;
    				
    				this.clearHotspots();
    				this.clearSmall();
    				this.bringHotspots();
    				
    				this.changeFocus();
    			}
    	},
    	///////////////////////////////////////////////
    	
    	
    	
    	///////////////////////////////////////////////
    	// CHANGE/ADD FOCUSED IMAGE
    	removeFocus: function (){
            clearTimeout(this.focusTimer);
    		this.focusing = false;
    		this.focused = false;
    		this.focusedNum = -1;
    		if(this.$bigImage != null)
    			this.$bigImage.remove();
    	},
    	changeFocus: function (){
    	    if(this.focusable){
        		this.removeFocus();
        		
        		if(this.zoom > 1 && !this.dragging){
        			this.focusTimer = setTimeout($.proxy(this.updateFocus, this), 500);
        		}
    		}
    	},
    	updateFocus: function (){
    	    if(this.focusable){
                clearTimeout(this.focusTimer);
    		    this.focusing = true;
    		    this.loadBigImage();
    		}
    	},
    	loadBigImage: function (){
    	    if(!this.dragging && this.focusable){
        	    if(this.focused)
                    this.removeFocus();
                
        		var img = new Image();
        		var num = this.currentImage;
        		
        		var _this = this;
        		img.onload = function() {
        			if(num == _this.currentImage && _this.zoom > 1){
                        if(_this.focused)
                            _this.removeFocus();
                            
        				_this.focused = true;
        				_this.focusing = false;
        				_this.focusedNum = num;
        				
        				var $image_holder = _this.images[num];
        				var $img = $(img);
        				
        				$img.css({
							"top":"0",
							"left":"0",
        						"width":"100%",
        						"height":"100%",
        						"position":"absolute"
        					});
                				
                            
        				$image_holder.append($img);
        				_this.$bigImage = $img;
        			}
        		};
        		
        		img.src = (this.imagesBigPath+this.imagesSrc[num]);
    		}
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// CALCULATES DEGREES ACCORDING TO SPEED
    	calculateDegree: function (){
    		if(!this.dragging && !this.goToDegree && !this.draggingPlaybackSlider){
    			var degreeEase = ((this.speedDegDefault-this.speedDeg)/this.ease);
    			this.speedDeg += degreeEase;
    			
    			this.degrees += Math.round(this.speedDeg);
    		}
    		else if(this.goToDegree){
    		    var degreeEase;
    		    if(this.draggingPlaybackSlider)
    			    degreeEase = ((this.goToDegreeNum-this.degrees));
    			else
                    degreeEase = ((this.goToDegreeNum-this.degrees)/this.ease);
    			//speedDeg += degreeEase;
    			
    			this.degrees += degreeEase;
    			
    			if(Math.round(this.degrees) == this.goToDegreeNum){
    				this.goToDegree=false;
    				this.degrees = Math.round(this.degrees);
    			}
    		}
    		
    		while(this.degrees > 360)
    			this.degrees -= 360;
    		while(this.degrees < -360)
    			this.degrees += 360;
    		
    		var degreesCalc = this.degrees;
    		if(this.degrees < 0)
    			degreesCalc = 360+this.degrees;
    			
    		this.currentImage =  Math.round((degreesCalc/360)*this.numImages);
    		if(this.reverse){
    			if(this.currentImage != 0)
    				this.currentImage = this.numImages-this.currentImage;
    		}
    		
    		this.getToFront();
    			
    		if(this.$playbackSlider != null){
    				
    			updateTooltipPosition(this.$playbackSlider, "playback-slider");
    			changeTooltipText("playback-slider", this.getHint("rotate_slider"));
    			
    			if(!this.draggingPlaybackSlider){
    				//minZoom - maxZoom
    				// 0 - (maxZoom - minZoom)
    				var percentage = Math.abs(degreesCalc)/360;
    				var pos = percentage*this.playbackSliderWidth - this.panel_options.dragger_width/2;
    				
    				//var curr = parseInt($playbackSlider.css("left"));
    				//var sum = ((pos-curr)/ease);
    					
    				this.$playbackSlider.css({
    					"left":pos+"px"
    				});
    			}
    		}
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// CALCULATES ZOOM 
    	calculateZoom: function (){
    		
    		//CALCULATE WIDTH AND HEIGHT ACCORDING TO ZOOM
    		if(this.zoom < this.minZoom)
    			this.zoom = this.minZoom;
    		if(this.zoom > this.maxZoom)
    			this.zoom = this.maxZoom;
    			
    		var zoomAdd = ((this.zoom-this.zoomCurrent)/this.zoomEase);
    		this.zoomCurrent += zoomAdd;
    		
    		this.currentWidth = Math.round(this.iniWidth*this.zoomCurrent);
    		this.currentHeight = Math.round(this.iniHeight*this.zoomCurrent);
    			
    			
    		//CALCULATE LEFT AND TOP POSITION
    		var excessWidth = (this.currentWidth - this.width)/2 ;  
    		var excessHeight = (this.currentHeight - this.height)/2 ;  
    		this.posX = Math.round(-excessWidth);
    		this.posY = Math.round(-excessHeight);
    		
    		this.viewLeft += this.viewLeft * (this.zoomCurrent-this.zoomWhenPad)/2;
    		this.viewTop += this.viewTop * (this.zoomCurrent-this.zoomWhenPad)/2;
    		this.zoomWhenPad = this.zoomCurrent;
    		
    		var viewLeftCurrentAdd = ((this.viewLeft-this.viewLeftCurrent)/this.paddingEase);
            var viewTopCurrentAdd = ((this.viewTop-this.viewTopCurrent)/this.paddingEase);
            this.viewLeftCurrent += viewLeftCurrentAdd;
            this.viewTopCurrent += viewTopCurrentAdd;
    		
    		var toX = Math.round(this.posX-this.viewLeftCurrent);
    		var toY = Math.round(this.posY-this.viewTopCurrent);
    		
    		if(toX > 0){
    			this.viewLeft = this.posX; 
    			toX = 0;
    		}
    		else if(toX < -excessWidth*2){
    			this.viewLeft = -this.posX; 
    			toX = -excessWidth*2;
    		}
    		
    		if(toY > 0){
    			this.viewTop = this.posY; 
    			toY = 0;
    		}
    		else if(toY < -excessHeight*2){
    			this.viewTop = -this.posY; 
    			toY = -excessHeight*2;
    		}
    		
    		if((this.focused || this.focusing) && this.zoom <= 1)
    			this.removeFocus();
    		else if(!this.focusing && !this.focused && this.zoom > 1)
    			this.updateFocus();
    		
    		this.$imagesHolder.css({
    			"width":this.currentWidth+"px",
    			"height":this.currentHeight+"px",
    			"left":toX + "px",
    			"top":toY + "px"
    		});
    		
    		if(this.include_zoom_window){
    			this.$zoomWindowBox.css({
    				"width": Math.round((this.zoom_window_width-this.relativeExcessW)/this.zoomCurrent) +"px",
    				"height": Math.round((this.zoom_window_height-this.relativeExcessH)/this.zoomCurrent) +"px",
    				"top": Math.round(-toY*(this.zoom_window_height/this.currentHeight))+"px",
    				"left": Math.round(-toX*(this.zoom_window_width/this.currentWidth))+"px"
    			});
    		}
    		
    		
    		if(this.$zoomSlider != null){
    			updateTooltipPosition(this.$zoomSlider, "zoom-slider");
    			changeTooltipText("zoom-slider", this.getHint("zoom_slider"));
    			
    			if(!this.draggingZoomSlider){
    				//minZoom - maxZoom
    				// 0 - (maxZoom - minZoom)
    				var percentage = (this.zoomCurrent-this.minZoom)/(this.maxZoom -this.minZoom);
    				var pos = percentage*this.sliderWidth - this.panel_options.dragger_width/2;
    					
    				this.$zoomSlider.css({
    					"left":pos+"px"
    				});
    				
    				if(this.zoom == this.minZoom)
    					disableButton(this.$zoomMinus, this.buttonsDisabledAlpha);
    				else 
    					enableButton(this.$zoomMinus, this.buttonsDisabledAlpha);
    					
    				if(this.zoom == this.maxZoom)
    					disableButton(this.$zoomPlus, this.buttonsDisabledAlpha);
    				else 
    					enableButton(this.$zoomPlus, this.buttonsDisabledAlpha);
    			}
    		}
    	},
    	///////////////////////////////////////////////
    	
    	
    	///////////////////////////////////////////////
    	// UPDATE IMAGE SHOWING
    	updateImage: function (){
    		if(!this.singleImage)
    		    this.calculateDegree();
    		else if(!this.showedHotspots){
                this.bringHotspots();
                this.showedHotspots = true;
            }
    		
    		if(this.minZoom != this.maxZoom){
        		if(Math.round(this.zoom*1000) != Math.round(this.zoomCurrent*100))
        		  this.calculateZoom();
            }
    		  
    		this.updateHotspots();
    		
    		if(this.dragging){
    			var dif = this.positionClickedX - this.currentX;
    			if(ismobile){
    				if(dif < 20 && dif > -20)
	    				dif = 0;
	    				
					dif/=2;
				}
    			var change = dif-this.oldDif;
    			
    			this.speedDeg = Math.round(change*this.inertia);
    			this.oldDif = dif;
    			
    			this.degrees = this.degWhenClicked + dif;
    			
    			//speedInc = Math.round(change);
    		}
    		
    		var panable = false;
    		var w = Math.round(this.iniWidth*this.zoom);
    		var h = Math.round(this.iniHeight*this.zoom);
    		if(w>this.width || h>this.height)
    			panable = true;
    			
    		if(this.include_zoom_window){
    			if(panable && !this.zoomWindowEnabled){
    				this.$zoomWindow.css("display", "block").stop().fadeTo(500, 1);
    				this.zoomWindowEnabled=true;
    			}
    			else if(!panable && this.zoomWindowEnabled){
    				this.$zoomWindow.stop().fadeTo(500, 0, function(){$(this).css("display", "none")});
    				this.zoomWindowEnabled=false;
    			}
    		}
    		
    		if(!panable && this.mode=="pan")
    			this.mode = "rotate";
    		if(this.$panButton != null){
    			if(this.mode=="pan" || !panable)
    				disableButton(this.$panButton, this.buttonsDisabledAlpha);
    			else
    				enableButton(this.$panButton, this.buttonsDisabledAlpha);
    		}
    		if(this.$rotateButton != null){
    			if(this.mode=="rotate")
    				disableButton(this.$rotateButton, this.buttonsDisabledAlpha);
    			else
    				enableButton(this.$rotateButton, this.buttonsDisabledAlpha);
    		}
    		
    		setTimeout($.proxy(this.updateImage, this), refreshRate);
    	},
    	///////////////////////////////////////////////
    	
    	
    	grabHandOpen: function ($obj, _this){
            if(_this.grab_hand_cursor)
                $obj.css("cursor" , "url("+_this.panel_options.ui_folder+"grabhand_open.png) 12 12,auto");
            else
                $obj.css("cursor" , "pointer");
       },
        grabHandClose: function ($obj, _this){
            if(_this.grab_hand_cursor)
                $obj.css("cursor" , "url("+_this.panel_options.ui_folder+"grabhand_closed.png) 12 12,auto");
            else
                $obj.css("cursor" , "pointer");
        },
        initScroll: function ($ele, winWidth, winHeight) {
            var $initScrollObj = $ele;
            var _this = this;
            preventDragDefault($ele);
            
            var initwinWidth = winWidth;
            var initwinHeight = winHeight;
                    
            $ele.hover(function(){
                _this.grabHandOpen($ele, _this);
            }, function(){
                $ele.css("cursor" , "auto");
            });
            
            $ele.bind(mouseDownBind, function initScrollDown(e){
	            _this.grabHandClose($initScrollObj, _this);
	            var initScrollPosX = e.pageX;
	            var initScrollPosY = e.pageY;
	            
	            var initScrollPrevLeft = parseInt($initScrollObj.css("left"), 10);
	            var initScrollPrevTop = parseInt($initScrollObj.css("top"), 10);
	            
	            var eleWidth = $initScrollObj.width();
	            var eleHeight = $initScrollObj.height();
	            
	            $(document).bind(mouseMoveBind, function initScrollMove(e){
		            var x = e.pageX;
		            var y = e.pageY;
		            
		            var toX = initScrollPrevLeft - (initScrollPosX-x);
		            var toY = initScrollPrevTop - (initScrollPosY-y);
		            
		            if(toX>0)
		                toX = 0;
		            else if(toX<initwinWidth-eleWidth)
		                toX = initwinWidth-eleWidth;
		                
		            if(toY>0)
		                toY = 0;
		            else if(toY<initwinHeight-eleHeight)
		                toY = initwinHeight-eleHeight;
		            
		            $initScrollObj.css({
		               "left":toX,
		               "top":toY 
		            });
		            
		            return false;
		        });
		        function initScrollUp(){
		        	_this.grabHandOpen($initScrollObj, _this);
		            unbindMoveAndUp();
	            	$(document).unbind("mouseout");
		            
		            return false;
		        }
	            $(document).bind(mouseUpBind, initScrollUp);
	            $(document).bind("mouseout", initScrollUp);
	            return false;
	        });
        }
    };

    Expo360 = function( parameters ){
    	
    	var expo = new Expo360obj(parameters);
    	
    	expo.loadXml();
    	
    	///////////////////////////////////////////////
	// CONTROL FUNCTION
	this.goTo = function(degree){
	  expo.goToDegree = true;
	  expo.goToDegreeNum = degree;
	}
	this.zoomTo = function(zoomToNum){
	  expo.zoom = zoomToNum;
	}
	///////////////////////////////////////////////
    	
    	//return expo;
    	
    	
    	
    };
    
    
    
    ///////////////////////////////////////////////
    // BUTTONS ENABLE AND DISABLE
    function disableButton($btn, disabledAlpha){
        if( !$btn.hasClass("disabled") ){
            $btn.addClass("disabled");
            $btn.stop().fadeTo(300, disabledAlpha);
            $("span", $btn).stop().fadeTo(300, 0); 
            $btn.css("cursor", "default");
        }
    }
    function enableButton($btn){
        if($btn.hasClass("disabled")){
            $btn.removeClass("disabled");
            $btn.stop().fadeTo(300, 1);
            $btn.css("cursor", "pointer");
        }
    }
    ///////////////////////////////////////////////


    ///////////////////////////////////////////////
    //HELPING FUNCTIONS
    function updateTooltipPosition($obj, rel){
        var linkPosition = $obj.offset();
        var $tooltip = $(".tooltip[rel='"+rel+"']");
        
        var top = linkPosition.top - $tooltip.outerHeight() - 3;
        var left = linkPosition.left - ($tooltip.width()/2) + parseInt($obj.width(), 10)/4 -1;
        
        $tooltip.css({
            "top": top,
            "left": left
        });
        return $tooltip;
    }
    function changeTooltipText(rel, newText){
        var $tooltip = $(".tooltip[rel='"+rel+"'] span");

        $tooltip.text(newText);
    }
    function unbindMoveAndUp(){
        $(document).unbind(mouseMoveBind);
        $(document).unbind(mouseUpBind);
    }
    
    function processFont(object, font, color, size){
    	object.css({"font-family" : font,
                    "color" : color,
                    "font-size" : size +"px"
                });
    }
    function addRoundCorners(object, value){
        object.css({    "-webkit-border-radius" : value,
                    "-moz-border-radius" : value,
                    "-o-border-radius" : value,
                    "border-radius" : value
                });
    }
    function processColorAndPattern(object, color, alpha, pattern){
        //  color attributes
        if(alpha != "0" && alpha != 0){
            var filter = getFilter(color, alpha);
            var rgba = getRGBA(color, alpha);
            
            object.css({    "background-color" : color,
                        "filter" : filter,
                        "background" : rgba
                    });
            
        }
        //  pattern attributes
        if(pattern != "none")
            object.css({    "background-image" : "url("+pattern+")",
                        "background-repeat" : "repeat"
                      });
    }
    
    function preventDragDefault($obj){
        if (isIE) 
            $obj.get(0).onselectstart = function () { return false; };
        $obj.get(0).onmousedown = function(e){e.preventDefault();};
    }
    function getFilter(color, alpha){
        var color_alpha = parseInt((parseFloat(alpha, 10)*255)).toString(16);
        var filter = "progid:DXImageTransform.Microsoft.gradient(startColorstr=#"+color_alpha+color.substring(1, 3)+color.substring(3, 5)+color.substring(5, 7)+
                                        ",endColorstr=#"+color_alpha+color.substring(1, 3)+color.substring(3, 5)+color.substring(5, 7)+")";
        
        return filter;
    }
    function getRGBA(color, alpha){
        var rgba = "rgba("+color.substring(1, 3)+", "+color.substring(3, 5)+", "+color.substring(5, 7)+", "+alpha+")";
        return rgba;
    }
    ///////////////////////////////////////////////
});
