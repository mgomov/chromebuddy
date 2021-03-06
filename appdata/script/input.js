console.log("sixth");

/* input.js
 * Input-related handlers go here (e.g. click listeners, mouse movement listeners, etc)
 */


 
$("recording_info_name_edit").addEventListener('input', function(event){
	master.Recordings[preview_index].title = document.getElementById("recording_info_name_edit").value;
	save_to_master();
	reset_recording_browser();
});

$("recording_info_name_edit").addEventListener('blur', function(event){
	console.log("Saving name edits to master...");
	save_to_master();
});

/*
document.getElementById("recording_info_date_time").addEventListener('input', function(event){
	document.getElementById("recording_info_div").current_point.annotation = document.getElementById("point_annotation_edit").value;
});
*/

$("recording_info_load").addEventListener('click', function(event){
	load_recording(preview_index);
	preview_display = false;
	reset_preview();
});

$("recording_info_delete").addEventListener('click', function(event){
	delete_recording(preview_index);
	preview_display = false;
	reset_recording_browser();
	reset_preview();
});


document.getElementById("recording_info_notes").addEventListener('input', function(event){
	master.Recordings[preview_index].notes = document.getElementById("recording_info_notes").value;
}); 
 
$("recording_info_notes").addEventListener('blur', function(event){
	console.log("Saving notes edits to master...");
	save_to_master();
}); 
 
$("file_merge").addEventListener('click', function(event){
	chrome.fileSystem.chooseEntry({type: 'openFile', acceptsMultiple : true}, chromebuddy_load);
});

$("file").addEventListener('click', function(event){
	chrome.fileSystem.chooseEntry({type: 'openDirectory'}, load_file);
});
 
document.getElementById("point_annotation_edit").addEventListener('input', function(event){
	document.getElementById("point_annotation_div").current_point.annotation = document.getElementById("point_annotation_edit").value;
});

image_canvas.addEventListener('mousemove', function(event) {
	if(drag){
		delta++;
		if(delta > 2){
			justdragged = true;
			if(!moving_point){
				var x = event.pageX - image_canvas.offsetLeft;
				var y = event.pageY - image_canvas.offsetTop;
				
				if(current_event < 0){
					return;
				}
				
				for(var i = 0; i < recording.Events[current_event].Points.length; i++){
					var a_point = recording.Events[current_event].Points[i];
					if(x >= a_point.x - 10 && x <= a_point.x + 10){
						if(y >= a_point.y - 10 && y <= a_point.y + 10){
							moving_point = recording.Events[current_event].Points[i];
						}
					}
				}
			}
			if(!moving_point || moving_point.locked){
				return;
			}
			moving_point.x = event.clientX;
			moving_point.y = event.clientY;
		}
	} else {
		var x = event.clientX;
		var y = event.clientY;
		
		if(y > (image_canvas.height - 1/6 * image_canvas.height)){
			seek_display = true;
		} else {
			seek_display = false;
		}
		
		if(seek_canvas.relativeX <= x && x <= seek_canvas.relativeX + seek_canvas.width && seek_canvas.relativeY <= y && y <= seek_canvas.relativeY + seek_canvas.height && recording){
			x = event.clientX - seek_canvas.relativeX;
			y = event.clientY - seek_canvas.relativeY;
			var mo_event = get_event((x / (seek_canvas.width - 15)) * audio.duration);
			seek_draw = true;
			seek_draw_event = mo_event;
			seek_draw_x = event.clientX;
		} else {
			seek_draw = false;
		}
	}
});

image_canvas.addEventListener('mouseup', function(event) {
	delta = 0;
	drag = false;
	moving_point = undefined;
});

image_canvas.addEventListener('mousedown', function(event) {
	drag = true;
});

