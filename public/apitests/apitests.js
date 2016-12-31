var socket;


$(function () {

	$("<input>", { type: "text", val: 'Logitech', id: 'queryString' }).appendTo($('body'));
	$("<input>", { type: "submit" }).bind("click", getNews).appendTo($('body'));

})





// ######################
// #### SOCKETS: I/O ####
// ######################


$.get("/getSocketUrl", function (dat) {
	var url = dat.url;
	console.log(JSON.stringify(dat,null,4));
	
	socket = io.connect(url);
	
	socket.on("getNewsResult", function (data) { 
		result = data;
		console.log(JSON.stringify(result,null,4));
		$("<p>",{ text:JSON.stringify(result,null,4)}).appendTo($('body'))
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
