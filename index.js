var natc = {
	host: "srv-lzrnat.7e14.starter-us-west-2.openshiftapps.com",
	// host: "127.0.0.1",
	port: 80,
	localHost: "127.0.0.1",
	localPost: 80,
	path: "/LZR/nat/",
	http: require("http"),
	https: require("https"),
	pwd: "pwd",
	clsBuf: global.Buffer || require("buffer").Buffer,
	linked: false,	// 是否已对接
	runing: false,	// run 是否在工作
	do: [],		// 需要运行的任务

	// 获取密码
	getPwd: function () {
		return natc.pwd;
	},

	// 创建请求头
	crtHead: function (p, l) {
		return {
			hostname: natc.host,
			port: natc.port,
			path: natc.path + p,
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
				"Content-Length": l
			}
		}
	},

	// 对接
	link: function () {
		var req = natc.http.request(
			natc.crtHead("lnk/" + natc.getPwd(), 0),
			function (res) {
				res.on("data", function (dat) {
					if (natc.linked) {
						natc.hdDat(dat);
					} else if (dat.toString("utf8", 0, 2) === "O,") {
						natc.linked = true;
console.log("linked!");
						natc.hdDat(dat);
					} else {
console.log("Err!");
						// natc.endLnk();
					}
				});
			}
		);
		req.on ("error", function (e) {
			console.log("Link_Err: " + e.message);
			natc.endLnk();
		});
		req.end();
	},

	// 停止对接
	endLnk: function () {
		natc.do = [];
		natc.runing = false;
		natc.linked = false;
		var req = natc.http.request(
			natc.crtHead("endLnk/" + natc.getPwd(), 0),
			function (res) {}
		);
		req.on ("error", function (e) {});
		req.end();
	},

	// 数据处理
	hdDat: function (dat) {
		var i, a = dat.toString("utf8").split(",");
		for (i = 0; i < a.length; i ++) {
			switch (a[i][0]) {
				case "G":	// 获取请求
				// case "D":	// 断开连接
				case "E":	// 停止对接
					natc.do.push(a[i]);
console.log(a[i]);
					break;
			}
		}
		setTimeout(natc.run, 1);
	},

	// 执行任务
	run: function () {
		if (!natc.runing) {
			if (natc.do.length) {
				natc.runing = true;
				var r = natc.do[0];
				switch (natc.do[0][0]) {
					case "G":	// 获取请求
						natc.getReq(r.substr(1));
						break;
					// case "D":	// 断开连接
					// 	break;
					case "E":	// 停止对接
						natc.endLnk();
						break;
				}
			} else {
				natc.runing = false;
			}
		}
	},

	// 继续任务
	rerun: function () {
		natc.runing = false;
		setTimeout(natc.run, 1);
	},

	// 获取请求
	getReq: function (id) {
console.log("req_" + id);
		var req = natc.http.request(
			natc.crtHead("getReq/" + id, 0),
			function (res) {
				var d = [];
				var size = 0;
				res.on("data", function (dat) {
					if (!size && dat.indexOf("{\"ok\":true")) {
						res.removeAllListeners("end");
						res.removeAllListeners("data");
						res.socket.end();
console.log("req_" + id + " : err!");
						if (dat.indexOf("{\"ok\":false") === 0) {
console.log("req_" + id + " : next!");
							natc.do.shift();
						}
						natc.rerun();
					} else {
						d.push(dat);
						size += dat.length;
					}
				});
				res.on("end", function () {
					natc.vsDat (id, JSON.parse(natc.clsBuf.concat(d, size).toString("utf8")));
				});
			}
		);
		req.on ("error", function (e) {
			console.log("Req_Err_" + id + " : " + e.message);
			natc.rerun();
		});
		req.end();
	},

	// 获取数据
	vsDat: function (id, o) {
		o.h.hostname = natc.localHost;
		o.h.port = natc.localPost;
		var req = natc.http.request(
			o.h,
			function (res) {
				var d = [];
				var size = 0;
				res.on("data", function (dat) {
					d.push(dat);
					size += dat.length;
				});
				res.on("end", function () {
					natc.sendRes (id, natc.clsBuf.concat(d, size));
console.log("vs_" + id);
				});
			}
		);
		req.on ("error", function (e) {
			console.log("Vs_Err_" + id + " : " + e.message);
			natc.sendRes (id, natc.clsBuf.from("404!", "utf8"));
		});
		if (o.b) {
			req.write(natc.clsBuf.from(o.b));
		}
		req.end();
	},

	// 发送应答
	sendRes: function (id, buf) {
		var req = natc.http.request(
			natc.crtHead("sendRes/" + id, buf.length),
			function (res) {
				res.on("data", function (dat) {
console.log(id + "_res : " + dat.toString("utf8").substr(0, 5));
				});
			}
		);
		req.on ("error", function (e) {
			console.log("Res_Err_" + id + " : " + e.message);
		});
		req.write(buf);
		req.end();
		natc.do.shift();
		natc.rerun();
	}
};

natc.link();