// Click listener for translating coordinates and passing them to what handles them 
image_canvas.addEventListener('click', function(event) {
	if(editing_point){
		editing_point = false;
		document.getElementById("point_annotation_div").style.display = "none";
		document.getElementById("point_annotation_div").current_point = undefined;
		save_to_master();
		return;
	}
	// Don't want to register a click if we just dragged (which js will do), so 
	// detect our just having dragged and return from the function. 
	if(justdragged){
		justdragged = false;
		return;
	}

	
	// Hide the point context menu if it's displaying
	if(point_ctx_display){
		point_ctx_display = false;
		point_ctx.style.display ="none";
	}
	
	var x = event.pageX - image_canvas.offsetLeft;
	var y = event.pageY - image_canvas.offsetTop;
	
	if(!recording){
		return;
	}
	
	// Checking if the click is in the seek bar
	if(seek_canvas.relativeX <= x && x <= seek_canvas.relativeX + seek_canvas.width && seek_canvas.relativeY <= y && y <= seek_canvas.relativeY + seek_canvas.height){
		console.log("Clicked the seek bar at (" + x +", " + y + ").");
		audio.currentTime = seek_calculate(x);
	// Else, the click isn't in the bar, so we want to pause/play the video
	}else{
		if(current_event >= 0){
			// Iterate through all active points; if within the 
			// Bounds of a point, flip its active state and return
			// (so as not to pause inadvertently the recording
			for(var i = 0; i < recording.Events[current_event].Points.length; i++){
				var current_point = recording.Events[current_event].Points[i];
				if(x >= current_point.x - 10 && x <= current_point.x + 10){
					if(y >= current_point.y - 10 && y <= current_point.y + 10){
						console.log("Flipping a point's active state...");
						recording.Events[current_event].Points[i].active = !(recording.Events[current_event].Points[i].active);
						return;
					}
				}
				
				lines = current_point.annotation.split(/\r\n|\r|\n/);
				var heightcalc = 12 * lines.length + 12;
				
				var xstart;
				var ystart;
				
				if(current_point.x + current_point.width > image_canvas.width 
					|| current_point.orientation == 2 
					|| current_point.orientation == 3){
					xstart = current_point.x - current_point.width;
				} else {
					xstart = current_point.x;
				}
				
				if(current_point.y + heightcalc > image_canvas.height 
					|| current_point.orientation == 1 
					|| current_point.orientation == 2){
					ystart = current_point.y - heightcalc;
				} else {
					ystart = current_point.y;
				}
				if(current_point.active){
					if(x >= xstart && x <= xstart + current_point.width){
						if(y >= ystart && y <= ystart + heightcalc){
							editing_point = true;
							var elem = document.getElementById("point_annotation_div");
							var elem2 = document.getElementById("point_annotation_edit");
							elem2.value = current_point.annotation;
							//elem.style.width = current_point.width;
							elem.style.display = "block";
							elem.style.left = xstart + "px";
							elem.style.top = ystart + "px";
							elem.current_point = current_point;
							return; 
						}
					}
				}
			}
		}
		console.log("Clicked the main canvas at (" + x +", " + y + ").");
		if(audio.paused){
			audio.play();
			play_pause_time = 3;
		} else {
			audio.pause();
			play_pause_time = 3;
		}
	}
}, false);

// Right click event; for now, adds an annotation at that point from the annotation input box's value	
image_canvas.addEventListener('contextmenu', function(event) {
	// Don't want the browser's context menu to pop up for now
	event.preventDefault();
	
	var x = event.pageX - image_canvas.offsetLeft;
	var y = event.pageY - image_canvas.offsetTop;
	if(!recording || !recording.Events[current_event]){
		return;
	}
	console.log("Adding a point");
	add_point(x, y, "This is a default annotation\nwith multiple lines\n Click to edit");
}, false);

$("point_more_options").addEventListener('click', function(){
	var elemdiv = document.getElementById("point_more_options_div");
	var elemdiv2 = document.getElementById("point_annotation_div");
	if(elemdiv.style.display == "none" || elemdiv.style.display == ""){
		elemdiv2.style.borderBottomWidth = 0 + "px";
		$("point_more_options").value = "Less Options";
		elemdiv.style.display = "block";
	} else {
		elemdiv2.style.borderBottomWidth = 8 + "px";
		$("point_more_options").value = "More Options";
		elemdiv.style.display = "none";
	}
});

$("point_delete").addEventListener("click", function (){
	for(var i = 0; i < recording.Events[current_event].Points.length; i++){
		if(recording.Events[current_event].Points[i] === document.getElementById("point_annotation_div").current_point){
			console.log("Deleted a point.");
			recording.Events[current_event].Points.splice(i, 1);
			elemdiv2 = document.getElementById("point_annotation_div").style.display = "none";
		}
	}
	save_to_master();
});

$("point_opacity_slider").addEventListener("change", function(){
	var opacity = $("point_change_opacity").value / 100;
	document.getElementById("point_annotation_div").current_point.opacity = opacity;
});

$("point_color_picker").addEventListener("change", function (){
	document.getElementById("point_annotation_div").current_point.color = $("point_color_picker").value;
});

$("point_lock").addEventListener("change", function (){
	document.getElementById("point_annotation_div").current_point.locked = $("point_lock").checked;
});

$("point_orientation_select").addEventListener("change", function (){
	document.getElementById("point_annotation_div").current_point.orientation = $("point_orientation_select").value;
});

function set_preview(recindex){
	preview_index = recindex;
	console.log(master);
	console.log(recindex);
	console.log(master.Recordings.length);
	$("recording_info_div").style.display = "block";
	var notes = $("recording_info_notes");
	var categ = $("recording_info_category");
	var name  = $("recording_info_name_edit");
	var date  = $("recording_info_date_time");
	var image = $("recording_info_preview");
	$("recording_info_div").style.top = $("browser_list").offsetTop + "px";
	$("recording_info_div").style.left = ($("browser_list").offsetLeft + 150) + "px";
	image.src = preview_images[recindex].src;
	notes.value = master.Recordings[recindex].notes;
	// categ.value = ;
	name.value = master.Recordings[recindex].title;
	// date.value = ;
}

function set_preview_display(idx){
	preview_display = !preview_display;
	
	if(!preview_display){
		$("recording_info_div").style.background = "grey";
	}else{
		$("recording_info_div").style.background = "#82E682";
	}
	
	preview_index = idx;
}

function reset_preview(){
	if(preview_display){
		return;
	}
	$("recording_info_div").style.display = "none";
}