var networkArch = [2, 3, 1];
var NeuronRadius = 25;
var focusNeuron;
var thisPrevNeuron;
var allNeuronsInOriginalPosition = true;

function setup() {
	createP("try in console:");	
	createElement('code','xTraining = [[3,5],[5,1],[10,2]]; y = [0.75,0.82,0.93]; yHat=network.fwdPropagation(xTraining); console.log(prtMatrix(yHat,"\n",","));');	
	
	createCanvas(600, 300);
	createP('LayerNb: ').id('neuronNetworkPosLayer').child(createElement('span','N/A').id('neuronNetworkPosLayerNb'));
	createP('NeuronNb: ').id('neuronNetworkPosNeuron').child(createElement('span','N/A').id('neuronNetworkPosNeuronNb'));
	createP('Value: ').id('neuronVal').child(createElement('span','N/A').id('neuronValue'));
	button = createButton('Reset Visualization').mousePressed(function () {
			allNeuronsInOriginalPosition = false;
		});

	network = new Network();
	network.generateNetwork(networkArch);

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

function draw() {
	background(0);

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
				select('#neuronValue').html(thisNeuron.getValuesVector());
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
