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

const webpackDevConfig = require('./webpack.dev.config');
const makeDdefaults = require('./defaults');

/**
 * Returns webpack config for chunk content testing.
 * Usage:
 *   yarn run inspect-chunks > ../../chunks.log
 *
 * @param {{ [key: string]: string }} env
 */
module.exports = function (env) {
  const config = webpackDevConfig(makeDdefaults());

  config.output.filename = "[name]-[chunkhash]-bundle.js";
  config.output.chunkFilename = "[name]-[chunkhash]-bundle.js";

  config.stats = {
    all: false,
    chunks: true,
    chunkModules: true,
    chunkOrigins: false,
    modules: false,
    timings: false,
    reasons: false,
    errorDetails: true,
    performance: false,
  };

  return config;
};
