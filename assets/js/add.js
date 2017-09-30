const app = require("electron");
const path = require("path");
const url = require("url");
const storage = require("electron-json-storage");
const request = require("request");
const dateFormat = require("dateformat");

/*
 *	IPC
 */
const {BrowserWindow} = require("electron").remote;

/*
 *	VARIABLES
 */
let auth = true;

/*
 *	FUNCTIONS
 */
function authOut() {
	auth = false;
	authWindow = new BrowserWindow({width: 800, height: 600, show: false, backgroundColor: "#1a1a1a", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
	authWindow.setMenu(null);
	authWindow.loadURL("https://www.theartex.net/system/login/?red=https://localhost:144/&type=minimal");
	authWindow.once("ready-to-show", () => {
		authWindow.show();
		app.remote.getCurrentWindow().hide();
	});
	authWindow.on("closed", () => {
		authWindow = null;
	});
	authWindow.webContents.on("will-navigate", function (event, newUrl) {
		if(newUrl.includes("?id=") && newUrl.includes("&token=") && newUrl.includes("&remember=")) {
			event.preventDefault();
			if(newUrl.split("?")[1].split("&")[0].split("=")[1] && newUrl.split("?")[1].split("&")[1].split("=")[1] && newUrl.split("?")[1].split("&")[2].split("=")[1]) {
				storage.set("auth", {id: newUrl.split("?")[1].split("&")[0].split("=")[1], token: newUrl.split("?")[1].split("&")[1].split("=")[1], remember: newUrl.split("?")[1].split("&")[2].split("=")[1]}, function(error) {
					if (error) throw error;
				});
				appWindow = new BrowserWindow({width: 800, height: 600, frame: false, show: false, backgroundColor: "#1a1a1a", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
				appWindow.loadURL(url.format({
					pathname: path.join(__dirname, "index.html"),
					protocol: "file:",
					slashes: true
				}));
				appWindow.once("ready-to-show", () => {
					appWindow.show();
					authWindow.close();
					app.remote.getCurrentWindow().close();
				});
			} else {
				authWindow.loadURL("https://www.theartex.net/system/login/?red=https://localhost:144/&type=minimal");
			}
		}
	});
}
function authCheck() {
	if(auth == true) {
		storage.get("auth", function(error, data) {
			if (error) throw error;
			if(data.token && data.id) {
				request({
					url: "https://www.theartex.net/cloud/api/user",
					method: "POST",
					json: true,
					body: {sec: "validate", id: data.id, token: data.token}
				}, function (error, response, body) {
					if (error) throw error;
					if(response.body.status == "success") {
						$.each(response.body.data, function(key, value) {
							$("." + key).text(value);
						});
						storage.set("user", {username: response.body.data.username, role: response.body.data.role, email: response.body.data.email, gravatar: response.body.data.gravatar, page: response.body.data.page, last_seen: response.body.data.last_seen}, function(error) {
							if (error) throw error;
						});
						request({
							url: "https://www.theartex.net/cloud/api/user",
							method: "POST",
							json: true,
							body: {sec: "session", application: "Artex Development Dashboard (Electron)", id: data.id, token: data.token}
						}, function (error) {
							if (error) throw error;
						});
						request({
							url: "https://www.theartex.net/cloud/api/alerts",
							method: "POST",
							json: true,
							body: {sec: "list", id: data.id, token: data.token}
						}, function (error, response, body) {
							if (error) throw error;
							if(response.body.status == "success") {
								var message;
								$.each(response.body.data, function(key, value) {
									if(value.status == "new") {
										message = value.message;
										if(message.length > 200) {
											message = message.substr(0, 197) + "...";
										}
										let myNotification = new Notification(value.title, {body: message})
										request({
											url: "https://www.theartex.net/cloud/api/alerts",
											method: "POST",
											json: true,
											body: {sec: "status", alert: value.id, status: "idle", id: data.id, token: data.token}
										}, function (error) {
											if (error) throw error;
										});
									}
								});
							}
						});
					} else {
						storage.clear(function(error) {
							if (error) throw error;
						});
						authOut();
					}
				});
			} else {
				storage.clear(function(error) {
					if (error) throw error;
				});
				authOut();
			}
		});
	}
}
function getAnnouncements(page = 1, multiple = 10) {
	$(".content").attr("data-page", "announcements");
	$(".pagination").empty(),
		$("tbody").empty(),
		$("thead").empty();
	$("thead").append("<tr><th>Announcement</th><th class=\"text-right\">Date</th></tr>"),
		$("tbody").append("<tr><td>Loading announcements...</td><td class=\"text-right\">---</td></tr>");
	var page = {min: (page - 1) * multiple, max: page * multiple, count: 0, posts: 0, number: page},
		pages = {};
	request({
		url: "https://www.theartex.net/cloud/api/",
		method: "POST",
		json: true,
		body: {sec: "announcements"}
	}, function (error, response, body) {
		if (error) throw error;
		$("tbody").empty();
		if(response.body.status == "success") {
			$.each(response.body.data, function(key, value) {
				page.count++;
				if(page.count <= page.max && page.count > page.min) {
					$("tbody").append("<tr><td>" + value.message + "</td><td class=\"text-right\">" + dateFormat(value.trn_date, "mmmm dS, yyyy") + "</td></tr>");
					page.posts++;
				}
			});
			if(page.posts == 0) {
				$("tbody").append("<tr><td>No announcements could be listed on this page.</td><td class=\"text-right\">---</td></tr>");
				var rows = 0;
			} else {
				var rows = Object.keys(response.body.data).length;
			}
			if(page.number > 1) {
				$(".pagination").append("<a data-page=\"1\"><i class=\"fa fa-angle-double-left\"></i> First</a><a data-page=\"" + (page.number - 1) + "\"><i class=\"fa fa-angle-left\"></i> Previous</a>");
			}
			pages.total = Math.floor(rows / multiple);
			if(rows % 10 != 0 || rows == 0) {
				pages.total++;
			}
			if(page.number < 5) {
				pages.min = 1; 
				pages.max = 9;
			} else if(page.number > (pages.total - 8)) {
				pages.min = pages.total - 8; 
				pages.max = pages.total;
			} else {
				pages.min = pages.number - 4; 
				pages.max = pages.number + 4; 
			}
			if(pages.max > pages.total) {
				pages.max = pages.total;
			}
			if(pages.min < 1) {
				pages.min = 1;
			}
			pages.count = pages.min;
			while(pages.count <= pages.max) {
				$(".pagination").append("<a" + (pages.count == page.number ? " class=\"active\"" : "") + " data-page=\"" + pages.count + "\">" + pages.count + "</a>");
				pages.count++;
			}
			if(rows > page.max) {
				$(".pagination").append("<a data-page=\"" + (page.number + 1) + "\">Next <i class=\"fa fa-angle-right\"></i></a><a data-page=\"" + pages.total + "\">Last <i class=\"fa fa-angle-double-right\"></i></a>");
			}
		} else {
			$("tbody").append("<tr><td>An error occurred while contacting the API.</td><td class=\"text-right\">---</td></tr>");
		}
	});
}
function getAlerts(page = 1, multiple = 10) {
	$(".content").attr("data-page", "alerts");
	$(".pagination").empty(),
		$("tbody").empty(),
		$("thead").empty();
	$("thead").append("<tr><th>Alert</th><th class=\"text-right\">Date</th></tr>"),
		$("tbody").append("<tr><td>Loading alerts...</td><td class=\"text-right\">---</td></tr>");
	var page = {min: (page - 1) * multiple, max: page * multiple, count: 0, posts: 0, number: page},
		pages = {};
	storage.get("auth", function(error, data) {
		if(error) throw error;
		request({
			url: "https://www.theartex.net/cloud/api/alerts",
			method: "POST",
			json: true,
			body: {sec: "list", id: data.id, token: data.token}
		}, function (error, response, body) {
			if (error) throw error;
			$("tbody").empty();
			if(response.body.status == "success") {
				$.each(response.body.data, function(key, value) {
					page.count++;
					if(page.count <= page.max && page.count > page.min) {
						$("tbody").append("<tr><td>" + ((value.status == "new" || value.status == "idle") ? "<span class=\"new\"><i class=\"fa fa-exclamation-triangle\"></i></span> " : "") + "<span class=\"title\">(" + value.title + ")</span> " + value.message + "</td><td class=\"text-right\">" + dateFormat(value.trn_date, "mmmm dS, yyyy") + "</td></tr>");
						page.posts++;
					}
					if(value.status == "new" || value.status == "idle") {
						request({
							url: "https://www.theartex.net/cloud/api/alerts",
							method: "POST",
							json: true,
							body: {sec: "status", alert: value.id, status: "old", id: data.id, token: data.token}
						}, function (error) {
							if (error) throw error;
						});
					}
				});
				if(page.posts == 0) {
					$("tbody").append("<tr><td>No alerts could be listed on this page.</td><td class=\"text-right\">---</td></tr>");
					var rows = 0;
				} else {
					var rows = Object.keys(response.body.data).length;
				}
				if(page.number > 1) {
					$(".pagination").append("<a data-page=\"1\"><i class=\"fa fa-angle-double-left\"></i> First</a><a data-page=\"" + (page.number - 1) + "\"><i class=\"fa fa-angle-left\"></i> Previous</a>");
				}
				pages.total = Math.floor(rows / multiple);
				if(rows % 10 != 0 || rows == 0) {
					pages.total++;
				}
				if(page.number < 5) {
					pages.min = 1; 
					pages.max = 9;
				} else if(page.number > (pages.total - 8)) {
					pages.min = pages.total - 8; 
					pages.max = pages.total;
				} else {
					pages.min = pages.number - 4; 
					pages.max = pages.number + 4; 
				}
				if(pages.max > pages.total) {
					pages.max = pages.total;
				}
				if(pages.min < 1) {
					pages.min = 1;
				}
				pages.count = pages.min;
				while(pages.count <= pages.max) {
					$(".pagination").append("<a" + (pages.count == page.number ? " class=\"active\"" : "") + " data-page=\"" + pages.count + "\">" + pages.count + "</a>");
					pages.count++;
				}
				if(rows > page.max) {
					$(".pagination").append("<a data-page=\"" + (page.number + 1) + "\">Next <i class=\"fa fa-angle-right\"></i></a><a data-page=\"" + pages.total + "\">Last <i class=\"fa fa-angle-double-right\"></i></a>");
				}
			} else {
				$("tbody").append("<tr><td>An error occurred while contacting the API.</td><td class=\"text-right\">---</td></tr>");
			}
		});
	});
}

/*
 *	EVENTS
 */
$(".minimizeWindow").click(function() {
    app.remote.getCurrentWindow().minimize();
});
$(".maximizeWindow").click(function() {
    (!app.remote.getCurrentWindow().isMaximized() ? app.remote.getCurrentWindow().maximize() : app.remote.getCurrentWindow().unmaximize());
});
$(".closeWindow").click(function() {
    app.remote.getCurrentWindow().close();
});
$(".getAnnouncements").click(function() {
    getAnnouncements();
});
$(".getAlerts").click(function() {
    getAlerts();
});
$(".authOut").click(function() {
	storage.clear(function(error) {
		if (error) throw error;
	});
	authOut();
});
$(document).on("click", "a[href^=\"http\"]", function(event) {
    event.preventDefault();
    app.shell.openExternal(this.href);
});
$(".pagination").on("click", "a", function() {
	if($(".content").attr("data-page") == "alerts") {
		getAlerts(parseInt($(this).attr("data-page")));
	} else {
		getAnnouncements(parseInt($(this).attr("data-page")));
	}
});

/*
 *	LOAD
 */
$(document).ready(function() {
	getAnnouncements();
	authCheck();
	setInterval(authCheck, 2500);	
});
