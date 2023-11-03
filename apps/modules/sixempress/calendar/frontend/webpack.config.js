const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const {
  withStlseFrontend,
} = require('@stlse/modules-nx/plugins/webpack/frontend');

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx(),
  withReact(),
  withStlseFrontend(),
  (config) => {
    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`
    return config;
  }
);
