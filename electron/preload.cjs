const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronPlatform', {
  isDesktopApp: true,
  platform: process.platform,
});
