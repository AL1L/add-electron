const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
const storage = require('electron-json-storage');

let authWindow;

function createWindow () {
	authWindow = new BrowserWindow({width: 800, height: 600, frame: false, show: false, backgroundColor: '#1a1a1a', minWidth: 800, minHeight: 600, webPreferences: {webSecurity: false}});
	
	storage.get('auth', function(error, data) {
		if (error) throw error;
		
		if(data.id && data.token && data.remember == "true") {
			authWindow.loadURL(url.format({
				pathname: path.join(__dirname, 'index.html'),
				protocol: 'file:',
				slashes: true
			}));
		} else {
			storage.clear(function(error) {
				if (error) throw error;
			});
			authWindow.loadURL('https://www.theartex.net/system/login/?red=file:///' + __dirname + '/index.html');
		}
	});
	
	authWindow.webContents.on('will-navigate', function (event, newUrl) {
		if(newUrl.includes("?id=") && newUrl.includes("&token=")) {
			event.preventDefault();
			
			var id = newUrl.split('?')[1].split('&')[0].split('=')[1];
			var token = newUrl.split('?')[1].split('&')[1].split('=')[1];
			var remember = newUrl.split('?')[1].split('&')[2].split('=')[1];
			
			if(id && token && remember) {
				storage.set('auth', {id: id, token: token, remember: remember}, function(error) {
					if (error) throw error;
				});
				authWindow.loadURL(url.format({
					pathname: path.join(__dirname, 'index.html'),
					protocol: 'file:',
					slashes: true
				}));
			} else {
				authWindow.loadURL('https://www.theartex.net/system/login/?red=file:///' + __dirname + '/index.html');
			}
		}
	});
	
	authWindow.once('ready-to-show', () => {
		authWindow.show()
	});

	authWindow.on('closed', () => {
		authWindow = null;
	});
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (win === null) {
		createWindow();
	}
});
