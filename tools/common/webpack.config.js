const webpack = require('webpack');
const path = require('path');

function withPolyfills() {
  return function getWebpackConfig(config, context) {

    if (context.configuration === 'development')
      return config;

    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      crypto: require.resolve('crypto-browserify'),
    }

    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer']
      })
    );

    return config;
  };
}

module.exports = { withPolyfills };
