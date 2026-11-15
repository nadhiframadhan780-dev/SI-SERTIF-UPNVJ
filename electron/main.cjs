// Konfigurasi proses utama Electron untuk aplikasi desktop Windows (EXE/MSI)
// Jalankan setelah `npm run build` dengan: `npx electron electron/main.cjs`
// Atau kemas menjadi installer EXE/MSI dengan `electron-builder`.

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'SI-SERTIF UPNVJ',
    icon: path.join(__dirname, '../public/favicon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#FAFBF9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Buka tautan eksternal di browser default sistem
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const distIndex = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(distIndex);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
