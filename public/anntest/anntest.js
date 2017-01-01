
var hyperparameters = {
	population: 50,
	elitism: 0.2,
	randomBehaviour: 0.2,
	mutationRate: 0.1,
	mutationRange: 0.5,
	networkArch: [2, 3, 1], //default value
	historic: 0,
	lowHistoric: false,
	scoreSort: -1,
	nbBreededChildren: 1
}

var sigmoidFn = function(x) {
	var e = Math.exp(1);
	return (1 / (1 + Math.pow(e,-1*x)));
}
var rand = function (min, max) {
	return p5.prototype.random(min, max);
}

function Neuron () {
	var Activation = sigmoidFn;
	this.weights = []; //weights from this neuron to the next (or previous?) layer. if next layer has 3 neurons, the size of this array is 3
	this.value = 0;

	this.populateWeights = function(nbWeights) { //if nbWeights is zero, then this is the input layer
		// this.weights = [];
		for(var i = 0; i < nbWeights; i++) {
			this.weights.push(rand(-1,1));
		}
	}
	
	this.getWeightMatrix = function () {
		var matrix = [];
		for(var i = 0; i < this.weights.length; i++) matrix.push(this.weights[i]);
		return matrix;
	}

}
function Layer (id) {
	this.id = id || 0;
	this.neurons = [];

	this.createAndPopulateNeurons = function(nbNeurons, nbInputs) {
		this.neurons = [];
		for(var i = 0; i < nbNeurons; i++) {
			var n = new Neuron();
			n.populateWeights(nbInputs);
			n.value = this.id+""+i;
			this.neurons.push(n);
		}
	}
	
	this.getWeightMatrix = function () {
		var matrix = [];
		for(var i = 0; i < this.neurons.length; i++) matrix.push(this.neurons[i].getWeightMatrix());
		return matrix;
	}
}
function Network () {
	this.layers = [];
	
	this.generateNetwork = function (networkArch) { //number of neurons of input, output and hidden layers
		//networkArch is like [2,[3],1] or [2,[2,3],1] i.e. two neurons in input layer, two in first hidden, 3 in second hidden and 1 neuron in output layer
		var prevLyNeuronsNb = 0;
		var thisLayer;

		for(var i = 0; i < networkArch.length; i++) {
			prevLyNeuronsNb = i >=0?networkArch[i-1]:0; //for first layer (input layer) i=0, so i-1 cannot work. then take value 0
			thisLayer = new Layer(i);
			thisLayer.createAndPopulateNeurons(networkArch[i], prevLyNeuronsNb);
			this.layers.push(thisLayer);
		}
	}
}
