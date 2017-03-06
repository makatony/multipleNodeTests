var networkArch = "[2, 3, 1]";
var NeuronRadius = 25;
var focusNeuron;
var thisPrevNeuron;
var allNeuronsInOriginalPosition = true;
var xTraining = '[[3,5],[5,1],[10,2]]';
var yExpected = '[0.75,0.82,0.93]';

function setup() {
	
	createCanvas(600, 300);
	
	
	setArchitectureBtn = createButton('Set new architecture').mousePressed(setArchitecture);
	
	
	resetViz = createButton('Reset Visualization').mousePressed(function () {
		allNeuronsInOriginalPosition = false;
	});
	
	
	
	fwdPropBtn = createButton('Forward Propagation').mousePressed(function () {
		xTraining = JSON.parse(select('#xTraining').value()); 
		network.y = JSON.parse(select('#yExpected').value()); 
		network.fwdPropagation(xTraining); 
		
		var currentdate = new Date();
		var dateString = "["+currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds()+"] ";
		var textareaString = dateString;
		textareaString += "Forward propagation result below | Mean Squared Error: "+network.calculateCost()+"\n";
		textareaString += prtMatrix(network.yHat,"\n",","); 
		// textareaString += prtMatrix(network.yHat,"\n",","); 
		
		select('#annConsole').html(textareaString+"\n"+select('#annConsole').value())
	});
	
	
	
	backPropBtn = createButton('Back Propagation').mousePressed(function () {
		
		result = network.backPropagation();
		
		var currentdate = new Date();
		var dateString = "["+currentdate.getHours() + ":" + currentdate.getMinutes() + ":" + currentdate.getSeconds()+"] ";
		var textareaString = dateString;
		if (result == "error") textareaString += "Back propagation: Error returned";
		else textareaString += "Back propagation status: weights were updated";
		select('#annConsole').html(textareaString+"\n"+select('#annConsole').value())
	});
	
	
	vizInfo = createDiv('').id('vizInfo').style('padding','10px')
		.child(
			createElement('table').child(
				createElement('tr').child(
					createElement('td')
							.child(createP('Network Architecture: <br>').id('netArch').style('padding','10px'))
							.child(createInput(networkArch).id('networkArch'))
							.child(setArchitectureBtn).style('border','1px solid')
							.style('width','40%')
				).child(
					createElement('td')
						.child(createP('LayerNb: ').id('neuronNetworkPosLayer').child(createElement('span','N/A').id('neuronNetworkPosLayerNb')))
						.child(createP('NeuronNb: ').id('neuronNetworkPosNeuron').child(createElement('span','N/A').id('neuronNetworkPosNeuronNb')))
						.child(createP('Activity: ').id('neuronAct').child(createElement('span','N/A').id('neuronActivity')))
						.child(resetViz).style('border','1px solid')
				)
			).style('width','100%')		
		
		);
		
		
	createP('');

	createP('Forward Propagation : <br>').id('fwdProp').style('padding','10px')
		.child(createP('testing values: ')
			.child(createInput(xTraining).id('xTraining'))
		)
		.child(createP('expected values: ')
			.child(createInput(yExpected).id('yExpected'))
		)			
		.child(fwdPropBtn);
	createP('Back Propagation : <br>').id('backProp').style('padding','10px')
		.child(backPropBtn);
	
	annParams = createDiv('').id('annParams').child(
		createElement('table').child(
			createElement('tr')
				.child(createElement('td').child(fwdProp))
				.child(createElement('td').child(backProp))
		).style('width','100%')
	).child(
		createElement('textarea').id('annConsole').style('width','100%').style('height','100px')
	);
	
	
	setArchitecture();

}

