const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { withStlseFrontendSSR } = require('@stlse/modules-nx/plugins/webpack/frontend-ssr');

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx(),
  withReact(),
  withStlseFrontendSSR(),
  (config) => {
    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`
    return config;
  }
);
