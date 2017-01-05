var socket;


$(function () {

	$("<input>", { type: "text", val: 'Logitech', id: 'queryString' }).appendTo($('body'));
	$("<input>", { type: "submit" }).bind("click", getNews).appendTo($('body'));
	$("<p>", { id: "newsSource" }).appendTo($('body'));
	$("<div>", { id: "newsResult" }).appendTo($('body'));
	
	$("<style type='text/css'> table{ border-collapse:collapse; } th, td { border: 1px solid ; } </style>").appendTo("head");

})


function createNewsTable(result) {
	$('<table>', {id: "newsTable"}).append($('<tr>')
			.append($('<th>',{text:"News title"}))
			.append($('<th>',{text:"Sentiment"}))
			.append($('<th>',{text:"Confidence"}))
		).appendTo($('body'))
		
	for (var i = 0; i < result.news.length; i++) {
		var title = result.news[i].source.enriched.url.title;
		var sentiment = result.news[i].sentiment;
		$('#newsTable').append($('<tr>')
			.append($('<td>',{text:title}))
			.append($('<td>',{text:sentiment.top_class}))
			.append($('<td>',{text: (function () { var a = ""; sentiment.classes.forEach( function (elt) { if (elt.class_name == sentiment.top_class) a = elt.confidence }  ); return a })() }))
		)
	}
}


// ######################
// #### SOCKETS: I/O ####
// ######################

$.get("/getSocketUrl", function (dat) {
	var url = dat.url;
	console.log(JSON.stringify(dat,null,4));
	
	socket = io.connect(url);
	
	socket.on("getNewsResult", function (data) { 
		result = data.result;
		$('#newsSource').text("Source of news result: "+result.sourceFile);
		createNewsTable(result);
		// console.log(JSON.stringify(result,null,4));
		// $("<p>",{ text:JSON.stringify(result,null,4)}).appendTo($('body'))
	});
	
});

var getNews = function () {
	socket.emit("getNews", { queryString: $('#queryString').val() });
}



// #######################
// #### MISCELLANEOUS ####
// #######################


//simple variable passing between client and server without client ID
// $.get("/getvar", function (data) {
	// console.log(JSON.stringify(data,null,4));
// });















// var getNews = function () {
	// var data = {
		// queryString: $('#queryString').val()
	// };
	// $.ajax({
		// url: "/getNews",
		// data: data,
		// success: function (data) {
			// name = data.name;
			// console.log(name);
		// },
		// dataType: "json"
	// });
// }
