var randomText;
var spacepeople;
loadCallback = function(){ };
loadErrorCallback = function(e){ alert("a"); console.log("error"); };


function preload() {
	preloadRandomText();
	preloadSpacePeople();
}


function setup() {
	noCanvas();

	setupRandomText();
	setupSpacePeople();
	setupDOMmanipulations();
	
}

// ############################
// #### UTIL: MOUSE EVENTS ####
// ############################

var doubleClickMS = 0;
var isDoubleClick = false;
var isMouseDrag = false;
mouseListeners = [];
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


// ###########################
// #### DOM MANIPULATIONS ####
// ###########################

var setupDOMmanipulations = function() {
	var randomTextP = select("#randomTextP");
	randomTextP.html("aaa");
	randomTextP.style("color: red");

	var randomTextC = selectAll(".randomTextC");
	randomTextC.forEach(function (elt) {
		elt.style("color: red");
		elt.mouseOver(mouseOverEvent);
	});

	createA("https://www.quora.com/What-is-the-difference-between-JSON-and-JSONP","JSON vs JSONP");
}

var mouseOverEvent = function () {
	this.style("color: pink");
}



// ########################
// #### RANDOMTEXT API ####
// ########################

var preloadRandomText = function() {
	var url = 'http://www.randomtext.me/api/'; //this API doesnt support JSONP
	randomText = loadJSON(url,loadCallback,loadErrorCallback,"json");
}
var setupRandomText = function() {
	if (randomText) {
		randomTextP = createP("randomText");
		randomTextP.html(randomText.text_out);
		Object.assign(randomText, { a: { b: "text", c: "some text" } })
		console.log(printR(randomText));
	}
}





// #########################
// #### SPACEPEOPLE API ####
// #########################

var preloadSpacePeople = function(){
	var url = 'http://api.open-notify.org/astros.json';
	spacepeople = loadJSON(url,loadCallback,loadErrorCallback,"jsonp");
}
var setupSpacePeople = function(){
	if (spacepeople) {
		spacePeopleP = createP("spacepeople").id("spacePeopleP");
		spacePeopleTable(spacepeople,"spacePeopleP");
		print(printR(spacepeople));
	}
}
var spacePeopleTable = function(spacepeople,anchor) {
	var table = createElement("table").id("spacePeopleT").style("border: 1px solid black;");

	table.child(
		createElement("tr").child(
			createElement("th","craft")).child(
			createElement("th","name"))
		)
	for (var i = 1; i < spacepeople.people.length; i++) {
	table.child(
		createElement("tr").child(
			createElement("td",spacepeople.people[i].craft)).child(
			createElement("td",spacepeople.people[i].name))
		)	
	}
	select("#"+anchor).html("").child(table); //clears the html of the spacePeopleP then adds table as child node
	
	
}
