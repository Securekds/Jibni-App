/**
 * URL polyfill for React Native
 * Minimal implementation for libraries that require url module
 */

const URLPolyfill = {
  parse: (urlString) => {
    try {
      // Use native URL if available
      if (typeof URL !== 'undefined') {
        const url = new URL(urlString);
        return {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port,
          pathname: url.pathname,
          search: url.search,
          hash: url.hash,
          href: url.href,
        };
      }
      // Fallback parsing
      const match = urlString.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);
      return {
        protocol: match[2] || '',
        hostname: match[4] ? match[4].split(':')[0] : '',
        port: match[4] ? match[4].split(':')[1] : '',
        pathname: match[5] || '',
        search: match[6] || '',
        hash: match[8] || '',
        href: urlString,
      };
    } catch (e) {
      return { href: urlString };
    }
  },
  format: (urlObject) => {
    let url = '';
    if (urlObject.protocol) url += urlObject.protocol + '//';
    if (urlObject.hostname) url += urlObject.hostname;
    if (urlObject.port) url += ':' + urlObject.port;
    if (urlObject.pathname) url += urlObject.pathname;
    if (urlObject.search) url += urlObject.search;
    if (urlObject.hash) url += urlObject.hash;
    return url;
  },
  resolve: (from, to) => {
    // Simple resolve implementation
    if (to.startsWith('http://') || to.startsWith('https://')) {
      return to;
    }
    const fromUrl = URLPolyfill.parse(from);
    if (to.startsWith('/')) {
      return fromUrl.protocol + '//' + fromUrl.hostname + (fromUrl.port ? ':' + fromUrl.port : '') + to;
    }
    const fromPath = fromUrl.pathname || '/';
    const basePath = fromPath.substring(0, fromPath.lastIndexOf('/') + 1);
    return fromUrl.protocol + '//' + fromUrl.hostname + (fromUrl.port ? ':' + fromUrl.port : '') + basePath + to;
  },
};

// Support both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLPolyfill;
}
// Support both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLPolyfill;
}
export default URLPolyfill;
