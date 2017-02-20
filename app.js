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

function newConnection(client) { //insert here all functions for a connection
	console.log("new client connected: " + client.id);
	client.on("getNews", getNews);
}

// #####################
// #### ALCHEMY API ####
// #####################

var localFile = "./alchemyNewsFortLauderdale.json";
var nlcStatus = "";
var alchemyStatus = "";
var backupNewsFromFile = require(localFile);

var AlchemyDataNewsV1 = require('watson-developer-cloud/alchemy-data-news/v1');
var newsResult = [];

var alchemy_data_news = new AlchemyDataNewsV1({
		api_key: process.env.alchemyAPIkey
	});

var paramsAlch = {
	start: 'now-10d',
	end: 'now',
	count: 10,
	return : 'enriched.url.title,enriched.url.author,enriched.url.text',
	outputMode: 'json',
	'q.enriched.url.enrichedTitle.keywords.keyword.text': 'IBM'
};

var getNews = function (data) {
	if (data.queryString.length > 0) {
		// Adds the query string and the client ID to the request parameters
		Object.assign(paramsAlch, {
			'q.enriched.url.enrichedTitle.keywords.keyword.text': data.queryString,
			clientID: this.client.id //since getNews is called in the socket, it gets the context of the socket and this.client.id is passed
		});

		alchemy_data_news.getNews(paramsAlch, sendNewsResult); //forcing alchemy API
		// sendNewsResult(null, backupNewsFromFile); //forcing to get from local file
	}
}

var sendNewsResult = function (err, news) {
	var result;
	if (err) {
		console.log('error SendNewsResult:', err);
		result = err;
	} else {
		// console.log(JSON.stringify(news, null, 2));
		result = news;
	}

	//send the data back to the caller
	var sourceFileText = "";
	if (result.status == "OK") sourceFileText = "watson";
	else sourceFileText = "localFile ("+localFile+") due to errors";
	console.log("using " + sourceFileText + " as source.");

	if (result.status != "OK") { //error case
	
		//error handling of errors from watson
		if ((result.statusInfo == "daily-transaction-limit-exceeded") || (result.errno == 'ENOENT') || (result.statusInfo == 'invalid-api-key')) {
			var newResult = backupNewsFromFile;
			newResult.originalResponse = result;
			result = newResult;
		} 
		else
			io.sockets.connected[paramsAlch.clientID].emit("getNewsResult", { error: "there was some uncaught error, please check app.js", result: result });
	}
	if (result.status == "OK") {
		console.log("successfully fetched news for client id " + paramsAlch.clientID);
		news = result.result.docs;
		newsResult.push({
			clientID: paramsAlch.clientID,
			countArrivedNews: 0,
			sourceFileText: sourceFileText,
			news: news,
			nlcStatus: nlcStatus
		}); //adds a new object in news result for this client ID in global array. news sentiment will be filled here
		debugger;
		for (var i = 0; i < news.length; i++) {
			var textToClassify = news[i].source.enriched.url.title;
			news[i].afinn = 0;
			news[i].afinn = afinnClassify(textToClassify);
			if (nlcStatus != "offline") classify(textToClassify, classifiers[0].classifier_id, paramsAlch.clientID, classifyNewsCallback);
		}
	}
	if (nlcStatus == "offline")	io.sockets.connected[paramsAlch.clientID].emit("getNewsResult", {result: newsResult[0]}); //if the NLC is not online, then the classifyNewsCallback is not going to be called, thus one has to emmit here manually
	io.sockets.connected[paramsAlch.clientID].emit("getRawNews", result);
}

var classifyNewsCallback = function (response, cID) {
	var clientIDfound = false;
	var newsFound = false;
	var foundIndex = -1;
	for (var r = newsResult.length - 1; r >= 0; r--) {
		if (newsResult[r].clientID == cID) {
			newsResult[r].countArrivedNews = newsResult[r].countArrivedNews + 1;
			for (i = 0; i < newsResult[r].news.length; i++) {
				if (newsResult[r].news[i].source.enriched.url.title == response.text) {
					newsResult[r].news[i].sentiment = response;
					newsFound = true;
					// i = newsResult[r].news.length; //break; // if this is enabled, duplicates titles in result wont work
				}
			}
			clientIDfound = true;
			foundIndex = r;
			r = 0; //break
		}
	}
	if (clientIDfound == false) {
		console.log("client ID " + cID + " not found in newsResult array");
		console.log(newsResult);
	} else if (newsFound == false)
		console.log("client ID " + cID + " found in newsResult array but Title cannot be found in news array");
	else
		console.log("client ID " + cID + " found in newsResult array");

	if ((clientIDfound) && (newsFound)) {
		console.log("one more news sentiment found for client ID " + cID + ": " + response.top_class + " / " + response.text);
		if (newsResult[foundIndex].news.length == newsResult[foundIndex].countArrivedNews) {
			console.log("arrived at end of news for client id " + cID);
			io.sockets.connected[cID].emit("getNewsResult", {result: newsResult[foundIndex]});
		}
		// console.log(JSON.stringify(response, null, 2));
	}
}

