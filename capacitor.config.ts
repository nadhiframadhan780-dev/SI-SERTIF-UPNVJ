// Konfigurasi dasar Capacitor untuk konversi ke Android APK / iOS
// Langkah penggunaan:
// 1. npm install @capacitor/core @capacitor/cli @capacitor/android
// 2. npm run build
// 3. npx cap add android && npx cap sync android && npx cap open android

const config = {
  appId: 'ac.id.upnvj.sisertif',
  appName: 'SI-SERTIF UPNVJ',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
