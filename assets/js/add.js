const app = require("electron");
const path = require("path");
const url = require("url");
const storage = require("electron-json-storage");
const request = require("request");
const dateFormat = require("dateformat");
const fs = require("fs");

/*
 *	CONFIGURATION
 */
let configuration = JSON.parse(fs.readFileSync("./config.json", "utf-8"));

/*
 *	IPC
 */
const {BrowserWindow} = require("electron").remote;

/*
 *	VARIABLES
 */
let appWindow;
let authWindow;

/*
 *	DEFAULT FOR AUTHENTICATION
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
	
	authWindow = new BrowserWindow({width: 1008, height: 756, show: false, backgroundColor: "#1a1a1a", minWidth: 1008, minHeight: 756, webPreferences: {webSecurity: false, nodeIntegration: false}});
	authWindow.setMenu(null);
	authWindow.webContents.session.clearStorageData(function() {
		// Clear storage data...
	});
	request({
		url: "https://api.theartex.net/",
		method: "GET",
		json: true
	}, function (error, response, body) {
		if(error) {
			displayError();
		} else {
			storage.clear(function(error) {
				if (error) throw error;
			});
			authWindow.loadURL("https://www.theartex.net/account/authorize/?client_id=" + configuration.client_id + "&response_type=code&scope=write&redirect_uri=https://add.callback.localhost:144/");
			
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
			authWindow.webContents.on("will-navigate", function (event, newUrl) {
				if(newUrl.startsWith("https://add.callback.localhost:144/") && newUrl.split("?")[1].split("=")[1]) {
					event.preventDefault();
					storage.set("authorization", {code: newUrl.split("?")[1].split("=")[1]}, function(error) {
						if (error) throw error;
					});
					request({
						url: "https://api.theartex.net/v1/oauth/token/",
						method: "POST",
						body: {client_id: configuration.client_id, client_secret: configuration.client_secret, code: newUrl.split("?")[1].split("=")[1], grant_type: "authorization_code"},
						json: true
					}, function (error, response, body) {
						if(error) {
							authWindow.loadURL(url.format({
								pathname: path.join(__dirname, "error.html"),
								protocol: "file:",
								slashes: true
							}));
						} else if(response.body.data) {
							storage.set("authentication", {token: response.body.data.access_token, refresh: response.body.data.refresh_token, time: Date.now(), expires: response.body.data.expires_in * 1000}, function(error) {
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
							});
							appWindow.on("closed", () => {
								appWindow = null;
							});
						} else {
							request({
								url: "https://api.theartex.net/",
								method: "GET",
								json: true
							}, function (error, response, body) {
								if(error) {
									authWindow.loadURL(url.format({
										pathname: path.join(__dirname, "error.html"),
										protocol: "file:",
										slashes: true
									}));
								} else {
									storage.clear(function(error) {
										if (error) throw error;
									});
									authWindow.loadURL("https://www.theartex.net/account/authorize/?client_id=" + configuration.client_id + "&response_type=code&scope=write&redirect_uri=https://add.callback.localhost:144/");
								}
							});
						}
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
}
function loadUser(data) {
	storage.set("authentication", {token: data.access_token, refresh: data.refresh_token, time: Date.now(), expires: data.expires_in * 1000}, function(error) {
		if(error) throw error;
	});
	request({
		url: "https://api.theartex.net/v1/user/",
		method: "POST",
		body: {token: data.access_token},
		json: true
	}, function (error, response, body) {
		if(error) {
			displayError();
		} else if(response.body.data) {
			$.each(response.body.data, function(key, value) {
				$("." + key).text(value);
			});
		} else {
			authOut();
		}
	});
}
function getAuthorization() {
	storage.get("authorization", function(error, data) {
		if(error) throw error;
		if(data.code) {
			request({
				url: "https://api.theartex.net/v1/oauth/token/",
				method: "POST",
				body: {client_id: configuration.client_id, client_secret: configuration.client_secret, code: data.code, grant_type: "authorization_code"},
				json: true
			}, function (error, response, body) {
				if(error) {
					displayError();
				} else if(response.body.data) {
					loadUser(response.body.data);
				} else {
					authOut();
				}
			});
		} else {
			authOut();
		}
	});
}
function authCheck() {
	if(!auth) return;
	storage.get("authentication", function(error, data) {
		if(error) throw error;
		console.log((Date.now() - data.time) + " " + data.expires);
		if(data.token && Date.now() - data.time < data.expires) {
			request({
				url: "https://api.theartex.net/v1/oauth/token/",
				method: "POST",
				body: {client_id: configuration.client_id, client_secret: configuration.client_secret, refresh_token: data.refresh, grant_type: "refresh_token"},
				json: true
			}, function (error, response, body) {
				if(error) {
					displayError();
				} else if(response.body.data) {
					loadUser(response.body.data);
				} else {
					getAuthorization();
				}
			});
		} else {
			getAuthorization();
		}
	});
}
function loadPagination(page, body) {
	if(page > 1) $(".pagination").append("<a data-page=\"1\"><i class=\"fa fa-angle-double-left\"></i></a><a data-page=\"" + (page - 1) + "\"><i class=\"fa fa-angle-left\"></i></a>");
	var minimum, maximum;
	if(page < 5) {
		minimum = 1; 
		maximum = 9;
	} else if(page > (body.page.total - 8)) {
		minimum = body.page.total - 8; 
		maximum = body.page.total;
	} else {
		minimum = body.page.total - 4; 
		maximum = body.page.total + 4; 
	}
	if(maximum > body.page.total) maximum = body.page.total;
	if(minimum < 1) minimum = 1;
	for(var i = minimum; i <= maximum; i++) $(".pagination").append("<a" + (i == page ? " class=\"active\"" : "") + " data-page=\"" + i + "\">" + i + "</a>");
	if(body.page.total > page) $(".pagination").append("<a data-page=\"" + (page + 1) + "\"><i class=\"fa fa-angle-right\"></i></a><a data-page=\"" + body.page.total + "\"><i class=\"fa fa-angle-double-right\"></i></a>");
}
function getAnnouncements(page = 1, limit = 10) {
	$(".content").attr("data-page", "announcements");
	$(".pagination").empty(), $("tbody").html("<tr><td>Loading announcements...</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>"), $("thead").html("<tr><th>Announcement</th><th class=\"text-right\">Author</th><th class=\"text-right\">Date</th></tr>");
	request({
		url: "https://api.theartex.net/v1/announcements",
		method: "POST",
		json: true,
		body: {page: page, limit: limit}
	}, function (error, response, body) {
		if(error || response.body.status == "error") {
			displayError();
		} else {
			$("tbody").empty();
			if(response.body.data) {
				$.each(response.body.data, function(key, value) {
					$("tbody").append("<tr><td>" + value.content + "</td><td class=\"text-right\">" + value.user.username + "</td><td class=\"text-right\">" + dateFormat(value.trn_date, "mmmm dS, yyyy") + "</td></tr>");
				});
				loadPagination(page, response.body);
			} else {
				$("tbody").append("<tr><td>No announcements could be listed on this page.</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>");
				$(".pagination").append("<a class=\"active\" data-page=\"1\">1</a>");
			}
		}
	});
}
function getNotifications(page = 1, limit = 10) {
	$(".content").attr("data-page", "notifications");
	$(".pagination").empty(), $("tbody").html("<tr><td>Loading notifications...</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>"), $("thead").html("<tr><th>Notification</th><th class=\"text-right\">Application</th><th class=\"text-right\">Date</th></tr>");
	storage.get("authentication", function(error, data) {
		if (error) throw error;
		request({
			url: "https://api.theartex.net/v1/user/notifications",
			method: "POST",
			json: true,
			body: {token: data.token, page: page, limit: limit}
		}, function (error, response, body) {
			if(error) {
				displayError();
			} else if(response.body.status == "error") {
				authOut();
			} else {
				$("tbody").empty();
				if(response.body.data) {
					$.each(response.body.data, function(key, value) {
						$("tbody").append("<tr><td>" + value.content + "</td><td class=\"text-right\">" + value.application.name + "</td><td class=\"text-right\">" + dateFormat(value.trn_date, "mmmm dS, yyyy") + "</td></tr>");
					});
					loadPagination(page, response.body);
				} else {
					$("tbody").append("<tr><td>No notifications could be listed on this page.</td><td class=\"text-right\">-</td><td class=\"text-right\">-</td></tr>");
					$(".pagination").append("<a class=\"active\" data-page=\"1\">1</a>");
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
		if(error) throw error;
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
	authCheck();
	setInterval(authCheck, 1000);	
	getAnnouncements();
});
