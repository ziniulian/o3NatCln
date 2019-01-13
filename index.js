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
		natc.socket = net.createConnection(natc.remotePort, natc.remoteHost);
		natc.socket.on("error", natc.hdErr);
		natc.socket.on("end", natc.endLnk);
		natc.socket.on("data", natc.hdDat);
		natc.send("lnk/" + natc.getPwd());
	},

	// 停止对接
	endLnk: function () {
		if (natc.socket) {
			var s = natc.socket;
			natc.socket = null;
			// 发送所有任务
			// 清空连接池
			s.end();
		}
console.log("link end!");
	},

	// 接收信息
	hdDat: function (dat) {
		switch (dat.toString("utf8", 13, 16)) {
			case "lnk":
				natc.hdLnk(true);
				break;
			case "wrk":
				natc.hdLnk(true);
				break;
			default:
				natc.endLnk();
				break;
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
				natc.send("rtn");
			}
		} else {
			natc.send("lnk");
			console.log("linking");
		}
	},

	// 发送信息
	send: function (nam, dat) {
		var d, lng = 0;
		if (dat) {
			lng = dat.length;
		}
		d = "POST /" + nam + "/ HTTP/1.1\r\nHost: " + natc.remoteHost + "\r\nConnection: keep-alive\r\nContent-Length: " + lng + "\r\n\r\n";
		if (dat) {
			d = natc.clsBuf.concat([
				natc.clsBuf.form(d),
				dat
			]);
		}
		natc.socket.write(d);
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
		natc.endLnk();
	}
};

natc.lnk();
