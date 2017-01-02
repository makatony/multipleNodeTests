//Inspiration for ANN structure: https://github.com/xviniette/AsteroidsLearning
//mathJS documentation: http://mathjs.org/docs/index.html


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

var elementwiseMatrixFn = function (matrix, fn) {
	return matrix.map(function (x) {
		
		if (x instanceof Array)	return elementwiseMatrixFn(x, fn);
		else return fn.apply(null,arguments);
	});
}

var rand = function (min, max) {
	return p5.prototype.random(min, max);
}
var prtMatrix =function (matrixArray,linebreak,delimiter) {
	var linebreak = linebreak||"<br>";
	var delimiter = delimiter||"&emsp;";
	return "[[" + matrixArray.join("],"+linebreak+"[").replace(/,/g,delimiter) + "]]";
	
}

function Neuron () {
	var Activation = sigmoidFn;
	this.weights = []; //weights from this neuron to the next (or previous?) layer. if next layer has 3 neurons, the size of this array is 3
	this.values = [];

	this.populateWeights = function(nbWeights) { //if nbWeights is zero, then this is the input layer
		// this.weights = [];
		for(var i = 0; i < nbWeights; i++) {
			this.weights.push(rand(-1,1));
		}
	}
	
	this.getWeightsVector = function () {
		return this.weights;
	}
	this.getValuesVector = function () {
		return this.values;
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
			this.neurons.push(n);
		}
	}
	
	this.populateNeuronValues = function(inputMatrix) {
		for(var i = 0; i < this.neurons.length; i++) {
			this.neurons[i].values = inputMatrix[i];
		}
	}
	
	this.getWeightMatrix = function () {
		var matrix = [];
		for(var i = 0; i < this.neurons.length; i++) matrix.push(this.neurons[i].getWeightsVector());
		return math.transpose(math.matrix(matrix)).toArray(); // first column are the weights of first neuron
	}
	
	this.getValueMatrix = function () {
		var matrix = [];
		for(var i = 0; i < this.neurons.length; i++) matrix.push(this.neurons[i].getValuesVector());
		return math.transpose(math.matrix(matrix)).toArray(); // first column are the values of first neuron
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
	
	
	this.fwdPropagation = function (input) { //input example: [[3,5],[5,1],[10,2]]. the rows are observations. index 0 is for first neuron, index 1 for second. so we transpose
		var I_m = math.matrix(input);				//input matrix
		var It_a = math.transpose(I_m).toArray(); 	//input array transposed. each row of It_a are the weights of one input neuron: [[3, 5, 10],[5, 1, 2]]
		if (math.matrix(network.layers[0].neurons).size()[0] != math.matrix(It_a).size()[0]) alert("input matrix is invalid");
	
		//scaling: dividing each neuron vector by the max of the neuron. e.g. max([3, 5, 10]) = 10, so [3, 5, 10] turns to [0.3, 0.5, 1]
		It_a.forEach(function(elt,i) { It_a[i] = math.divide(It_a[i],math.max(It_a[i])); } );
		
		// populating values in input layer: input example: [[3,5],[5,1],[10,2]] neuron1: [3,5,10], neuron2: [5,1,2]
		this.layers[0].populateNeuronValues(It_a);
		
		
		//doing it for all hidden layers and output layer
		for (var l = 1; l < this.layers.length; l++) {
			var X_m = math.matrix(this.layers[l-1].getValueMatrix()); //transposing matrix arrays
			var W_m = math.matrix(this.layers[l].getWeightMatrix()); //transposing matrix arrays
			var Z_m = math.multiply(X_m, W_m); //matrix multiplication
			var A_a = elementwiseMatrixFn(Z_m.toArray(), sigmoidFn); //applying activation function sigmoid

			//populating values: first column of A are the values for first neuron in new layer. so we transpose to add these columns there
			var At_a = math.transpose(math.matrix(A_a)).toArray();		
			this.layers[l].populateNeuronValues(At_a);
		}
		var yHat = A_a;
		return yHat;
		
		
		
		// var X_m = math.matrix(this.layers[0].getValueMatrix()); //transposing matrix arrays
		// var W_m = math.matrix(this.layers[1].getWeightMatrix());  //transposing matrix arrays
		// var Z_m = math.multiply(X_m,W_m); 						//matrix multiplication
		// var A_a = elementwiseMatrixFn(Z_m.toArray(),sigmoidFn);	//applying activation function sigmoid
		
		//first column of A are the values for first neuron in new layer. so we transpose to add these columns there
		// var At_m = math.transpose(math.matrix(A_a));
		// var At_a = At_m.toArray();
		
		// createP(prtMatrix(X_m.toArray()));
		// createP(prtMatrix(W_m.toArray()));
		// createP(prtMatrix(Z_m.toArray()));
		// createP(prtMatrix(A_a));
		// createP(prtMatrix(At_m.toArray()));
		// console.log(prtMatrix(X_m.toArray(),"\n",","));
		
		// for (var i = 0; i < this.layers[1].neurons.length; i++) {
			// this.layers[1].neurons[i].values = At_a[i];
		// }
		// console.log(prtMatrix(Z_m.toArray(),"\n",","));
		// console.log(prtMatrix(this.layers[1].getValueMatrix(),"\n",","));
		// if (math.deepEqual(math.matrix(A_a),math.matrix(this.layers[1].getValueMatrix()))) console.log("ok1");
	}
}


