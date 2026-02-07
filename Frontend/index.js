/**
 * @format
 */

console.log('[INDEX] Starting app initialization...');

// Polyfill for crypto and other Node.js modules - MUST be first
try {
  console.log('[INDEX] Loading polyfills...');
  require('react-native-get-random-values');
  console.log('[INDEX] ✓ react-native-get-random-values loaded');
  require('./src/polyfills/crypto');
  console.log('[INDEX] ✓ crypto polyfill loaded');
  require('./src/polyfills/url');
  console.log('[INDEX] ✓ url polyfill loaded');
} catch (e) {
  console.error('[INDEX] Error loading polyfills:', e);
  console.error('[INDEX] Polyfill error stack:', e.stack);
}

// ADD FCM BACKGROUND HANDLER
try {
  console.log('[INDEX] Setting up FCM background handler...');
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM] 🔔 Background message received!', remoteMessage);
  });
  console.log('[INDEX] ✓ FCM background handler registered');
} catch (e) {
  console.error('[INDEX] Error setting up FCM:', e);
}

import { AppRegistry } from 'react-native';
console.log('[INDEX] AppRegistry imported');

try {
  console.log('[INDEX] Loading App component...');
  // USE TEST APP - NO react-native-screens dependency
  const App = require('./AppTest').default;
  console.log('[INDEX] ✓ Test App component loaded');
  
  const appConfig = require('./app.json');
  const appName = appConfig.name || 'Jibni';
  console.log('[INDEX] App name:', appName);
  
  console.log('[INDEX] Registering app component...');
  AppRegistry.registerComponent(appName, () => {
    console.log('[INDEX] App component factory called');
    return App;
  });
  console.log('[INDEX] ✓ App registered successfully');
} catch (e) {
  console.error('[INDEX] FATAL ERROR during app registration:', e);
  console.error('[INDEX] Error stack:', e.stack);
  throw e;
}