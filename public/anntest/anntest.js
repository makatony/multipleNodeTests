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
function sigmoidPrimeFn(z) {
	var e = Math.exp(1);
  return Math.pow(e,-z) / Math.pow(1 + Math.pow(e,-z), 2);
}

var elementwiseMatrixFn = function (matrix, fn) {
	var matrix = (matrix instanceof Array) ? matrix : [ matrix ]; //if it is only a scalar and not a matrix, transform into array
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
	this.activities = [];

	this.populateWeights = function(nbWeights) { //if nbWeights is zero, then this is the input layer
		// this.weights = [];
		for(var i = 0; i < nbWeights; i++) {
			this.weights.push(rand(-1,1));
		}
	}
	
	this.getWeightsVector = function () {
		return this.weights;
	}
	this.getActivitiesVector = function () {
		return this.activities;
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
	
	this.populateNeuronActivities = function(inputMatrix) {
		for(var i = 0; i < this.neurons.length; i++) {
			this.neurons[i].activities = inputMatrix[i];
		}
	}
	
	this.populateNeuronWeights = function(inputMatrix) {
		if ((math.size(inputMatrix).length = 1) && (this.neurons.length == 1)) { 
			this.neurons[0].weights = inputMatrix;
		}
		else {
			for(var i = 0; i < this.neurons.length; i++) {
				this.neurons[i].weights = inputMatrix[i];
			}
		}
	}
	
	this.getWeightMatrix = function () {
		var matrix = [];
		for(var i = 0; i < this.neurons.length; i++) matrix.push(this.neurons[i].getWeightsVector());
		return math.transpose(math.matrix(matrix)).toArray(); // first column are the weights of first neuron
	}
	
	this.getActivityMatrix = function () {
		var matrix = [];
		for(var i = 0; i < this.neurons.length; i++) matrix.push(this.neurons[i].getActivitiesVector());
		return math.transpose(math.matrix(matrix)).toArray(); // first column are the activities of first neuron
	}
}
function Network () {
	this.layers = [];
	this.y = [];
	this.yHat = [];
	
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
	
	
	this.fwdPropagation = function (xTraining_a) { //xTraining example: [[3,5],[5,1],[10,2]]. the rows are observations. index 0 is for first neuron, index 1 for second. so we transpose
		this.xTraining = xTraining_a;
		var X_m = math.matrix(xTraining_a);				//input matrix
		var Xt_a = math.transpose(X_m).toArray(); 	//input array transposed. each row of Xt_a are the weights of one input neuron: [[3, 5, 10],[5, 1, 2]]
		if (math.matrix(network.layers[0].neurons).size()[0] != math.matrix(Xt_a).size()[0]) {
			alert("input matrix is invalid");
			return;
		}
	
		//scaling: dividing each neuron vector by the max of the neuron. e.g. max([3, 5, 10]) = 10, so [3, 5, 10] turns to [0.3, 0.5, 1]
		Xt_a.forEach(function(elt,i) { Xt_a[i] = math.divide(Xt_a[i],math.max(Xt_a[i])); } );
		
		// populating activities in xTraining layer: xTraining example: [[3,5],[5,1],[10,2]] neuron1: [3,5,10], neuron2: [5,1,2]
		this.layers[0].populateNeuronActivities(Xt_a);
		
		
		//doing it for all hidden layers and output layer
		for (var l = 1; l < this.layers.length; l++) {
			var X_m = math.matrix(this.layers[l-1].getActivityMatrix()); //transposing matrix arrays
			var W_m = math.matrix(this.layers[l].getWeightMatrix()); //transposing matrix arrays
			var Z_m = math.multiply(X_m, W_m); //matrix multiplication
			var A_a = elementwiseMatrixFn(Z_m.toArray(), sigmoidFn); //applying activation function sigmoid
			
			this.layers[l].incomingActivityZ = math.squeeze(Z_m.toArray()); //used for backpropagation. stored on layer (could have been stored on neuron as well)
			
			//populating activities: first column of A are the activities for first neuron in new layer. so we transpose to add these columns there
			var At_a = math.transpose(math.matrix(A_a)).toArray();		
			this.layers[l].populateNeuronActivities(At_a);
		}
		this.outputZmatrix = math.squeeze(Z_m.toArray());
		this.yHat = math.squeeze(A_a); //yHat comes out as a [[n],[m],[o]] array. by squeezing it becomes [n,m,o] -> is this a problem? TODO
		return this.yHat;
		
		
		
		// var X_m = math.matrix(this.layers[0].getActivityMatrix()); //transposing matrix arrays
		// var W_m = math.matrix(this.layers[1].getWeightMatrix());  //transposing matrix arrays
		// var Z_m = math.multiply(X_m,W_m); 						//matrix multiplication
		// var A_a = elementwiseMatrixFn(Z_m.toArray(),sigmoidFn);	//applying activation function sigmoid
		
		//first column of A are the activities for first neuron in new layer. so we transpose to add these columns there
		// var At_m = math.transpose(math.matrix(A_a));
		// var At_a = At_m.toArray();
		
		// createP(prtMatrix(X_m.toArray()));
		// createP(prtMatrix(W_m.toArray()));
		// createP(prtMatrix(Z_m.toArray()));
		// createP(prtMatrix(A_a));
		// createP(prtMatrix(At_m.toArray()));
		// console.log(prtMatrix(X_m.toArray(),"\n",","));
		
		// for (var i = 0; i < this.layers[1].neurons.length; i++) {
			// this.layers[1].neurons[i].activities = At_a[i];
		// }
		// console.log(prtMatrix(Z_m.toArray(),"\n",","));
		// console.log(prtMatrix(this.layers[1].getActivityMatrix(),"\n",","));
		// if (math.deepEqual(math.matrix(A_a),math.matrix(this.layers[1].getActivityMatrix()))) console.log("ok1");
	}
	
	this.calculateCost = function (prediction,observation) { // assumes an Nx1 vector
		var prediction = prediction||this.y;
		var observation = observation||this.yHat;
		prediction = (prediction instanceof Array) ? prediction : [ prediction ];
		observation = (observation instanceof Array) ? observation : [ observation ];
		//mean squared error
		var sum = 0;
		for (var i = 0; i < prediction.length; i++) {
			sum += Math.pow(prediction[i] - observation[i],2);
		}
		return (sum/prediction.length);
	
	}
	
	
	//Backpropagation with stochastic gradient descent for convex cost curves in a batch style (where we can use all our 3 trainings)
	this.backPropagation = function (prediction,observation) { //prediction is Y
		if ((!this.yHat) || (this.yHat.length == 0)) {
			alert("Before backpropagation, it is required to do 1x forward propagation to set the activities of the neurons");
			return "error";
			
		}
		
		var prediction = prediction||this.y;
		var observation = observation||this.yHat;
		
		//starting backpropagation from output layer
		// dJdW2
		var diff_a = math.subtract(prediction,observation); //difference between Y and yHat
		diff_a = math.multiply(-1,diff_a);
		var Z3_a = network.layers[network.layers.length-1].incomingActivityZ;
		var z3Prime_a = elementwiseMatrixFn(Z3_a, sigmoidPrimeFn);
		// createP(prtMatrix(outputZmatrix));
		// createP(prtMatrix(zPrime_v));
		delta3_a = math.dotMultiply(z3Prime_a,diff_a); //element wise multiplication to get backpropagating eval
		
		var A_a = network.layers[network.layers.length-2].getActivityMatrix();
		var At_a = math.transpose(A_a);
		var dJdW2 = math.multiply(At_a,delta3_a);
		 
		 
		 
		 // dJdW1 comes after dJdW2 because we need the error from the previous layer when backpropagating
		 
		W2_a = network.layers[network.layers.length-1].getWeightMatrix();
		W2_a = math.squeeze(W2_a);
		W2t_a = math.transpose(W2_a);
		 
		var Z2_a = network.layers[network.layers.length-2].incomingActivityZ;
		var z2Prime_a = elementwiseMatrixFn(Z2_a, sigmoidPrimeFn);
		var delta2_a = math.multiply(delta3_a,W2t_a);
		var delta2_a = math.multiply(delta2_a,z2Prime_a);
		
		var X_a = this.xTraining;
		var Xt_a = math.transpose(X_a);
		var dJdW1 = math.multiply(Xt_a,delta2_a);
		 
		
		W2 = network.layers[2].getWeightMatrix(); W2 = math.squeeze(W2);
		W1 = network.layers[1].getWeightMatrix(); W1 = math.squeeze(W1);
		
		W2 = math.subtract(W2,math.multiply(3,dJdW2));
		W1 = math.subtract(W1,math.multiply(3,dJdW1));
		
		network.layers[2].populateNeuronWeights(math.transpose(W2));
		network.layers[1].populateNeuronWeights(math.transpose(W1));
		
		
		return {"W1":W1,"W2":W2};
	}
}


