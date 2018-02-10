const {app, BrowserWindow, shell} = require("electron");
const path = require("path");
const url = require("url");
const storage = require("electron-json-storage");
const request = require("request");
const dateFormat = require("dateformat");

/*
 *	VARIABLES
 */
let appWindow;
let authWindow;

/*
 *	FUNCTIONS
 */
function createWindow() {
	authWindow = new BrowserWindow({width: 800, height: 600, show: false, backgroundColor: "#fff", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false, nodeIntegration: false}});
	authWindow.setMenu(null);
	authWindow.webContents.session.clearStorageData(function() {
		storage.get("auth", function(error, data) {
			if (error) throw error;
			if(data.token) {
				appWindow = new BrowserWindow({width: 800, height: 600, frame: false, show: false, backgroundColor: "#1a1a1a", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
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
				storage.clear(function(error) {
					if (error) throw error;
				});
				request({
					url: "https://api.theartex.net/",
					method: "GET",
					json: true
				}, function (error, response, body) {
					if(error || response.body.method != "GET") {
						if(error) {
							console.log(error);
						}
						authWindow.loadURL(url.format({
							pathname: path.join(__dirname, "error.html"),
							protocol: "file:",
							slashes: true
						}));
					} else {
						// Insert your application's client identifier here. Artex Development Dashboard requires write access for notification updates.
						authWindow.loadURL("https://www.theartex.net/account/authorize/?client_id=" + CLIENT_IDENTIFIER + "&response_type=token&scope=write&redirect_uri=https://add.callback.localhost:144/");
					}
				});
			}
		});
	});
	
	/*
	 *	FUNCTION -> EVENTS
	 */
	authWindow.webContents.on("will-navigate", function(event, newUrl) {
		if(newUrl.startsWith("https://add.callback.localhost:144/") && newUrl.split("#")[1].split("=")[1]) {
			event.preventDefault();
			storage.set("auth", {token: newUrl.split("#")[1].split("=")[1]}, function(error) {
				if (error) throw error;
			});
			appWindow = new BrowserWindow({width: 800, height: 600, frame: false, show: false, backgroundColor: "#1a1a1a", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
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
		} else if(!newUrl.startsWith("https://www.theartex.net/account/login/") && !newUrl.startsWith("https://www.theartex.net/account/authorize/")) {
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
