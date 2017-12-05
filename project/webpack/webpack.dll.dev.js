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
    webpack = require('webpack'),
    defaults = require('./defaults'),
    utils = require('./utils');

module.exports = function(env) {
  const buildConfig = utils.parseArgs(env.buildConfig);
  var config = require('./webpack.dll.js')(buildConfig, defaults(buildConfig));

  config.entry['hot'] = ['webpack/hot/dev-server', 'webpack-dev-server/client?http://localhost:3000'];
  config.output.publicPath = 'http://localhost:3000/assets/no_auth/';
  config.plugins.push(
    new webpack.HotModuleReplacementPlugin()
  );
  config.resolve.modules.push(path.resolve(__dirname, 'node_modules'));


  config.devtool = 'cheap-module-eval-source-map';

  return config;
};
