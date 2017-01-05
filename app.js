/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
require('dotenv').config({
	path: "envVars.env"
});
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
var server = app.listen(appEnv.port, '0.0.0.0', function () {
	// print a message when the server starts listening
	console.log("server starting on " + appEnv.url);
});


// ######################
// #### SOCKETS: I/O ####
// ######################

var socket = require('socket.io');
var io = socket(server);


io.sockets.on('connection', newConnection); //event listener for a connection

function newConnection (client) { //insert here all functions for a connection
	console.log("new client connected: " +client.id);
	client.on("getNews", getNews);
}




// #####################
// #### ALCHEMY API ####
// #####################




var backupNewsFromFile = require("./alchemyNewsLogitech.json");

var AlchemyDataNewsV1 = require('watson-developer-cloud/alchemy-data-news/v1');
var newsResult = [];

var alchemy_data_news = new AlchemyDataNewsV1({
		api_key: process.env.alchemyAPIkey
	});

var paramsAlch = {
	start: 'now-10d'
	,end: 'now'
	,count: 10
	,return: 'enriched.url.title,enriched.url.author,enriched.url.text'
	,outputMode: 'json'
	,'q.enriched.url.enrichedTitle.keywords.keyword.text': 'IBM'
};

var getNews = function (data) {
	if (data.queryString.length > 0) {
		// Adds the query string and the client ID to the request parameters
		Object.assign(paramsAlch, {
			'q.enriched.url.enrichedTitle.keywords.keyword.text': data.queryString
			,clientID: this.client.id	//since getNews is called in the socket, it gets the context of the socket and this.client.id is passed
		});

		alchemy_data_news.getNews(paramsAlch, sendNewsResult);
	}
}

var sendNewsResult = function (err, news) {
	var result;
	if (err) { console.log('error:', err); result = err; }
	else { 
		// console.log(JSON.stringify(news, null, 2)); 
		result = news; 
	}
	
	//send the data back to the caller
	var sourceFile = "";
	if (result.status == "OK") sourceFile = "watson";
	else sourceFile = "localFile";
	
	
	if (result.status != "OK") { //error case
		if (result.statusInfo == "daily-transaction-limit-exceeded") {
			result = backupNewsFromFile.result;
		}
		else io.sockets.connected[paramsAlch.clientID].emit("getNewsResult",{ result: result } );
	}
	if (result.status == "OK") {
		console.log("successfully fetched news for client id "+paramsAlch.clientID);
		news = result.docs;
		newsResult.push({clientID: paramsAlch.clientID, countArrivedNews:0, sourceFile: sourceFile, news: news }); //adds a new object in news result for this client ID in global array. news sentiment will be filled here
		debugger;
		for (var i = 0; i < news.length; i++) {
			var textToClassify = news[i].source.enriched.url.title;
			classify(textToClassify,classifiers[0].classifier_id,paramsAlch.clientID,classifyNewsCallback);
		}
	}
}

var classifyNewsCallback = function (response,cID) {
	var clientIDfound = false;
	var newsFound = false;
	var foundIndex = -1;
	for (var r = newsResult.length-1; r >= 0; r--) {
		if (newsResult[r].clientID == cID) {
			newsResult[r].countArrivedNews = newsResult[r].countArrivedNews + 1;
			for (i = 0; i < newsResult[r].news.length; i++) {
				if (newsResult[r].news[i].source.enriched.url.title == response.text) {
					newsResult[r].news[i].sentiment = response;
					newsFound = true;
					i = newsResult[r].news.length; //break;
				}
			}
			clientIDfound = true;
			foundIndex = r;
			r = 0; //break
		}
	}
	if (clientIDfound == false) { console.log ("client ID "+cID+" not found in newsResult array"); console.log(newsResult); }
	else if (newsFound == false) console.log ("client ID "+cID+" found in newsResult array but Title cannot be found in news array");
	else console.log ("client ID "+cID+" found in newsResult array");
	
	if ((clientIDfound) && (newsFound)) {
		console.log("one more news sentiment found for client ID " + cID + ": " + response.top_class + " / " + response.text);
		if (newsResult[foundIndex].news.length == newsResult[foundIndex].countArrivedNews) {
			console.log("arrived at end of news for client id " + cID);
			io.sockets.connected[cID].emit("getNewsResult", { result: newsResult[foundIndex] });
		}
		// console.log(JSON.stringify(response, null, 2));
	}
}

