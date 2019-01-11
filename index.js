var natc = {
	host: "srv-lzrnat.7e14.starter-us-west-2.openshiftapps.com",
	port: 80,
	path: "/LZR/nat/",
	http: require("http"),
	https: require("https"),
	pwd: "pwd",

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
					var s = dat.toString("utf8");
					console.log(s);
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
		var req = natc.http.request(
			natc.crtHead("endLnk/" + natc.getPwd(), 0),
			function (res) {
				res.on("data", function (dat) {
					console.log(dat.toString("utf8"));
				});
			}
		);
		req.on ("error", function (e) {
			console.log("End_Err: " + e.message);
		});
		req.end();
	},
};

natc.link();
