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
    ParallelUglifyPlugin = require('webpack-parallel-uglify-plugin'),
    AssetsPlugin = require('assets-webpack-plugin'),
    defaultsFn = require('./defaults'),
    utils = require('./utils');

module.exports = function(env) {
    const buildConfig = utils.parseArgs(env.buildConfig);
    const defaults = defaultsFn(buildConfig);
    var config = require('./webpack.config.js')(buildConfig, defaults);

    //reset source-maps
    delete config.devtool;

    /*
     * Add chunkhash to filename to make sure that we bust
     * browser cache on redeployment.
     */
    config.output.filename = "[name]-[chunkhash]-bundle.js";
    config.output.chunkFilename = "[name]-[chunkhash]-bundle.js";

    let tsLoader = config.module.rules[0].use[0];

    //enable assets optimizations
    config.plugins.push(
        defaults.tsHappyPack(tsLoader),
        defaults.tsTypeCheck(true),
        new ParallelUglifyPlugin({
            uglifyJs: {
                output: {
                    comments: false
                },
                sourceMap: false,
                comments: false,
                'screw-ie8': true,
                compress: {
                    keep_fnames: true
                }
            }
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: true
        }),

        /*
         * Generate json files with bundle - hashed bundle file names,
         * so we can properly refer to bundles in main.hbs and login.hbs files
         */
        new AssetsPlugin({
            filename: "bundles-manifest.json",
            path: defaults.DIST
        })
    );

    //enable react production mode.
    config.plugins.push(
        new webpack.DefinePlugin({
            BUNDLE_HIGHCHARTS: process.env.BUNDLE_HIGHCHARTS,
            'process.env': {
                NODE_ENV: '"production"'
            }
        })
    );
    return config;
};
