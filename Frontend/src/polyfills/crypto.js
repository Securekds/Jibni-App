/**
 * Crypto polyfill for React Native
 * Provides a minimal crypto implementation for libraries that require it
 */

// Import getRandomValues - this is already imported in index.js but ensure it's available
let getRandomValuesFn;

try {
  // Try to use react-native-get-random-values
  const { getRandomValues } = require('react-native-get-random-values');
  getRandomValuesFn = getRandomValues;
} catch (e) {
  // Fallback to Math.random if not available
  getRandomValuesFn = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
}

// Minimal crypto polyfill
const cryptoPolyfill = {
  getRandomValues: getRandomValuesFn,
  randomUUID: () => {
    // Simple UUID v4 implementation using getRandomValues
    const bytes = new Uint8Array(16);
    getRandomValuesFn(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  },
};

// Make crypto available globally
if (typeof global !== 'undefined') {
  if (!global.crypto) {
    global.crypto = cryptoPolyfill;
  }
  // Also set on window if it exists
  if (typeof window !== 'undefined' && !window.crypto) {
    window.crypto = cryptoPolyfill;
  }
}

export default cryptoPolyfill;
