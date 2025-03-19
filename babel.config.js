module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      'babel-plugin-transform-import-meta',
      '@babel/plugin-proposal-export-namespace-from',
      ['module-resolver', {
        alias: {
          'buffer': '@craftzdog/react-native-buffer',
          'av': require.resolve('./aurora.js'),
          '@/': './',
          'text-encoding': 'text-encoding-polyfill',
          'encoding': 'text-encoding-polyfill'
        },
      }],
    ],
  };
};
