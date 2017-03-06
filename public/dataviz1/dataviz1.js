bubbles = [];
mouseListeners = [];
mode = "Bubble";

function preload() {
	birdsAmerica = loadJSON("birds_north_america.json");
}


function setup() {
	console.log(JSON.stringify(birdsAmerica,null,4));
	
	createCanvas(750,600);
	
	var maxMagnitude = 0;
	var minMagnitude = 0;
	for (var i = 0; i < birdsAmerica.birds.length; i++) {
		var thisBirdsArray = birdsAmerica.birds[i];
		if (i == 0) minMagnitude = thisBirdsArray.members.length
		var thisMagnitude = thisBirdsArray.members.length;
		
		var reCount = 0;
		var re = /^[\w|\-|'|’]+\s/; //https://regex101.com
		thisBirdsArray.members.forEach(function (elt) { if (!re.exec(elt)) reCount++; });
		// if (reCount > 0) console.log (thisBirdsArray.family + " = " + thisMagnitude + " - "+reCount + " = " + max(1,thisMagnitude - reCount));
		// Regex matches members in a family that are only one word. for each member in the family that is only one word, remove one point in magnitude
		thisMagnitude = max(1,thisMagnitude - reCount);
		
		bubbles.push(new Bubble({ mag: thisMagnitude, family: birdsAmerica.birds[i].family, members: birdsAmerica.birds[i].members }));
		if (thisMagnitude > maxMagnitude) maxMagnitude = thisMagnitude;
		if (thisMagnitude < minMagnitude) minMagnitude = thisMagnitude;
	}
	// console.log(bubbles);

	//defines position vector without overlapping the ones that have been created yet
	for (var i = 0; i < bubbles.length; i++) {
		bubbles[i].r = map(bubbles[i].mag,minMagnitude,maxMagnitude,0,25);
		bubbles[i].col = map(bubbles[i].mag,minMagnitude,maxMagnitude,100,255);
		
		var overlaps = true;
		while (overlaps) { //setting X and Y positions
			overlaps = false;
			bubbles[i].setInitPosition(createVector(random(bubbles[i].r,width-bubbles[i].r),random(bubbles[i].r,height-bubbles[i].r)));
			for (var j = 0; j < i; j++) {
				if (bubbles[i].isColliding(bubbles[j])) overlaps = true;
			}
		}
	}
}

function draw () {
	background (0);
	noStroke();
	
	for (var i = 0; i < bubbles.length; i++) {
		bubbles[i].update();
		bubbles[i].draw();
		
		//check collisions
		if (mode != "Asteroid") continue;
		for (var j = i+1; j < bubbles.length; j++) {
			if (bubbles[i].isAsteroid && bubbles[j].isAsteroid) { //comparing two asteroids
				if (bubbles[i].isColliding(bubbles[j])) {
					bubbles[i].bounces(bubbles[j]);
					// bubbles[j].explode(bubbles[i]);
				}
			}
		}
	}

}

mouseListeners.push({ type:"mousePressed", fn:function () {
	var bubblesLength = bubbles.length; // required because in the loop we are adding/removing objects of the array
		for (var i = bubblesLength-1; i >= 0 ; i--) {
			if (bubbles[i].intersectsMouse() && bubbles[i].isAsteroid) bubbles[i].explode(i);
		}	
}});


function keyPressed() {
	if (keyCode == 32) { //spacebar
		if (mode == "Asteroid") mode = "Bubble";
		else mode = "Asteroid";
		
		if (mode == "Asteroid") {
			for (var i = 0; i < bubbles.length; i++) {
				if (bubbles[i].r > 5) bubbles[i].resetAsteroid();
			}
		} 
		else {
			for (var i = 0; i < bubbles.length; i++) {
				bubbles[i].resetBubble(); // -> POS is being set to UNDEFINED for some reason
			}
		}
	} 
}



// ############################
// #### UTIL: MOUSE EVENTS ####
// ############################

var doubleClickMS = 0;
var isDoubleClick = false;
var isMouseDrag = false;
var mousePressed = function () {
	this.isDoubleClick = (floor(millis()-doubleClickMS) <= 500?true:false); //for some reason this.isDoubleClick is passed to the functions without problems
	doubleClickMS = millis(); //resets doubleclick timer
	
	mouseEventCallHandlers("mousePressed",arguments);
	this.isMouseDrag = false;
}
var mouseClicked = function () { mouseEventCallHandlers("mouseClicked",arguments); this.isMouseDrag = false; }
var mouseReleased = function() { mouseEventCallHandlers("mouseReleased",arguments); this.isMouseDrag = false; }
var mouseDragged = function() {	this.isMouseDrag = true; mouseEventCallHandlers("mouseDragged",arguments); }
var mouseEventCallHandlers = function (type,arguments) { mouseListeners.forEach(function (elt) { if (elt.type == type) elt.fn.apply(this, arguments); } ); }


// #########################
// #### UTIL: UTILITIES ####
// #########################

function printR(obj) {
	return JSON.stringify(obj, null, 4);
}