function draw() {
	background(0);
	
	if (!network.layers[0].neurons[0].viz) return;

	if (!allNeuronsInOriginalPosition)
		moveToOriginalPos();

	for (var i = 0; i < network.layers.length; i++) {
		var thisLayer = network.layers[i];

		for (var j = 0; j < thisLayer.neurons.length; j++) {
			var thisNeuron = thisLayer.neurons[j];

			fill(200);
			stroke(255);

			if (thisNeuron.viz.intersectsMouse()) {
				fill(255); focusNeuron = thisNeuron;
				select('#neuronNetworkPosLayerNb').html(thisNeuron.viz.networkPos.layerNb);
				select('#neuronNetworkPosNeuronNb').html(thisNeuron.viz.networkPos.neuronNb);
				select('#neuronActivity').html(thisNeuron.getActivitiesVector());
			}
			if ((!thisNeuron.viz.intersectsMouse()) && (focusNeuron == thisNeuron)) {
				focusNeuron = "";
			}

			ellipse(thisNeuron.viz.pos.x, thisNeuron.viz.pos.y, NeuronRadius * 2);

			if (i == 0)
				continue;

			for (var k = 0; k < network.layers[i - 1].neurons.length; k++) {
				var thisPrevNeuron = network.layers[i - 1].neurons[k];

				if ((focusNeuron instanceof Neuron) && ((focusNeuron != thisPrevNeuron) && (focusNeuron != thisNeuron)))
					continue;

				var col = color(200, 200, map(k, 0, network.layers[i - 1].neurons.length - 1, 0, 225));
				fill(col);
				stroke(col);
				line(thisPrevNeuron.viz.pos.x, thisPrevNeuron.viz.pos.y, thisNeuron.viz.pos.x, thisNeuron.viz.pos.y);

				var midpoint = midPoint(thisPrevNeuron.viz.pos, thisNeuron.viz.pos);
				var thisText = roundDec(thisNeuron.weights[k], 2);
				push();
				noStroke();
				textAlign(LEFT, CENTER);
				text(thisText, midpoint.x, midpoint.y);
				pop();
			}
		}
	}

	
	// functions

	stroke(255);
	var xMin = -5;
	var xMax = 5;
	var yMin = 0;
	var yMax = 1;
	var sigYval = 0;
	for (var i = 0; i <= width; i++) {
		sigXval = map(i,0,width,xMin,xMax);
		// sigYval = sigmoidFn(sigXval);
		// sigYval = sigmoidPrimeFn(sigXval);
		Yvalue =  map(sigYval,yMin,yMax,height,0)
		point(i,Yvalue);
	}
	
}

var setArchitecture = function() {
	network = new Network();
	network.viz = {};
	network.viz.initNeuronPositions = initNeuronPositions;
	
	networkArch = JSON.parse(select('#networkArch').value());
	network.generateNetwork(networkArch);
	network.viz.initNeuronPositions();
	select('#annConsole').html("")
}

var initNeuronPositions = function () {
	//initializing neuron positions and adding new properties to the neuron object
	var Xsegmentation = width / network.layers.length;
	var Xoffset = Xsegmentation / 2

	for (var i = 0; i < network.layers.length; i++) {
		var thisLayer = network.layers[i];
		var x = Xoffset + Xsegmentation * i;

		var Ysegmentation = height / thisLayer.neurons.length;
		var Yoffset = Ysegmentation / 2

		for (var j = 0; j < thisLayer.neurons.length; j++) {
			var thisNeuron = thisLayer.neurons[j];
			var y = Yoffset + Ysegmentation * j;

			//adds visualization properties to the neurons:
			thisNeuron.viz = {};
			thisNeuron.viz.pos = createVector(x, y);
			thisNeuron.viz.originalPos = createVector(x, y);
			thisNeuron.viz.networkPos = {
				layerNb: i,
				neuronNb: j
			};
			thisNeuron.viz.intersectsMouse = function () {
				return (this.pos.dist(createVector(mouseX, mouseY)) < NeuronRadius);
			} //here it is without .viz because the function is inside .viz already


		}
	}
}


function moveToOriginalPos() {

	allNeuronsInOriginalPosition = true;

	for (var i = 0; i < network.layers.length; i++) {
		var thisLayer = network.layers[i];

		for (var j = 0; j < thisLayer.neurons.length; j++) {
			var thisNeuron = thisLayer.neurons[j];

			if (thisNeuron.viz.originalPos.dist(thisNeuron.viz.pos) < 5)
				thisNeuron.viz.pos = thisNeuron.viz.originalPos.copy();
			if (!thisNeuron.viz.pos.equals(thisNeuron.viz.originalPos)) {
				vel = thisNeuron.viz.originalPos.copy();
				vel.sub(thisNeuron.viz.pos);
				vel.setMag(10);
				thisNeuron.viz.pos.add(vel);
				allNeuronsInOriginalPosition = false;
			}
		}
	}
}

function initVisualization() {}

function midPoint(pos1, pos2) {
	return createVector((pos1.x + pos2.x) / 2, (pos1.y + pos2.y) / 2);
}
function roundDec(num, dec) {
	var dec = dec || 0;
	return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function mouseDragged() {
	if (focusNeuron instanceof Neuron) {
		focusNeuron.viz.pos = createVector(mouseX, mouseY);
	}
}

// function stringifyMatrix (matrix) {
// var string = "";
// for (var i =0, matrix.length
// }
