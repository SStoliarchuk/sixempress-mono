const path = require('path');
const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // https://github.com/nrwl/nx/issues/14708#issuecomment-1457996600
  config.output.devtoolModuleFilenameTemplate = function (info) {
    const rel = path.relative(process.cwd(), info.absoluteResourcePath)
    return `webpack:///./${rel}`
  }

  return config;
});
