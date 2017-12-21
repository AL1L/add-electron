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
	authWindow = new BrowserWindow({width: 800, height: 600, show: false, backgroundColor: "#fff", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
	authWindow.setMenu(null);
	authWindow.webContents.session.clearCache(function() {
		storage.get("auth", function(error, data) {
			if (error) throw error;
			if(data.id && data.token && data.remember == "true") {
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
					url: "https://api.theartex.net/user/?sec=token",
					method: "GET",
					json: true
				}, function (error, response, body) {
					if(error || response.body.status != "success") {
						if(error) {
							console.log(error);
						}
						authWindow.loadURL(url.format({
							pathname: path.join(__dirname, "error.html"),
							protocol: "file:",
							slashes: true
						}));
					} else {
						authWindow.loadURL("https://www.theartex.net/system/login/?red=https://localhost:144/&minimal=true&token=" + response.body.data.token + "&id=" + response.body.data.id);
					}
				});
			}
		});
	});
	
	/*
	 *	FUNCTION -> EVENTS
	 */
	authWindow.webContents.on("will-navigate", function(event, newUrl) {
		if(newUrl.startsWith("https://localhost:144/") && newUrl.split("?")[1].split("&")[0].split("=")[1] && newUrl.split("?")[1].split("&")[1].split("=")[1] && newUrl.split("?")[1].split("&")[2].split("=")[1]) {
			event.preventDefault();
			storage.set("auth", {id: newUrl.split("?")[1].split("&")[0].split("=")[1], token: newUrl.split("?")[1].split("&")[1].split("=")[1], remember: newUrl.split("?")[1].split("&")[2].split("=")[1]}, function(error) {
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
		} else if(["https://www.theartex.net/system/registration/", "https://www.theartex.net/system/reset/"].indexOf(newUrl) >= 0) {
			event.preventDefault();
			shell.openExternal(newUrl);
		}
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
