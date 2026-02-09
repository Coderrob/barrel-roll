//@ts-check

'use strict';

const path = require('node:path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: './src/extension.ts',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: [
    function ({ request }, callback) {
      // Treat any import from 'ts-morph' or its subpaths as external to avoid
      // bundling the large ts-morph dist file (some imports reference
      // 'ts-morph/dist/ts-morph.js').
      if (/^ts-morph(?:\/|$)/.test(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
    {
      vscode: 'commonjs vscode',
      typescript: 'commonjs typescript', // Required for ts-morph to work properly
      '@ts-morph/common': 'commonjs @ts-morph/common',
      'ts-morph': 'commonjs ts-morph',
    },
  ],
  ignoreWarnings: [
    {
      module: /@ts-morph\/common\/dist\/typescript\.js/,
      message: /Critical dependency: the request of a dependency is an expression/,
    },
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
};
module.exports = config;
