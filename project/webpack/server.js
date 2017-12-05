/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

process.env.BUNDLE_HIGHCHARTS = false;

var path = require("path");
var webpack = require('webpack');
var _ = require('lodash');
var WebpackDevServer = require('webpack-dev-server');
var devConfig = require('./webpack.dev.config');
const defaults = require('./defaults.js');
const utils = require('./utils');

const buildConfig = utils.parseArgs(process.argv[2]);
const config = devConfig(buildConfig, defaults(buildConfig));

const devServer = new WebpackDevServer(webpack(config), {
  publicPath: 'http://localhost:3000/assets/',
  historyApiFallback: true,
  hot: true,
  filename: config.output.filename,
  contentBase: [__dirname, path.join(__dirname, "assets", "no_auth")],

  compress: true,
  // It suppress error shown in console, so it has to be set to false.
  quiet: false,
  // It suppress everything except error, so it has to be set to false as well
  // to see success build.
  noInfo: false,
  //lazy: true,
  stats: {
    // Config for minimal console.log mess.
    assets: false,
    colors: true,
    version: false,
    hash: false,
    timings: false,
    chunks: false,
    chunkModules: false,
    // Displays log on module resolution errors
    errorDetails: true,
  },
  proxy: {
    '/images': {
      target: 'http://localhost:10214',
      secure: false
    }
  },
  headers: { "Access-Control-Allow-Origin": "*" }
});

devServer.listen(3000, function (err, result) {
  if (err) {
    console.log(err);
  }

  console.log('Listening at localhost:3000');
});

process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk) {
  if(chunk === 'stop') {
    devServer.close();
    process.exit(0);
  }
});
