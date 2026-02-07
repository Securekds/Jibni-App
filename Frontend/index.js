/**
 * @format
 */

console.log('[INDEX] Starting app initialization...');

// Enable react-native-screens for React Navigation
try {
  console.log('[INDEX] Enabling react-native-screens...');
  const screens = require('react-native-screens');
  if (screens && screens.enableScreens) {
    screens.enableScreens(true);
    console.log('[INDEX] ✓ react-native-screens enabled');
  } else {
    console.warn('[INDEX] react-native-screens.enableScreens not available');
  }
} catch (e) {
  console.warn('[INDEX] Could not enable react-native-screens:', e.message);
  console.warn('[INDEX] This might cause NavigationContainer issues');
}

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

import { AppRegistry } from 'react-native';
console.log('[INDEX] AppRegistry imported');

try {
  console.log('[INDEX] Loading App component...');
  // TEMPORARY: Use simple App to test if the issue is with providers
  const App = require('./App-simple').default;
  // const App = require('./App').default;
  console.log('[INDEX] ✓ App component loaded (using simple version)');
  
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
