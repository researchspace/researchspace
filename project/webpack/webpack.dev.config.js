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

var path = require('path'),
    glob = require('glob'),
    _ = require('lodash'),
    webpack = require('webpack'),
    WebpackNotifierPlugin = require('webpack-notifier');

var ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = function(buildConfig, defaults) {
  const config = require('./webpack.config.js')(buildConfig, defaults);
  // enable sourceMaps for ts loader
  let tsLoader = config.module.rules[0].use[0];
  const tsOptions = tsLoader.options;
  tsOptions.compilerOptions = {
    sourceMap: true
  };

  if (!buildConfig.noTsCheck) {
    config.plugins.push(defaults.tsTypeCheck(false));
  }
  config.plugins.push(
    defaults.tsHappyPack(tsLoader),
    new webpack.DllReferencePlugin({
      manifest: require("./assets/dll-manifest/hot-manifest.json"),
      context: path.resolve(__dirname, defaults.METAPHACTORY_DIRS.src)
    }),
    new webpack.HotModuleReplacementPlugin(),
    //  new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      BUNDLE_HIGHCHARTS: process.env.BUNDLE_HIGHCHARTS
    }),
    new webpack.SourceMapDevToolPlugin({
      columns: false
    }),
    new ProgressBarPlugin(),
    new WebpackNotifierPlugin({title: 'Platform'})
  );

  config.output.publicPath = 'http://localhost:3000/assets/';
  return config;
};
