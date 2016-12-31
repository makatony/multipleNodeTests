



$(function () {
	

	$("<input>", { type: "text", val: 'Logitech', id: 'queryString' }).appendTo($('body'));
	$("<input>", { type: "submit" }).bind("click", getNews).appendTo($('body'));

})





// ######################
// #### SOCKETS: I/O ####
// ######################

var socket = io.connect('http://localhost:6001');

socket.on("getNewsResult", function (data) { 
	result = data;
	console.log(JSON.stringify(result,null,4));
	$("<p>",{ text:JSON.stringify(result,null,4)}).appendTo($('body'))
});

var getNews = function () {
	socket.emit("getNews", { queryString: $('#queryString').val() });
}





// #######################
// #### MISCELLANEOUS ####
// #######################


//simple variable passing between client and server without client ID
$.get("/getvar", function (data) {
	name = data.name;
	console.log(name);
});















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
