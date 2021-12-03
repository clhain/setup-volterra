const path = require('path');

module.exports = (() => {
  return [process.env.VOLTERRA_CLI_PATH, 'vesctl-bin'].join(path.sep);
})();
