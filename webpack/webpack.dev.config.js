/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2018, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const defaults = require('./defaults')();

module.exports = function() {
    const config = require('./webpack.config.js')(false);
    config.mode = 'development';
    //config.plugins.push(new BundleAnalyzerPlugin());

    // the default hotUpdateChunkFilename is [id].[fullhash].hot-update.js
    // we don't want to use the fullhash in the filename, because it changes on every build
    // and cause jetty reload on every js change.
    // We don't have any browser caching in dev environment so hash is not needed anyway.
    config.output.hotUpdateChunkFilename = '[id].hot-update.js';

    config.optimization.minimize = true;
    config.optimization.minimizer = [
        new CssMinimizerPlugin(
            {
                minimizerOptions: {
                preset: [
                    "default",
                    {
                    discardComments: { removeAll: true },
                    },
                ],
                },
            }
        )
    ];

    config.output.pathinfo = false;

    config.output.publicPath = 'http://localhost:3000/assets/no_auth/';
    config.devServer = {
        port: 3000,
        static: {
            directory: './src/main/webapp',
        },
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        },
        client: {
            overlay: {
              errors: true,
              warnings: false,
              runtimeErrors: false,
            },
        },
    };
    return config;
};