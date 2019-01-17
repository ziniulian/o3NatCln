var net = require("net");

var natc = {
	clsBuf: global.Buffer || require("buffer").Buffer,
	// remoteHost: "srv-lzrnat.7e14.starter-us-west-2.openshiftapps.com",
	remoteHost: "127.0.0.1",
	remotePort: 8080,
	localHost: "127.0.0.1",
	localPort: 80,
	https: require("https"),
	http: require("http"),
	pwd: "pwd",

	socket: null,	// 接收端
	twrk: null,		// 尚未接收完的数据大小
	buf: null,		// 已接收到的数据缓存

	ws: [],		// 任务堆
	pw: null,	// 回滚任务堆
	rs: {},		// 连接池
	rsize: 0,	// 连接数

	sendSocket: null,	// 发送端
	keepWork: 0,	// 持续发送任务
	waiTim: 1000,	// 等待时间

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
		s.on("data", natc.hdLnk);
		natc.size = 0;
		natc.send(s, "lnk/" + natc.getPwd());
	},

	// 停止对接
	endLnk: function () {
		this.removeAllListeners("data");
		this.removeAllListeners("error");
		this.removeAllListeners("end");
		this.on("error", natc.hdErr);
		this.end();
		if (natc.socket) {
			console.log("已断开 : " + Date.now());
			natc.socket = null;
			natc.lnk();
		}
	},

	// 连接处理
	hdLnk: function (dat) {
		if (dat.indexOf("HTTP/1.1 200 lnk\r\n") === 0) {
			natc.socket = this;
			this.removeAllListeners("data");
			this.on("data", natc.hdDat);
		} else {
			this.end();
			natc.lnk();
		}
	},

	// 数据处理
	hdDat: function (dat) {
		var i, j, p, id;
		if (natc.buf) {
			natc.buf.push(dat);
			dat = natc.clsBuf.concat(natc.buf);
			natc.buf = null;
		}
		p = 0;	// 指针
		while (dat.length > p) {
			if (natc.twrk) {
				i = dat.length - p;
				if (i < natc.twrk.size) {
					natc.twrk.size -= i;
					natc.twrk.buf.push(dat.slice(p));
					p = dat.length;
				} else {
					j = p + natc.twrk.size;
					natc.twrk.buf.push(dat.slice(p, j));
					natc.doWrk(natc.twrk.id, natc.clsBuf.concat(natc.twrk.buf));
					natc.twrk = null;
					p = j;
				}
			} else {
				i = dat.indexOf(".", p);
				if (i > 0) {
					id = dat.toString("utf8", p, i) - 0;
					i ++;
					if (id === 0) {
						p = i;
console.log("linking ...");
					} else {
						j = dat.indexOf(".", i);
						if (j > 0) {
							p = dat.toString("utf8", i, j) - 0;
							if (p === 0) {
								natc.clrSub(id);
							} else {
								natc.twrk = {
									id: id,
									buf: [],
									size: p,
								};
							}
							p = j + 1;
						} else {
							natc.buf = [dat.slice(p)];
							p = dat.length;
						}
					}
				} else {
					natc.buf = [dat.slice(p)];
					p = dat.length;
				}
			}
		}
	},

	// 清除子连接
	clrSub: function (id) {
		if (natc.rs[id]) {
			console.log("End : " + id);
			natc.rs[id].end();
			delete natc.rs[id];
			natc.rsize --;
		}
	},

	// 执行任务
	doWrk: function (id, dat) {
		console.log(id + " : << " + dat.length);
		var s = natc.rs[id];
		if (s) {
			s.write(dat);
		} else {
			natc.crtSub(id, dat);
		}
	},

	// 创建子连接
	crtSub: function (id, dat) {
		var s = net.createConnection(natc.localPort, natc.localHost);
		s.on("error", natc.endSub);
		s.on("end", natc.endSub);
		s.on("data", natc.hdSub);
		s.id = id;
		natc.rs[id] = s;
		natc.rsize ++;
		s.write(dat);
	},

	// 结束子连接
	endSub: function () {
		var id = this.id;
		this.removeAllListeners("data");
		this.removeAllListeners("error");
		this.removeAllListeners("end");
		this.on("error", natc.hdErr);
		this.id = 0;
		this.end();
		if (id) {
			natc.ws.push(natc.clsBuf.from(id + ".0."));
			natc.clrSub(id);
			natc.sendWrk();
		}
	},

	// 处理子连接
	hdSub: function (dat) {
		console.log(this.id + " : >> " + dat.length);
		natc.ws.push(natc.clsBuf.concat([
			natc.clsBuf.from(this.id + "." + dat.length + "."),
			dat
		]));
		natc.sendWrk();
	},

	// 发送任务
	sendWrk: function () {
// console.log("sendWork...");
		if (!natc.sendSocket) {
			natc.sendSocket = net.createConnection(natc.remotePort, natc.remoteHost);
			natc.sendSocket.on("error", natc.endWrk);
			natc.sendSocket.on("end", natc.endWrk);
			natc.sendSocket.on("data", natc.hdWrk);
		}
		if (!natc.pw) {
			natc.pw = natc.clsBuf.concat(natc.ws);
			natc.ws = [];
			natc.send(natc.sendSocket, "wrk", natc.pw);
		}
		// natc.keepWork = setTimeout(natc.sendWrk, natc.waiTim);
	},

	endWrk: function () {
		this.removeAllListeners("data");
		this.removeAllListeners("error");
		this.removeAllListeners("end");
		this.on("error", natc.hdErr);
		this.end();
		natc.sendSocket = null;
		natc.rollBackWrk();
	},

	hdWrk: function (dat) {
		if (dat.indexOf("HTTP/1.1 200 wOK") === 0) {
			// 发送成功
			natc.pw = null;
			if (natc.ws.length) {
				natc.sendWrk();
			} else {
				this.end();
			}
		} else if (dat.toString("utf8", 13, 16) === "wER") {
			console.log("服务端数据溢出！？");
			natc.pw = null;
			this.end();
		} else {
			this.end();
		}
	},

	// 任务回滚
	rollBackWrk: function () {
		if (natc.pw) {
console.log("roll Back!");
			natc.ws.unshift(natc.pw);
			natc.pw = null;
			natc.sendWrk();
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
console.log("-- >> " + d.length);
		s.write(d);
	},

	// 错误处理
	hdErr: function (e) {
		this.removeAllListeners("data");
		this.removeAllListeners("end");
		this.end();
	}
};

natc.lnk();
