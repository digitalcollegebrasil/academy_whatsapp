const { app, BrowserWindow } = require('electron');
const path = require('path');
const startWhatsApp = require('./whatsapp.js');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800
  });

  win.loadFile('renderer.html');
}

app.whenReady().then(() => {
  createWindow();
  startWhatsApp();
});
