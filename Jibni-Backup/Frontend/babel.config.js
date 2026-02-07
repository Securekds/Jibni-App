const presets = ['module:@react-native/babel-preset']
const plugins = []

plugins.push(
  [
    'module-resolver',
    {
      root: ['./src'],
      extensions: ['.js', '.json', '.ts', '.tsx'],
      alias: {
        '@': './src',
      },
    },
  ],
  'react-native-reanimated/plugin',
)

module.exports = {
  presets,
  plugins,
  // Strip Flow types from node_modules (especially masked-view)
  overrides: [
    {
      include: /node_modules\/@react-native-masked-view/,
      plugins: [
        ['transform-flow-strip-types', { allowDeclareFields: true }],
      ],
    },
  ],
}