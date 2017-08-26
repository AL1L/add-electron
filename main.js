const {app, BrowserWindow} = require("electron");
const path = require("path");
const url = require("url");
const storage = require("electron-json-storage");

let appWindow;

/*
 *	FUNCTIONS
 */
function createWindow () {
	appWindow = new BrowserWindow({width: 800, height: 600, frame: false, show: false, backgroundColor: "#1a1a1a", minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
	storage.get("auth", function(error, data) {
		if (error) throw error;
		if(data.id && data.token && data.remember == "true") {
			appWindow.loadURL(url.format({
				pathname: path.join(__dirname, "index.html"),
				protocol: "file:",
				slashes: true
			}));
		} else {
			storage.clear(function(error) {
				if (error) throw error;
			});
			appWindow.loadURL("https://www.theartex.net/system/login/?red=http://localhost/add-electron");
		}
	});
	
	/*
	 *	FUNCTION -> EVENTS
	 */
	appWindow.webContents.on("will-navigate", function (event, newUrl) {
		if(newUrl.includes("?id=") && newUrl.includes("&token=")) {
			event.preventDefault();
			if(newUrl.split("?")[1].split("&")[0].split("=")[1] && newUrl.split("?")[1].split("&")[1].split("=")[1] && newUrl.split("?")[1].split("&")[2].split("=")[1]) {
				storage.set("auth", {id: newUrl.split("?")[1].split("&")[0].split("=")[1], token: newUrl.split("?")[1].split("&")[1].split("=")[1], remember: newUrl.split("?")[1].split("&")[2].split("=")[1]}, function(error) {
					if (error) throw error;
				});
				appWindow.loadURL(url.format({
					pathname: path.join(__dirname, "index.html"),
					protocol: "file:",
					slashes: true
				}));
			} else {
				appWindow.loadURL("https://www.theartex.net/system/login/?red=http://localhost/add-electron");
			}
		}
	});
	appWindow.once("ready-to-show", () => {
		appWindow.show()
	});
	appWindow.on("closed", () => {
		appWindow = null;
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
