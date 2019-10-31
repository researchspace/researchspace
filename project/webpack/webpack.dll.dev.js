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

const path = require('path');
const defaults = require('./defaults');

/**
 * @param {{ [key: string]: string }} env
 */
module.exports = function (env) {
  var config = require('./webpack.dll.js')(defaults());
  config.mode = 'development';

  config.output.publicPath = 'http://localhost:3000/assets/no_auth/';
  config.resolve.modules.push(path.resolve(__dirname, 'node_modules'));

  config.devtool = 'cheap-module-eval-source-map';

  return config;
};
