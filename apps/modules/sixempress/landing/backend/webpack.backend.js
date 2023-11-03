const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');
const { withStlseBackendSSR } = require('@stlse/modules-nx/plugins/webpack/backend-ssr');

// Nx plugins for webpack.
module.exports = composePlugins(
  withNx(),
  withReact(),
  withStlseBackendSSR(),
  (config) => {
    // // you must `npm install url-polyfill` to use this.
    // config.plugins.push(
    //   new webpack.ProvidePlugin({
    //     URL: ['URL', 'url-polyfill']
    //   })
    // );

    // Update the webpack config as needed here.
    // e.g. `config.plugins.push(new MyPlugin())`
    return config;
  }
);