// this is the only way i found to tell the client the website URL without PHP
app.get("/getSocketUrl", function (req, res) {
	res.json({
		url: appEnv.url
	});
});


// #######################
// #### WORD STEMMING ####
// #######################

var natural = require('natural');

var StemmWords = function (text) {
    var output = text.split(/\W+/);
    output = output.map( function (w) { return stemWord(w); })
	output = output.join(" ");
	return output;
}

var stemWord = function (w) {
	return natural.PorterStemmer.stem(w);
}


// ###########################
// #### STOP WORD REMOVAL ####
// ###########################

var stopwords = require('stopwords').english;

var removeStopwords = function (text) {
    var output = text.split(/\W+/);
    output = output.filter( function (w) { return stopwords.indexOf(w.toLowerCase()) < 0 });
	output = output.join(" ");
	return output;
}



// #######################
// #### AFINN SCORING ####
// #######################

var afinnClassify = function (text) {
	text = removeStopwords(text);
	var text_a = text.split(" ");
	var score = 0;
	var wordScore = [];
	for (var i = 0; i < text_a.length; i++) {
		var testWord = text_a[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
		testWord = testWord.toLowerCase();
		var stemWordUsed = false;
		var thisScore = 0;
		var thisScoreObj = {
			word: "",
			score: ""
		};
		
		//if the unstemmed word is in afinn, take that score. or else take the score of the stemmed word (mostly zero)
		// if (getAfinnScoreWord(stemWord(testWord)) != 0) {
		var unstemmedScore = getAfinnScoreWord(testWord);
		if (unstemmedScore != 0) { thisScore = unstemmedScore; }
		else { thisScore = getAfinnScoreWord(stemWord(testWord)); stemWordUsed = true; }
		
		// var consoleLog = testWord+" / "+thisScore;
		// consoleLog += " | Stem: "+stemWord(testWord) + " / "+getAfinnScoreWord(stemWord(testWord));
		// consoleLog += " | output: "+thisScore;
		// console.log(consoleLog);
		
		
		thisScoreObj.score = parseInt(thisScore);
		thisScoreObj.word = testWord;
		if ((stemWordUsed) && (parseInt(thisScore) != 0)) thisScoreObj.stemWord = stemWord(testWord);
		score = score + parseInt(thisScore);
		wordScore.push(thisScoreObj);
	}
	return {
		totalScore: score,
		wordScore: wordScore
	};

}

// var afinn = require("./AFINN-111.txt");
// console.log(afinn);

var afinn111 = [];
var afinn111stemmed = [];
var csv = require("fast-csv");
var fs = require('fs');

fs.createReadStream("./AFINN-111.txt")
.pipe(csv())
.on("data", function (data) {
	var data = data[0].split('\t');
	//unstemmed afinn111
	afinn111.push({ 
		word: data[0],
		stemmedWord: stemWord(data[0]),
		score: data[1]
	});
	
	//stemmed afinn111. if we find that we already gave a score to a word with the same stem,
	//then we change both unstemmed words to have the stem be the same as the unstemmed word
	//and we add a new word just for the stem
	var testing = getAfinnScoreObj(stemWord(data[0]),isStemmed=true)
	if ((testing.score != 0) && (Math.abs(data[1] - testing.score) > 0)) { //checking for 2 words that have drastically different scores when stemmed
		// console.log("existing word: "+stemWord(data[0])+" | New score: "+data[1]+"("+data[0]+") | existing score: "+testing.score+"("+testing.word+")");
		
		//we now have a stem with an avg score and two new unstemmed words to add to afinn. we need to correct the two words and add a word for the stem
		//replaces the .stemmedWord (e.g. "stun" for "stunned") with unstemmed word "stunned" because there is a differentiation
		var newObj = Object.assign(testing,{stemmedWord: testing.word});
		setAfinnWord(testing.word,newObj);
		
		newObj = Object.assign(getAfinnScoreObj(data[0]),{stemmedWord: data[0]});
		setAfinnWord(data[0],newObj);
		
		//add a new entry just for the stem
		var stemScore = Math.round((parseInt(data[1])+parseInt(testing.score))/2); //average of both for the stem
		afinn111.push({ 
			word: stemWord(data[0]),
			stemmedWord: stemWord(data[0]),
			score: stemScore
		});
		
	}
	// if (data[0].indexOf(" ") > 0) console.log(data[0]); // shows the compound words
})

.on("end", function () {	
	// var origText = "FORT LAUDERDALE, Fla., Jan 6 An Iraq war veteran took a gun out of his checked luggage and opened fire in a crowded baggage claim area at Fort Lauderdale's airport on Friday, killing five people, months after he showed up at an FBI office behaving erratically. CHICAGO, Jan 6 The United States has reached an agreement that is expected to open the door for its first-ever exports of shell eggs to South Korea, as the North Asian country labors through its worst outbreak of bird flu in history, U.S. government and industry officials said on Friday.  lagged lag do it."
	// origText += " Obtained by ABC News(FORT LAUDERDALE, Fla.) -- He is the alleged perpetrator of a shooting spree that left five people dead and more injured in the Fort Lauderdale airport Friday afternoon. But Esteban Santiago remains a mystery for federal authorities who are trying to piece together just what led a 26-year-old Army veteran with an intense gaze to go on a murderous rampage";
	// var text = removeStopwords(origText);
	// console.log("afinn classify output: "+afinnClassify(text));
	// console.log(origText);
	// console.log(text);
	
	
	// console.log(afinn111);
	// console.log("------");
	
	//afinn testing
	// console.log("lag ")
	// console.log(getAfinnScoreObj("lag"))
	// console.log("lagged ")
	// console.log(getAfinnScoreObj("lagged"))
	// console.log("lagging ")
	// console.log(getAfinnScoreObj("lagging"))
	// console.log("lags ")
	// console.log(getAfinnScoreObj("lags"))
	
});


var setAfinnWord = function (word,obj,isStemmed) { // if isStemmed = true, look for the input word in the .stemmedWord property. otherwise in .word property
	var property = (isStemmed?"stemmedWord":"word");
	var afinnObj = afinn111;
	for (var i = 0; i < afinnObj.length; i++) {
		if (afinnObj[i][property] == word) {
			afinnObj[i] = obj;
		}
	}
}
var getAfinnScoreWord = function (word,isStemmed) { // if isStemmed = true, look for the input word in the .stemmedWord property. otherwise in .word property
	var property = (isStemmed?"stemmedWord":"word");
	var afinnObj = afinn111;
	for (var i = 0; i < afinnObj.length; i++) {
		if (afinnObj[i][property] == word) {
			// console.log(word+" = "+afinn111[i].word+" = "+afinn111[i].score);
			return afinnObj[i].score
		}
	}
	return 0;
}
var getAfinnScoreObj = function (word,isStemmed) { // if isStemmed = true, look for the input word in the .stemmedWord property. otherwise in .word property
	var property = (isStemmed?"stemmedWord":"word");
	var afinnObj = afinn111;
	for (var i = 0; i < afinnObj.length; i++) {
		if (afinnObj[i][property] == word) {
			return afinnObj[i]
		}
	}
	return 0;
}


// ##########################
// #### NaturalLangCLass ####
// ##########################


var watson = require('watson-developer-cloud');
var fs = require('fs');
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
	natural_language_classifier.create(paramsNLC, function (err, response) {
		if (err)
			console.log(err);
		else
			console.log(JSON.stringify(response, null, 2));
	});
}

