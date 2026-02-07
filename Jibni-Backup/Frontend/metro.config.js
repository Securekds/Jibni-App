// Use Expo's Metro config when Expo is installed, otherwise use React Native's
let config;

try {
  // Try to use Expo's Metro config
  const { getDefaultConfig } = require('expo/metro-config');
  const path = require('path');
  
  const expoConfig = getDefaultConfig(__dirname);
  
  // Merge our custom config
  config = {
    ...expoConfig,
    resolver: {
      ...expoConfig.resolver,
      alias: {
        ...(expoConfig.resolver?.alias || {}),
        '@': path.resolve(__dirname, 'src'),
        'axios': path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
        'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
        'url': path.resolve(__dirname, 'src/polyfills/url.js'),
      },
      extraNodeModules: {
        ...(expoConfig.resolver?.extraNodeModules || {}),
        'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
        'url': path.resolve(__dirname, 'src/polyfills/url.js'),
        'http': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'https': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'stream': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'zlib': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'querystring': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'form-data': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'fs': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'os': path.resolve(__dirname, 'src/polyfills/empty.js'),
      },
    },
  };
} catch (e) {
  // Fallback to React Native Metro config if Expo is not installed
  const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
  const path = require('path');
  
  const defaultConfig = getDefaultConfig(__dirname);
  const customConfig = {
    resolver: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'axios': path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
        'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
        'url': path.resolve(__dirname, 'src/polyfills/url.js'),
      },
      extraNodeModules: {
        'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
        'url': path.resolve(__dirname, 'src/polyfills/url.js'),
        'http': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'https': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'stream': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'zlib': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'querystring': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'form-data': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'fs': path.resolve(__dirname, 'src/polyfills/empty.js'),
        'os': path.resolve(__dirname, 'src/polyfills/empty.js'),
      },
    },
  };
  
  config = mergeConfig(defaultConfig, customConfig);
}

module.exports = config;
