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
    AssetsPlugin = require('assets-webpack-plugin'),
    ExtractTextPlugin = require("extract-text-webpack-plugin"),
    defaults = require('./defaults'),
    utils = require('./utils');

module.exports = function(env) {
    const buildConfig = utils.parseArgs(env.buildConfig);
    const defaultConfig = defaults(buildConfig);
    const config = require('./webpack.dll.js')(buildConfig, defaults(buildConfig));

    //enable react production mode.
    //add hash to text plugin
    config.plugins.shift();
    config.plugins.push(
        new ExtractTextPlugin("basic-styles-[contenthash].css"),
        new webpack.DefinePlugin({
            BUNDLE_HIGHCHARTS: process.env.BUNDLE_HIGHCHARTS,
            'process.env': {
                NODE_ENV: '"production"'
            }
        }),
        /*
         * Generate json files with bundle - hashed bundle file names,
         * so we can properly refer to bundles in main.hbs and login.hbs files
         */
        new AssetsPlugin({
            filename: "dll-manifest.json",
            path: defaultConfig.DIST,
            fullPath: true
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
