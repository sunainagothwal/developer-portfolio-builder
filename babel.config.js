module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@features': './src/features',
            '@lib': './src/lib',
            '@store': './src/store',
            '@theme': './src/theme',
            '@models': './src/types',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@constants': './src/constants',
            '@navigation': './src/navigation',
          },
        },
      ],
      // Reanimated plugin MUST be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
