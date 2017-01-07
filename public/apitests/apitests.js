var socket;

$(function () {

	$("<input>", {type: "text",val: 'Fort Lauderdale',id: 'queryString'}).appendTo($('body'));
	$("<input>", {type: "submit"}).bind("click", getNews).appendTo($('body'));
	$("<p>", {id: "newsSource"}).appendTo($('body'));
	$("<div>", {id: "newsResult"}).appendTo($('body'));
	$("<div>", {id: "jsonResult"}).appendTo($('body'));
	$("<a>", {id:"jsonresultDisplayToggle", href:"#", text: "display/hide JSON response"}).appendTo($('#jsonResult'));
	$("<textarea>", {id: "jsonresultText", width:'100%', height:400}).css("display","none").appendTo($('#jsonResult'));

	$("<style type='text/css'> table{ border-collapse:collapse; } th, td { border: 1px solid ; } </style>").appendTo("head");

	
	$("#jsonresultDisplayToggle").bind("click", function () {
		if ($("#jsonresultText").css("display") == "none") $("#jsonresultText").css("display","block");
		else $("#jsonresultText").css("display","none");
	});
	
})

function createNewsTable(result) {
	$('<table>', {
		id: "newsTable"
	}).append($('<tr>')
		.append($('<th>', {
				text: "News title"
			}))
		.append($('<th>', {
				text: "NLC Sentiment (Confidence)"
			}))
		.append($('<th>', {
				text: "AFINN Sentiment (score)"
			}))).appendTo($('#newsResult'))

	for (var i = 0; i < result.news.length; i++) {
		var title = result.news[i].source.enriched.url.title;
		// title = title.replace(/(\w+)/ig, "<span class='afinnHover'>$1</span>");
		title = $('<span>',{ class: 'afinnHover', text: title });

		var NLCsentiment = result.news[i].sentiment;
		var NLCsentimentConfidence = (function () {var a = ""; NLCsentiment.classes.forEach(function (elt) { if (elt.class_name == NLCsentiment.top_class) a = elt.confidence });	return a})();
		NLCsentimentConfidence = Math.round(NLCsentimentConfidence * 100) / 100;

		var afinn = result.news[i].afinn;
		var afinnSentiment = (afinn.totalScore < 0 ? "negative" : (afinn.totalScore > 0 ? "positive" : "neutral"))

		$('#newsTable').append($('<tr>', {newsId: i})
			.append($('<td>', {html: title}))
			.append($('<td>', {text: NLCsentiment.top_class + " (" + NLCsentimentConfidence + ")"}))
			.append($('<td>', {text: afinnSentiment + " (" + afinn.totalScore + ")"	})))

	}
	
	$("<p>", { text: "Hover over the titles in the table to see the AFINN scores"}).appendTo($('#newsResult'));
	
	
	$(".afinnHover").tooltip({
		items: "span",
		content: function () {
			var element = $(this);
			var newsId = element.parent().parent().attr("newsId");
			var words = result.news[newsId].afinn.wordScore;
			
			$(this).html(afinnColorText($(this).text(),words));
			
			return "AFINN scores:<br><br>"+JSON.stringify(words);
		}
	}).mouseleave(function () {
		var element = $(this);
		var newsId = element.parent().parent().attr("newsId");

		$(this).text(result.news[newsId].source.enriched.url.title);
	});
}

// ######################
// #### SOCKETS: I/O ####
// ######################

$.get("/getSocketUrl", function (dat) {
	var url = dat.url;
	console.log(JSON.stringify(dat, null, 4));

	socket = io.connect(url);

	socket.on("getNewsResult", function (data) {
		result = data.result;
		$('#newsSource').text("Source of news result: " + result.sourceFile);
		console.log("getNewsResult");
		console.log(data);
		createNewsTable(result);
		// console.log(JSON.stringify(result,null,4));
		// $("<p>",{ text:JSON.stringify(result,null,4)}).appendTo($('body'))
	});

	socket.on("getRawNews", function (data) {
		$('#jsonresultText').html(JSON.stringify(data, null, 4));
		console.log("getRawNews");
		console.log(data);
		// console.log(JSON.stringify(result,null,4));
		// $("<p>",{ text:JSON.stringify(result,null,4)}).appendTo($('body'))
	});

});

var getNews = function () {
	$("#newsResult").html("");
	$("#newsSource").html("");
	socket.emit("getNews", {
		queryString: $('#queryString').val()
	});
}

// ###################
// #### AFINN-111 ####
// ###################

var afinnColorText = function (text, wordScores) {
	var text_a = text.split(' ');
	var output = text;
	for (var i = 0; i < text_a.length; i++) {
		var testWord = text_a[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
		var newTestWord = testWord;
		
		for (j = 0; j < wordScores.length; j++) {
			if (wordScores[j].word == testWord) {
				if (wordScores[j].score > 0) newTestWord = $('<a>').text(testWord).css("background-color","#CAECCF").clone().wrap('<p>').parent().html();;
				if (wordScores[j].score < 0) newTestWord = $('<a>').text(testWord).css("background-color","#DDB0A0").clone().wrap('<p>').parent().html();;
			}
		}
		output = output.replace(testWord,newTestWord);
	}
	return output;
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
