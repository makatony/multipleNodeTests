var socket;

$(function () {

	//search input
	$("<input>", {type: "text",val: 'Fort Lauderdale',id: 'queryString'}).appendTo($('body'));
	$("<input>", {type: "submit"}).bind("click", getNews).appendTo($('body'));
	
	//news table
	$("<p>", {id: "newsSource"}).appendTo($('body'));
	$("<div>", {id: "newsResult"}).css("display","none").appendTo($('body'));
	
	//json textarea
	$("<div>", {id: "jsonResult"}).appendTo($('#newsResult'));
	$("<a>", {id:"jsonresultDisplayToggle", href:"#", text: "display/hide JSON response"}).appendTo($('#jsonResult'));
	$("<textarea>", {id: "jsonresultText", width:'100%', height:400}).css("display","none").appendTo($('#jsonResult'));

	$("<style type='text/css'> table{ border-collapse:collapse; } th, td { border: 1px solid ; } </style>").appendTo("head");

	
	//popup for summarized text
	$("<div>", {id: "dialog", text:""}).appendTo($('body'));
	$("<p>", {id: "d_summaryText", text:""}).appendTo($('#dialog'));
	$("<a>", {id: "d_OrigTextToggle", href:"#", text:"display/hide original unsummarized text"}).appendTo($('#dialog'));
	$("<p>", {id: "d_originalText", text:""}).css("display","none").appendTo($('#dialog'));
	$( "#dialog" ).dialog( {width:700, modal:true } );
	$( "#dialog" ).dialog( "close" );
	
	
	
	
	//event handlers
	$("#jsonresultDisplayToggle").bind("click", function () {
		if ($("#jsonresultText").css("display") == "none") $("#jsonresultText").css("display","block");
		else $("#jsonresultText").css("display","none");
	});
	
$("#d_OrigTextToggle").bind("click", function () {
		if ($("#d_originalText").css("display") == "none") $("#d_originalText").css("display","block");
		else $("#d_originalText").css("display","none");
	});
	

	
})

function createNewsTable(result) {
	$('<table>', {id: "newsTable"}).append($('<tr>')
		.append($('<th>', {	text: "News title"	}))
		.append($('<th>', {	text: "NLC Sentiment (Confidence)"	}))
		.append($('<th>', {	text: "AFINN Sentiment (score)"	}))).appendTo($('#newsResult'))

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
	$("<p>", { text: "Click on the titles to see summarized content of the article"}).appendTo($('#newsResult'));
	
	$("#newsResult").css("display","block");
	
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
	
	
	$(".afinnHover").bind("click", function () {
		var element = $(this);
		var newsId = element.parent().parent().attr("newsId");
		
		var htmlContent = "Summary text:<br>"+result.news[newsId].source.summary.summary;
		$("#dialog > #d_summaryText").html(htmlContent);
		htmlContent = "<br>Original text:<br>"+result.news[newsId].source.enriched.url.text;
		$("#dialog > #d_originalText").html(htmlContent);
		
		$("#dialog").dialog({ title: result.news[newsId].source.enriched.url.title });
	});
	
}


// #######################
// #### SUMMARIZATION ####
// #######################


var storeSummaryInObj = function(data) {
	
	var result = data.result;
	
	for (var i = 0; i < result.news.length; i++) {
		var title = result.news[i].source.enriched.url.title;
		var content = result.news[i].source.enriched.url.text;
	
		summarize(title, content, function(err, summary) {
			result.news[i].source.summary = {};
			result.news[i].source.summary.summary = summary;
			result.news[i].source.summary.ratio = (100 - (100 * (summary.length / (title.length + content.length))));
		});
	}
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
		storeSummaryInObj(data);
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
		var testWord = text_a[i];
		var newTestWord = testWord;
		
		for (j = 0; j < wordScores.length; j++) {
			if (wordScores[j].word == testWord.toLowerCase().replace(/[.,\/#!'$%\^&\*;:{}=\-_`~()]/g, "")) {
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

