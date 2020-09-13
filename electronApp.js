var {ipcMain, app, BrowserWindow, globalShortcut, dialog} = require('electron')
var { autoUpdater } = require("electron-updater")
var path = require('path')
var mainWindow
var termWindow
var factoryWindow
var promptWindow
var promptOptions
var promptAnswer
autoUpdater.autoDownload = false
autoUpdater.logger = null
app.allowRendererProcessReuse = false

function getPathForResource(fileName) {
	if (process.env.NODE_ENV === 'development') {
		var location = "www/" + fileName
	} else {
		var location = "../../www/" + fileName
	}
	return path.join("file://", __dirname, location)
}

var browserAddons = {
	getPathForExecutable: function(fileName) {
		if (process.env.NODE_ENV === 'development') {
			var location =  "compilation/" + fileName
		} else {
			var location =  "../../compilation/" + fileName
		}
		return path.join(__dirname, location)
	},
	/**
	 * Using this guide to share methods between renderer and browser side
	 * https://github.com/electron/electron/issues/1095
	 */
	getPathForResource: function(fileName) {
		if (process.env.NODE_ENV === 'development') {
			return '../' + fileName
		} else {
			return '../resources/app/' + fileName
		}
	},

	getArduinoCommandForVefiry: function() {
		if (process.platform === 'linux') {
			return 'linux/arduino/verify.sh'
		} else if (process.platform === 'win32') {
			return 'win32/arduino/verify.bat'
		} else {
			console.error(`Unspecified platform ${process.platform} for Arduino verify`)
		}
	},
	
	getArduinoCommandForFlash: function() {
		if (process.platform === 'linux') {
			return 'linux/arduino/flash.sh'
		} else if (process.platform === 'win32') {
			return 'win32/arduino/flash.bat'
		} else {
			console.error(`Unspecified platform ${process.platform} for Arduino flash`)
		}
	}
}

function createWindow () {
	mainWindow = new BrowserWindow({width: 1240, height: 700, icon: 'www/media/icon.png', frame: false, movable: true, webPreferences: {
		nodeIntegration: true
	}})
	var current_path = getPathForResource('index.html')
	if (process.platform == 'win32' && process.argv.length >= 2) {
		mainWindow.loadURL(path.join(__dirname, current_path + '?url='+process.argv[1]))
	} else {
		mainWindow.loadURL(current_path)
	}
	mainWindow.setMenu(null)
	mainWindow.on('closed', function () {
		mainWindow = null
	})
	mainWindow.browserAddons = browserAddons
}

