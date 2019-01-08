var net = require("net");
var clsBuf = global.Buffer || require("buffer").Buffer;

var tools = {
	socket: null,
	remotePort: "8080",
	remoteHost: "127.0.0.1",
	localPort: "80",
	localHost: "127.0.0.1",
	acc: "GET /zi%niu%lian/ HTTP/1.1\r\nHost: ",
	ss: {},
	max: 10000,		// 最大连接数

	init: function () {
		var s = net.createConnection(tools.remotePort, tools.remoteHost);
		s.on("end", tools.endSocket);
		s.on("error", function (e) {
			tools.endSocket();
			s.end();
		});
		tools.initSocket(s);
		tools.socket = s;
		s.write(tools.acc + tools.remoteHost + "\r\nConnection: keep-alive\r\n\r\n");
	},

	endSocket: function () {
		var i, s;
		for (i = 0; i < tools.max; i ++) {
			s = tools.ss[i];
			if (s) {
				s.end();
			}
		}
		tools.socket = null;
		console.log("END!");
	},

	endSubSocket: function (id) {
		tools.socket.write("GET /End" + id + " HTTP/1.1\r\nHost: " + tools.remoteHost + "\r\nConnection: keep-alive\r\n\r\n");
		if (tools.ss[id]) {
			delete tools.ss[id];
		}
	},

	initSocket: function (ss) {
		var bs = new clsBuf(0);
		var cs = null;	// 未接收完的连接
		var n = 0;		// 未接收完的字节数
		ss.on("data", function (dat) {
			var id, b = true;
			if (n) {
				// 对未能一次性收齐的数据进行处理
				id = cs.id;
				if (dat.length < n) {
					cs.write (dat);
					n -= dat.length;
					b = false;
				} else if (dat.length === n) {
					cs.write (dat);
					n = 0;
					cs = null;
					b = false;
					bs = new clsBuf(0);
				} else {
					// 一个新的请求接在前一个数据的尾部，是不太可能发生的情况
					cs.write (dat.slice(0, n));
					bs = dat.slice(n);
					n = 0;
					cs = null;
				}
			} else {
				bs = clsBuf.concat([bs, dat]);
			}

			if (b) {
				b = bs.indexOf("\r\n\r\n");
				if (b > 0) {
					b += 4;
					var s, t = bs.toString("utf8", 0, b);
					id = t.substring(13, t.indexOf("\r\n", 13)) - 0;
					if (id < 0) {
						s = tools.ss[-id];
						if (s) {
							s.end();
						} else {
							tools.endSubSocket(-id);
						}
					} else {
						s = tools.ss[id];
						if (!s) {
							s = net.createConnection(tools.localPort, tools.localHost);
							s.id = id;
							tools.ss[id] = s;
							tools.initSubSocket(s);
						}
						var d = bs.slice(b);
						var nn = t.indexOf("Content-Length: ", 19) + 16;
						nn = t.substring(nn, t.indexOf("\r\n", nn)) - 0;

						// console.log("Cln <<! --- s");
						console.log("Cln << ", id + " , " + nn);
						// console.log(d.toString("utf8"));
						// console.log("Cln <<! --- e");

						if (d.length < nn) {
							// 数据未能一次性收齐
							cs = s;
							n = nn;
							cs.write (d);
						} else {
							s.write (d);
							if (d.length > nn) {
								// 一个新的请求接在前一个数据的尾部，是不太可能发生的情况。直接报错
								console.log("--- Err --- " + d.length + " , " + nn);
							}
						}
					}
					bs = new clsBuf(0);
				}
			}
		});
	},

	initSubSocket: function (s) {
        s.on("error", function () {
			tools.endSubSocket(s.id);
			s.end();
        });
        s.on("end", function () {
			console.log("Cln end : " + s.id);
			tools.endSubSocket(s.id);
        });
		s.on("data", function (dat) {
			// console.log("Cln >>! --- s");
			console.log("Cln >> ", s.id + " , " + dat.length);
			// console.log(dat.toString("utf8"));
			// console.log("Cln >>! --- e");
			tools.socket.write(clsBuf.concat([
				new clsBuf("POST /R/" + s.id + " HTTP/1.1\r\nHost: " + tools.remoteHost + "\r\nConnection: keep-alive\r\nContent-Length: " + dat.length + "\r\n\r\n", "utf8"),
				dat
			]));
        });
	}

}

tools.init();
