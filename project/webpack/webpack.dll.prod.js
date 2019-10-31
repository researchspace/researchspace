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
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const makeDefaults = require('./defaults');

/**
 * @param {{ [key: string]: string }} env
 */
module.exports = function (env) {
    const defaults = makeDefaults();
    const config = require('./webpack.dll.js')(defaults);
    config.mode = 'production';

    config.optimization = {
      minimizer: [
        new UglifyJsPlugin({
          parallel: true,
          sourceMap: false,
          uglifyOptions: {
            output: {
              comments: false
            }
          }
        }),
      ]
    };

    config.plugins.push(
        /**
         * Enable react production mode
         */
        new webpack.DefinePlugin({
            BUNDLE_HIGHCHARTS: process.env.BUNDLE_HIGHCHARTS,
            'process.env': {
                NODE_ENV: '"production"'
            }
        })
    );

    /*
     * Add chunkhash to filename to make sure that we bust
     * browser cache on redeployment.
     */
    config.output.filename = "dll.[name]-[chunkhash].js";
    config.output.publicPath = '/assets/no_auth/';
    return config;
};
