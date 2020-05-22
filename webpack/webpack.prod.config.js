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
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const defaultsFn = require('./defaults');

module.exports = function () {
    const defaults = defaultsFn();
    var config = require('./webpack.config.js')(true);
    config.mode = 'production';

    config.optimization.minimize = true;
    config.optimization.minimizer = [
        new TerserPlugin({
            terserOptions: {
                keep_fnames: true,
                ecma: '2016',
                output: {
                    comments: false,
                },
            },
            extractComments: false,
        }),
        new OptimizeCSSAssetsPlugin({
            cssProcessorPluginOptions: {
                preset: ['default', { discardComments: { removeAll: true } }],
            },
        })
    ];

    /*
     * Add chunkhash to filename to make sure that we bust
     * browser cache on redeployment.
     */
    config.output.filename = function(chunkData) {
        return chunkData.chunk.name === 'page-renderer' ? '[name].js': "[name]-[contenthash].js";
    };
    config.output.chunkFilename = "[name]-[contenthash].js";

    //enable assets optimizations
    config.plugins.push(
        defaults.tsTypeCheck(true),
    );
    return config;
};
