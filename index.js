var wsioc = require("socket.io-client");
var socket = wsioc.connect("http://srv-lzrnat.7e14.starter-us-west-2.openshiftapps.com/zi%niu%lian");	// 连接发布在 OpenShift3 上的服务
// var socket = wsioc.connect("http://127.0.0.1:8080/zi%niu%lian");		// 连接本地服务
var ai = 0;

function run () {
console.log(ai);
	if (socket.connected) {
		socket.emit("hello", "ai" + (ai ++));
	}
}

socket.on("Hi", function (dat) {
	console.log(dat);
	setTimeout(run, 3000);
});

socket.on("connect", function () {
	console.log("connect");
	ai = 0;
	socket.emit("hello", "ai");
});

socket.on("disconnect", function () {
	console.log("disconnect");
});
