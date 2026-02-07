import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions(),
    alias: {
      ...(Repack.getResolveOptions().alias || {}),
      '@': path.resolve(__dirname, 'src'), // 👈 Add this line
      // Force axios to use React Native/browser version
      'axios': path.resolve(__dirname, 'node_modules/axios/dist/esm/axios.js'),
      // Polyfill Node.js modules
      'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
      'url': path.resolve(__dirname, 'src/polyfills/url.js'),
      'http': false,
      'https': false,
      'stream': false,
      'zlib': false,
      'querystring': false,
      'form-data': false,
    },
    // Prevent Node.js modules from being bundled
    fallback: {
      'url': path.resolve(__dirname, 'src/polyfills/url.js'),
      'http': false,
      'https': false,
      'stream': false,
      'zlib': false,
      'querystring': false,
      'crypto': path.resolve(__dirname, 'src/polyfills/crypto.js'),
      'fs': false,
      'path': false,
      'os': false,
      'form-data': false,
    },
  },
  module: {
    rules: [
      ...Repack.getJsTransformRules(),
      ...Repack.getAssetTransformRules(),
      // Handle Flow type imports in node_modules - strip Flow syntax
      {
        test: /\.js$/,
        include: /node_modules\/@react-native-masked-view/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                  jsx: true,
                  decorators: false,
                  dynamicImport: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
                experimental: {
                  keepImportAttributes: false,
                },
              },
              module: {
                type: 'es6',
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new ReanimatedPlugin(),
  ],
};