var listClassifier = function (callback) {
	natural_language_classifier.list({},
		function (err, response) {
		if (err) {
			console.log('error NLC:', err);
			nlcStatus = "offline";
		}
		else {
			nlcStatus = "online";
			// console.log(JSON.stringify(response, null, 2));
			classifiers = response.classifiers;
			callback.call(this, response);
		}
	});
}
var listCallback = function () {
	console.log("first classifier: " + classifiers[0].classifier_id)
	classifierStatus(classifiers[0].classifier_id, 0, statusCallback);
};

var classifierStatus = function (classifierID, classifierIndex, callback) {
	natural_language_classifier.status({
		classifier_id: classifierID
	},
		function (err, response) {
		if (err)
			console.log('error NLC StatusQuery:', err);
		else {
			classifiers[classifierIndex] = response;
			callback.call(null, response, classifierIndex);
		}
	});
}
var statusCallback = function (response, classifierIndex) {
	// console.log(classifiers);
	if (classifiers[classifierIndex].status == "Available") {
		console.log(classifiers[classifierIndex].classifier_id + " is available")
		// classify(textToClassify,classifiers[classifierIndex].classifier_id,clientID,classifyCallback)
	}
	// console.log(JSON.stringify(response, null, 2));
}

var removeClassifier = function (classifierID) {
	natural_language_classifier.remove({
		classifier_id: classifierID
	},
		function (err, response) {
		if (err)
			console.log('error NLC remove:', err);
		else
			console.log(JSON.stringify(response, null, 2));
	});
}

var classify = function (text, classifierID, cID, callback) {
	natural_language_classifier.classify({
		text: text,
		classifier_id: classifierID
	},
		function (err, response) {
		if (err)
			console.log('error NLC classify:', err);
		else
			callback.call(null, response, cID);
	});
}
var classifyCallback = function (response, cID) {
	classifiedText.push(Object.assign(response, {
			clientID: cID
		}));
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


