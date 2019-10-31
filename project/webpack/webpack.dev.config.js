/*
 * Copyright (C) 2015-2018, metaphacts GmbH
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

const webpack = require('webpack');
const WebpackNotifierPlugin = require('webpack-notifier');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');

/**
 * @param {ReturnType<import('./defaults')>} defaults
 */
module.exports = function(defaults) {
  const config = require('./webpack.config.js')(defaults);
  // enable sourceMaps for ts loader

  let tsLoader = config.module.rules[0].use[0];
  const tsOptions = tsLoader.options;
  tsOptions.compilerOptions = {
    sourceMap: true
  };

  if (!defaults.ROOT_BUILD_CONFIG.noTsCheck) {
    config.plugins.push(defaults.tsTypeCheck(false));
  }

  config.mode = 'development';

  config.plugins.push(
    defaults.tsHappyPack(tsLoader),
    new webpack.DefinePlugin({
      BUNDLE_HIGHCHARTS: process.env.BUNDLE_HIGHCHARTS
    }),
    new webpack.SourceMapDevToolPlugin({
      columns: false
    }),
    // @ts-ignore
    new ProgressBarPlugin(),
    new WebpackNotifierPlugin({title: 'Platform', excludeWarnings: true})
  );

  config.output.publicPath = 'http://localhost:3000/assets/';
  return config;
};
