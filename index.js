var net = require("net");

var natc = {
	clsBuf: global.Buffer || require("buffer").Buffer,
	remoteHost: "srv-lzrnat.7e14.starter-us-west-2.openshiftapps.com",
	// remoteHost: "127.0.0.1",
	remotePort: 80,
	localHost: "127.0.0.1",
	localPost: 80,
	https: require("https"),
	http: require("http"),
	pwd: "pwd",
	socket: null,
	size: 0,		// 尚未接收完的数据大小
	buf: null,	// 已接收到的数据缓存
	waiTim: 100,	// 等待时间
	ws: [],		// 任务堆
	rs: {},		// 连接池
	rsize: 0,	// 连接数

	// 获取密码
	getPwd: function () {
		return natc.pwd;
	},

	// 对接
	lnk: function () {
		console.log("连接中 ...");
		var s = net.createConnection(natc.remotePort, natc.remoteHost);
		s.on("error", natc.endLnk);
		s.on("end", natc.endLnk);
		s.on("data", natc.hdDat);
		natc.size = 0;
		natc.send(s, "lnk/" + natc.getPwd());
	},

	// 停止对接
	endLnk: function () {
		if (natc.socket) {
			if (natc.socket.end) {
				console.log("已断开 : " + Date.now());
			}
			natc.socket = null;
			natc.lnk();
		}
		this.end();
	},

	// 接收信息
	hdDat: function (dat) {
		if (natc.size === 0) {
			var k = dat.indexOf("\r\n\r\n");
			if (k > 0) {
				switch (dat.toString("utf8", 13, 16)) {
					case "lnk":
						if (!natc.socket) {
							natc.socket = this;
							console.log("已连接 : " + Date.now());
						}
						natc.hdLnk(true);
						break;
					case "wrk":
						var i = dat.indexOf("Content-Length: ", 18, "utf8") + 16;
						var j = dat.indexOf("\r\n", i, "utf8");
						natc.size = dat.toString("utf8", i, j);
						i = k + 4;	// 数据起始位置
						j = dat.length - i;		// 数据实际长度
						if (natc.size > j) {
							natc.size -= j;
							natc.buf = [dat.slice(i)];
						} else {
							k = i + natc.size;
							natc.size = 0;
							natc.doWrk(dat.slice(i, k));
							if (natc.size < j) {
								console.log("理论上不会出现的数据溢出");
								// natc.hdDat(dat.slice(i + natc.size));
							}
						}
						break;
					default:
console.log("其它信息 ： " + dat.toString("utf8", 0, 15));
// console.log(dat.toString());
						if (!natc.socket) {
							natc.socket = true;
						}
						natc.endLnk.call(this);
						break;
				}
			} else {
console.log("错误信息 ： " + dat.toString("utf8", 0, 15));
// console.log(dat.toString());
				if (!natc.socket) {
					natc.socket = true;
				}
				natc.endLnk.call(this);
			}
		} else {
			var d = false;
			if (dat.length > natc.size) {
				// 理论上不会出现的数据溢出
				d = dat.slice(natc.size);
				dat = dat.slice(0, natc.size);
			}
			natc.buf.push(dat);
			natc.size -= dat.length;
			if (natc.size === 0) {
				natc.doWrk(natc.clsBuf.concat(natc.buf));
				if (d) {
					console.log("理论上不会出现的数据溢出");
					// natc.hdDat(d);
				}
			}
		}
	},

	// 连接处理
	hdLnk: function (wait) {
		if (natc.ws.length) {
			natc.sendWrk();
		} else if (natc.rsize) {
			if (wait) {
				setTimeout(natc.hdLnk, natc.waiTim);
			} else {
				natc.send(natc.socket, "rtn");
			}
		} else {
			natc.send(natc.socket, "lnk");
			console.log("linking ... : " + Date.now());
		}
	},

	// 发送信息
	send: function (s, nam, dat) {
		var d = "POST /" + nam + "/ HTTP/1.1\r\nHost: " + natc.remoteHost + "\r\nConnection: keep-alive\r\nContent-Length: ";
		if (dat) {
			d = natc.clsBuf.concat ([
				natc.clsBuf.from (d + dat.length + "\r\n\r\n"),
				dat
			]);
		} else {
			d += "0\r\n\r\n";
		}
		s.write(d);
	},

	// 执行任务
	doWrk: function (dat) {
		// ... 主内容 ...

		// 连接继续
		natc.hdLnk();
	},

	// 发送任务
	sendWrk: function () {
		// ... 主内容 ...

		natc.ws = [];
	},

	// 错误处理 （临时测试使用，实际运行时不需要）
	hdErr: function (e) {
console.log ("Err : " + e.message);
		this.end();
	}
};

natc.lnk();
