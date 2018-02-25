const {app, BrowserWindow, shell} = require("electron");
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
 *	VARIABLES
 */
let appWindow;
let authWindow;

/*
 *	FUNCTIONS
 */
function displayError() {
	authWindow.loadURL(url.format({
		pathname: path.join(__dirname, "error.html"),
		protocol: "file:",
		slashes: true
	}));
}
function createAuthWindow() {
	request({
		url: "https://api.theartex.net/",
		method: "GET",
		json: true
	}, function (error, response, body) {
		if(error) {
			displayError();
		} else {
			storage.clear(function(error) {
				if(error) throw error;
			});
			authWindow.loadURL("https://www.theartex.net/account/authorize/?client_id=" + configuration.client_id + "&response_type=code&scope=write&redirect_uri=https://add.callback.localhost:144/");
		}
	});
}
function createAppWindow(data) {
	storage.set("authentication", {token: data.access_token, refresh: data.refresh_token, time: Date.now(), expires: data.expires_in * 1000}, function(error) {
		if(error) throw error;
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
					createAppWindow(response.body.data);
				} else {
					createAuthWindow();
				}
			});
		} else {
			createAuthWindow();
		}
	});
}
function createWindow() {
	authWindow = new BrowserWindow({width: 1008, height: 756, show: false, backgroundColor: "#fff", minWidth: 1008, minHeight: 756, webPreferences: {webSecurity: false, nodeIntegration: false}});
	authWindow.setMenu(null);
	authWindow.webContents.session.clearStorageData(function() {
		// Clear storage data...
	});
	storage.get("authentication", function(error, data) {
		if(error) throw error;
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
					createAppWindow(response.body.data);
				} else {
					getAuthorization();
				}
			});
		} else {
			getAuthorization();
		}
	});
	
	/*
	 *	FUNCTION -> EVENTS
	 */
	authWindow.webContents.on("will-navigate", function(event, newUrl) {
		if(newUrl.startsWith("https://add.callback.localhost:144/") && newUrl.split("?")[1].split("=")[1]) {
			event.preventDefault();
			storage.set("authorization", {code: newUrl.split("?")[1].split("=")[1]}, function(error) {
				if(error) throw error;
			});
			request({
				url: "https://api.theartex.net/v1/oauth/token/",
				method: "POST",
				body: {client_id: configuration.client_id, client_secret: configuration.client_secret, code: newUrl.split("?")[1].split("=")[1], grant_type: "authorization_code"},
				json: true
			}, function (error, response, body) {
				if(error) {
					displayError();
				} else if(response.body.data) {
					createAppWindow(response.body.data);
				} else {
					createAuthWindow();
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
	
	/*
	 *	FUNCTION -> EVENTS
	 */
	authWindow.once("ready-to-show", () => {
		authWindow.show()
	});
	authWindow.on("closed", () => {
		authWindow = null;
	});
}

/*
 *	EVENTS
 */
app.on("ready", createWindow);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
app.on("activate", () => {
	if (win === null) {
		createWindow();
	}
});
