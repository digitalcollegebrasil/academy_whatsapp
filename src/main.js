const { app, BrowserWindow } = require('electron');
const path = require('path');
const startWhatsApp = require('./whatsapp.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      worldSafeExecuteJavascript: true
    }
  });

  win.loadFile(path.join(__dirname, 'renderer.html'));
}

app.whenReady().then(async () => {
  await startWhatsApp();
  createWindow();
});