// this is the only way i found to tell the client the website URL without PHP
app.get("/getSocketUrl", function(req, res){
    res.json({ url: appEnv.url });
});





// ##########################
// #### NaturalLangCLass ####
// ##########################


var watson = require('watson-developer-cloud');
var fs     = require('fs');
var textToClassify = "";

var classifiers = [];
var classifiedText = [];


var natural_language_classifier = watson.natural_language_classifier({
  username: process.env.nlcUserName,
  password: process.env.nlcPass,
  version: 'v1'
});

var paramsNLC = {
  language: 'en',
  name: 'makatonyNLCservice',
  training_data: fs.createReadStream('./training/NLCtrainingData.csv')
};

var trainClassifier = function () {
	natural_language_classifier.create(paramsNLC, function(err, response) {
	  if (err)
		console.log(err);
	  else
		console.log(JSON.stringify(response, null, 2));
	});
}

var listClassifier = function (callback) {
	natural_language_classifier.list({},
		function(err, response) {
		if (err)
			console.log('error:', err);
		  else {
			// console.log(JSON.stringify(response, null, 2));
			classifiers = response.classifiers;
			callback.call(this,response);
		  }
	});
}
var listCallback = function () {
	console.log("first classifier: "+classifiers[0].classifier_id)
	classifierStatus(classifiers[0].classifier_id,0,statusCallback);
};

var classifierStatus = function (classifierID,classifierIndex,callback) {
	natural_language_classifier.status({
	  classifier_id: classifierID },
	  function(err, response) {
		if (err)
		  console.log('error:', err);
		else {
			classifiers[classifierIndex] = response;
			callback.call(null,response,classifierIndex);
		}
	});
}
var statusCallback = function (response,classifierIndex) {
	// console.log(classifiers);
	if (classifiers[classifierIndex].status == "Available") {
		console.log(classifiers[classifierIndex].classifier_id + " is available")
		// classify(textToClassify,classifiers[classifierIndex].classifier_id,clientID,classifyCallback)
	}
	// console.log(JSON.stringify(response, null, 2));
}


var removeClassifier = function (classifierID) {
	natural_language_classifier.remove({
	  classifier_id: classifierID },
	  function(err, response) {
		if (err)
		  console.log('error:', err);
		else
		  console.log(JSON.stringify(response, null, 2));
	});
}

var classify = function (text,classifierID,cID,callback) {
	natural_language_classifier.classify({
	  text: text,
	  classifier_id: classifierID },
	  function(err, response) {
		if (err)
		  console.log('error:', err);
		else
			callback.call(null,response,cID);
	});
}
var classifyCallback = function (response,cID) {
	classifiedText.push(Object.assign(response,{clientID: cID}));
	console.log(classifiedText[0]);
	// console.log(JSON.stringify(response, null, 2));
}



listClassifier(listCallback);



 // nlc.removeClassifier("ff18a8x156-nlc-1099");






//first training response: 
/*
{
  "classifier_id": "ff18c7x157-nlc-2045",
  "name": "makatonyNLCservice",
  "language": "en",
  "created": "2017-01-04T19:39:16.009Z",
  "url": "https://gateway.watsonplatform.net/natural-language-classifier/api/v1/classifiers/ff18c7x157-nlc-2045",
  "status": "Training",
  "status_description": "The classifier instance is in its training phase, not yet ready to accept classify requests"
}

*/

//first listclassifier response:
/*
{
  "classifiers": [
    {
      "classifier_id": "ff18c7x157-nlc-2045",
      "url": "https://gateway.watsonplatform.net/natural-language-classifier/api/v1/classifiers/ff18c7x157-nlc-2045",
      "name": "makatonyNLCservice",
      "language": "en",
      "created": "2017-01-04T19:39:16.009Z"
    }
  ]
}


*/




// #######################
// #### MISCELLANEOUS ####
// #######################




