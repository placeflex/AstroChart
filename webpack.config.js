const path = require('path');

module.exports = {
  entry: './project/src/index.js',
  mode: 'development',
  output: {
    clean: true,
    path: path.resolve(__dirname, 'project/build'),
    filename: 'astrochart.js',
    library: {
      name: 'astrochart',
      type: 'umd'
    }
  },
};