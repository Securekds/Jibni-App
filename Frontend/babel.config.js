module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    ['module-resolver', { alias: { '@': './src' } }],
    'react-native-reanimated/plugin',
  ],
};
