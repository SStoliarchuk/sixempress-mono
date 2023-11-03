const path = require('path');

function withDevFix() {
  return function getWebpackConfig(config, context) {

    // fixes debugger that is not mapped to the right
    config.output.devtoolModuleFilenameTemplate = function (info) {
      const rel = path.relative(process.cwd(), info.absoluteResourcePath)
      return `webpack:///./${rel}`
    }

    return config;
  };
}

module.exports = { withDevFix };
