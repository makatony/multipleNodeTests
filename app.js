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

var AlchemyDataNewsV1 = require('watson-developer-cloud/alchemy-data-news/v1');

var alchemy_data_news = new AlchemyDataNewsV1({
		api_key: process.env.alchemyAPIkey
	});

var params = {
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
		Object.assign(params, {
			'q.enriched.url.enrichedTitle.keywords.keyword.text': data.queryString
			,clientID: this.client.id	//since getNews is called in the socket, it gets the context of the socket and this.client.id is passed
		});

		alchemy_data_news.getNews(params, sendNewsResult);
	}
}

var sendNewsResult = function (err, news) {
	var result;
	if (err) { console.log('error:', err); result = err; }
	else { console.log(JSON.stringify(news, null, 2)); result = news; }
	
	//send the data back to the caller
	io.sockets.connected[params.clientID].emit("getNewsResult",{ result: result } );
}





// #######################
// #### MISCELLANEOUS ####
// #######################


//simple variable passing to client
app.get("/getSocketUrl", function(req, res){
    res.json({ url: appEnv.url });
});

