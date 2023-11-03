const { composePlugins, withNx } = require('@nx/webpack');
const { withStlseBackend } = require('@stlse/modules-nx/plugins/webpack/backend');
const { withPolyfills } = require('../../../../../tools/common/webpack.config');
const { withDevFix } = require('../../../../../tools/common/with-fix');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), withStlseBackend(), withPolyfills(), withDevFix(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`
  return config;
});
