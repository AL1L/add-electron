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
var auth = true;

/*
 *	FUNCTIONS
 */
function displayError() {
	auth = false;
	
	authWindow = new BrowserWindow({width: 1008, height: 756, show: false, backgroundColor: "#fff", minWidth: 1008, minHeight: 756, webPreferences: {webSecurity: false}});
	authWindow.setMenu(null);
	authWindow.loadURL(url.format({
		pathname: path.join(__dirname, "error.html"),
		protocol: "file:",
		slashes: true
	}));
	
	/*
	 *	FUNCTION -> EVENTS
	 */
	authWindow.once("ready-to-show", () => {
		authWindow.show();
		app.remote.getCurrentWindow().hide();
	});
	authWindow.on("closed", () => {
		authWindow = null;
		app.remote.getCurrentWindow().close();
	});
}
 
function authOut() {
	auth = false;
	
	storage.clear(function(error) {
		if (error) throw error;
	});
	authWindow = new BrowserWindow({width: 1008, height: 756, show: false, backgroundColor: "#1a1a1a", minWidth: 1008, minHeight: 756, webPreferences: {webSecurity: false, nodeIntegration: false}});
	authWindow.setMenu(null);
	authWindow.webContents.session.clearStorageData(function() {
		request({
			url: "https://api.theartex.net/",
			method: "GET",
			json: true
		}, function (error, response, body) {
			if(error || response.body.method != "GET") {
				displayError();
			} else {
				// Insert your application's client identifier here. Artex Development Dashboard requires write access for notification updates.
				authWindow.loadURL("https://www.theartex.net/account/authorize/?client_id=" + CLIENT_IDENTIFIER + "&response_type=token&scope=write&redirect_uri=https://add.callback.localhost:144/");
				
				/*
				 *	FUNCTION -> EVENTS
				 */
				authWindow.once("ready-to-show", () => {
					authWindow.show();
					app.remote.getCurrentWindow().hide();
				});
				authWindow.on("closed", () => {
					authWindow = null;
				});
				authWindow.webContents.on("will-navigate", function (event, newUrl) {
					if(newUrl.startsWith("https://add.callback.localhost:144/") && newUrl.split("#")[1].split("=")[1]) {
						event.preventDefault();
						storage.set("auth", {token: newUrl.split("#")[1].split("=")[1]}, function(error) {
							if (error) throw error;
						});
						appWindow = new BrowserWindow({width: 1008, height: 756, frame: false, show: false, backgroundColor: "#1a1a1a", minWidth: 1008, minHeight: 756, webPreferences: {webSecurity: false}});
						appWindow.loadURL(url.format({
							pathname: path.join(__dirname, "index.html"),
							protocol: "file:",
							slashes: true
						}));
						
						/*
						 *	FUNCTION -> EVENTS
						 */
						appWindow.once("ready-to-show", () => {
							appWindow.show();
							authWindow.close();
							app.remote.getCurrentWindow().close();
						});
					} else if(!newUrl.startsWith("https://www.theartex.net/account/login/") && !newUrl.startsWith("https://www.theartex.net/account/authorize/") && !newUrl.startsWith("https://www.theartex.net/account/logout/")) {
						event.preventDefault();
						shell.openExternal(newUrl);
					}
				});
				authWindow.webContents.on("new-window", function(event, newUrl) {
					event.preventDefault();
					shell.openExternal(newUrl);
				});
			}
		});
	});
}
function authCheck() {
	if(auth == true) {
		storage.get("auth", function(error, data) {
			if (error) throw error;
			if(data.token) {
				request({
					url: "https://api.theartex.net/v1/user",
					method: "POST",
					json: true,
					body: {token: data.token}
				}, function (error, response, body) {
					if(error || response.body.method != "POST") {
						displayError();
					} else if(response.body.status == "error") {
						authOut();
					} else {
						$.each(response.body.data, function(key, value) {
							$("." + key).text(value);
						});
						storage.set("user", {username: response.body.data.username, role: response.body.data.role, email: response.body.data.email, gravatar: response.body.data.gravatar, notifications: response.body.data.notifications}, function(error) {
							if (error) throw error;
						});
						request({
							url: "https://api.theartex.net/v1/user/notifications",
							method: "POST",
							json: true,
							body: {token: data.token}
						}, function (error, response, body) {
							if(error || response.body.method != "POST") {
								displayError();
							} else if(response.body.status == "error") {
								authOut();
							} else {
								$.each(response.body.data, function(key, value) {
									if(value.new == "true") {
										if(value.content.length > 200) {
											value.content = value.content.substr(0, 197) + "...";
										}
										let myNotification = new Notification(value.application.name, {body: value.content});
										request({
											url: "https://api.theartex.net/v1/notification/update",
											method: "POST",
											json: true,
											body: {uid: value.uid, token: data.token}
										}, function (error) {
											if (error) throw error;
										});
									}
								});
							}
						});
					}
				});
			} else {
				authOut();
			}
		});
	}
}
function getAnnouncements(page = 1, limit = 10) {
	$(".content").attr("data-page", "announcements");
	$(".pagination").empty(), $("tbody").html("<tr><td>Loading announcements...</td><td class=\"text-right\">-</td></tr>"), $("thead").html("<tr><th>Announcement</th><th class=\"text-right\">Author</th><th class=\"text-right\">Date</th></tr>");
	request({
		url: "https://api.theartex.net/v1/announcements",
		method: "POST",
		json: true,
		body: {page: page, limit: limit}
	}, function (error, response, body) {
		if(error || response.body.method != "POST" || response.body.status == "error") {
			displayError();
		} else {
			$("tbody").empty();
			if(response.body.data) {
				$.each(response.body.data, function(key, value) {
					$("tbody").append("<tr><td>" + value.content + "</td><td class=\"text-right\">" + value.user.username + "</td><td class=\"text-right\">" + dateFormat(value.trn_date, "mmmm dS, yyyy") + "</td></tr>");
				});
			} else {
				$("tbody").append("<tr><td>No announcements could be listed on this page.</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>");
			}
			if(page > 1) {
				$(".pagination").append("<a data-page=\"1\"><i class=\"fa fa-angle-double-left\"></i></a><a data-page=\"" + (page - 1) + "\"><i class=\"fa fa-angle-left\"></i></a>");
			}
			var minimum, maximum;
			if(page < 5) {
				minimum = 1; 
				maximum = 9;
			} else if(page > (response.body.page.total - 8)) {
				minimum = response.body.page.total - 8; 
				maximum = response.body.page.total;
			} else {
				minimum = response.body.page.total - 4; 
				maximum = response.body.page.total + 4; 
			}
			if(maximum > response.body.page.total) {
				maximum = response.body.page.total;
			}
			if(minimum < 1) {
				minimum = 1;
			}
			for(var i = minimum; i <= maximum; i++) {
				$(".pagination").append("<a" + (i == page ? " class=\"active\"" : "") + " data-page=\"" + i + "\">" + i + "</a>");
			}
			if(response.body.page.total > page) {
				$(".pagination").append("<a data-page=\"" + (page + 1) + "\"><i class=\"fa fa-angle-right\"></i></a><a data-page=\"" + response.body.page.total + "\"><i class=\"fa fa-angle-double-right\"></i></a>");
			}
		}
	});
}
function getNotifications(page = 1, limit = 10) {
	$(".content").attr("data-page", "notifications");
	$(".pagination").empty(), $("tbody").html("<tr><td>Loading notifications...</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>"), $("thead").html("<tr><th>Notification</th><th class=\"text-right\">Application</th><th class=\"text-right\">Date</th></tr>");
	storage.get("auth", function(error, data) {
		if (error) throw error;
		request({
			url: "https://api.theartex.net/v1/user/notifications",
			method: "POST",
			json: true,
			body: {token: data.token, page: page, limit: limit}
		}, function (error, response, body) {
			if(error || response.body.method != "POST") {
				displayError();
			} else if(response.body.status == "error") {
				authOut();
			} else {
				$("tbody").empty();
				if(response.body.data) {
					$.each(response.body.data, function(key, value) {
						$("tbody").append("<tr><td>" + value.content + "</td><td class=\"text-right\">" + value.application.name + "</td><td class=\"text-right\">" + dateFormat(value.trn_date, "mmmm dS, yyyy") + "</td></tr>");
					});
				} else {
					$("tbody").append("<tr><td>No notifications could be listed on this page.</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>");
				}
				if(page > 1) {
					$(".pagination").append("<a data-page=\"1\"><i class=\"fa fa-angle-double-left\"></i></a><a data-page=\"" + (page - 1) + "\"><i class=\"fa fa-angle-left\"></i></a>");
				}
				var minimum, maximum;
				if(page < 5) {
					minimum = 1; 
					maximum = 9;
				} else if(page > (response.body.page.total - 8)) {
					minimum = response.body.page.total - 8; 
					maximum = response.body.page.total;
				} else {
					minimum = response.body.page.total - 4; 
					maximum = response.body.page.total + 4; 
				}
				if(maximum > response.body.page.total) {
					maximum = response.body.page.total;
				}
				if(minimum < 1) {
					minimum = 1;
				}
				for(var i = minimum; i <= maximum; i++) {
					$(".pagination").append("<a" + (i == page ? " class=\"active\"" : "") + " data-page=\"" + i + "\">" + i + "</a>");
				}
				if(response.body.page.total > page) {
					$(".pagination").append("<a data-page=\"" + (page + 1) + "\"><i class=\"fa fa-angle-right\"></i></a><a data-page=\"" + response.body.page.total + "\"><i class=\"fa fa-angle-double-right\"></i></a>");
				}
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
    if(app.remote.getCurrentWindow().isMaximized()) {
		app.remote.getCurrentWindow().unmaximize();
		$(this).html("<i class=\"fa fa-window-maximize\"></i>");
	} else {
		app.remote.getCurrentWindow().maximize();
		$(this).html("<i class=\"fa fa-window-restore\"></i>");
	}
});
$(".closeWindow").click(function() {
    app.remote.getCurrentWindow().close();
});
$(".getAnnouncements").click(function() {
    getAnnouncements();
});
$(".getNotifications").click(function() {
    getNotifications();
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
	if($(".content").attr("data-page") == "notifications") {
		getNotifications(parseInt($(this).attr("data-page")));
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
	setInterval(authCheck, 1000);	
});