function createTerm() {
	termWindow = new BrowserWindow({width: 640, height: 560, 'parent': mainWindow, resizable: false, movable: true, frame: false, modal: true, webPreferences: {
		nodeIntegration: true
	}}) 
	termWindow.loadURL(getPathForResource('term.html'))
	termWindow.setMenu(null)
	termWindow.on('closed', function () { 
		termWindow = null 
	})
	termWindow.getPathForResourceInBrowser = getPathForResourceInBrowser
	termWindow.browserAddons = browserAddons
}
function createRepl() {
	termWindow = new BrowserWindow({width: 640, height: 515, 'parent': mainWindow, resizable: false, movable: true, frame: false, modal: true, webPreferences: {
		nodeIntegration: true
	}}) 
	termWindow.loadURL(getPathForResource('repl.html'))
	termWindow.setMenu(null)
	termWindow.on('closed', function () { 
		termWindow = null 
	})
	termWindow.browserAddons = browserAddons
}
function createfactory() {
	factoryWindow = new BrowserWindow({width: 1066, height: 640, 'parent': mainWindow, resizable: true, movable: true, frame: false, webPreferences: {
		nodeIntegration: true
	}})
	factoryWindow.loadURL(getPathForResource('factory.html'))
	factoryWindow.setMenu(null)
	factoryWindow.on('closed', function () { 
		factoryWindow = null 
	})
	factoryWindow.browserAddons = browserAddons
}
function promptModal(options, callback) {
	promptOptions = options
	promptWindow = new BrowserWindow({width:360, height: 135, 'parent': mainWindow, resizable: false, movable: true, frame: false, modal: true, webPreferences: {
		nodeIntegration: true
	}})
	promptWindow.loadURL(getPathForResource('modalVar.html'))
	promptWindow.on('closed', function () { 
		promptWindow = null 
		callback(promptAnswer)
	})
	promptWindow.browserAddons = browserAddons
}
function open_console(mainWindow = BrowserWindow.getFocusedWindow()) {
	if (mainWindow) mainWindow.webContents.toggleDevTools()
}
function refresh(mainWindow = BrowserWindow.getFocusedWindow()) {
	if (mainWindow) mainWindow.webContents.reloadIgnoringCache()
}
app.on('ready',  function () {
	createWindow()
	globalShortcut.register('F8', open_console)
	globalShortcut.register('F5', refresh)
})
app.on('activate', function () {
	if (mainWindow === null) createWindow()
})
app.on('window-all-closed', function () {
	globalShortcut.unregisterAll()
	if (process.platform !== 'darwin') app.quit()
})
ipcMain.on("version", function () {
	autoUpdater.checkForUpdates()  
})
ipcMain.on("prompt", function () {
	createTerm()  
})
ipcMain.on("repl", function () {
	createRepl()  
})
ipcMain.on("factory", function () {
	createfactory()       
})
ipcMain.on("openDialog", function (event, data) {
    event.returnValue = JSON.stringify(promptOptions, null, '')
})
ipcMain.on("closeDialog", function (event, data) {
	promptAnswer = data
})
ipcMain.on("modalVar", function (event, arg) {
	promptModal(
		{"label": arg, "value": "", "ok": "OK"}, 
	    function(data) {
	       event.returnValue = data
        }
	)       
})
ipcMain.on('save-bin', function (event) {
	dialog.showSaveDialog(mainWindow,{
		title: 'Exporter les binaires',
		defaultPath: 'Otto_hex',
		filters: [{ name: 'Binary', extensions: ['hex']}]
	},
	function(filename){
		event.sender.send('saved-bin', filename)
	})
})
ipcMain.on('save-ino', function (event) {
	dialog.showSaveDialog(mainWindow,{
		title: 'Save format .INO',
		defaultPath: 'Otto_Arduino',
		filters: [{ name: 'Arduino', extensions: ['ino'] }]
	},
	function(filename){
		event.sender.send('saved-ino', filename)
	})
})
ipcMain.on('save-py', function (event) {
	dialog.showSaveDialog(mainWindow,{
		title: 'Save format .PY',
		defaultPath: 'Otto_python',
		filters: [{ name: 'python', extensions: ['py'] }]
	},
	function(filename){
		event.sender.send('saved-py', filename)
	})
})
ipcMain.on('save-bloc', function (event) {
	dialog.showSaveDialog(mainWindow,{
		title: 'Save format .BLOC',
		defaultPath: 'Otto_block',
		filters: [{ name: 'Ottoblockly', extensions: ['bloc'] }]
	},
	function(filename){
		event.sender.send('saved-bloc', filename)
	})
})
ipcMain.on('save-csv', function (event) {
	dialog.showSaveDialog(mainWindow,{
		title: 'Save format CSV',
		defaultPath: 'Otto_csv',
		filters: [{ name: 'data', extensions: ['csv'] }]
	},
	function(filename){
		event.sender.send('saved-csv', filename)
	})
})
autoUpdater.on('error', function(error) {
	dialog.showErrorBox('Error: ', error == null ? "unknown" : (error.stack || error).toString())
})
autoUpdater.on('update-available', function() {
	dialog.showMessageBox(mainWindow,{
		type: 'none',
		title: 'Update',
		message: "A new version is available, do you want to download and install it now?",
		buttons: ['Yes', 'No'],
		cancelId: 1,
		noLink: true
	},
	function(buttonIndex)  {
		if (buttonIndex === 0) {
			autoUpdater.downloadUpdate()
		}
		else {
			return
		}
	})
})
autoUpdater.on('update-not-available', function() {
	dialog.showMessageBox(mainWindow,{
		title: 'Updated',
		message: 'Your version is up to date.'
	})
})
autoUpdater.on('update-downloaded', function() {
	dialog.showMessageBox(mainWindow,{
		title: 'Updated',
		message: "Download finished, the application will install then restart.."
	}, function() {
		setImmediate(function(){
			autoUpdater.quitAndInstall()
		})
	})
})
module.exports.open_console = open_console
module.exports.refresh = refresh