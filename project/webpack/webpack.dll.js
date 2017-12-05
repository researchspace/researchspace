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

var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var ProgressBarPlugin = require('progress-bar-webpack-plugin');
const ThemePlugin = require('./ThemePlugin');

module.exports = function(buildConfig, defaults) {
    return {
        entry: {
            'basic_styling': ['basic-styles.scss'],
            vendor: [
                'react', 'react-dom', 'lodash', 'core-js', 'jquery', 'superagent', 'sparqljs', 'n3',
                'react-bootstrap', 'react-select', 'kefir', 'data.maybe', 'immutable', 'handlebars',
                'html-to-react', 'object-assign', 'dom-serializer', 'basil.js', 'moment',
                'griddle-react', 'urijs', 'he', 'history', 'js-cookie', 'react-notification-system',
                'core.lambda', 'data.either', 'document-register-element', 'uuid', 'es6-promise',
                'tslib', 'js-beautify'
            ]
        },
        module: {
            rules: [{
                test: /\.css$/,
                loader: 'style!css?-restructuring!autoprefixer-loader'
            }, {
                test: /\.scss$/,
                loader: ExtractTextPlugin.extract({
                    fallback: "style-loader",
                    use: [{
                        loader: 'css-loader'
                    }, {
                        loader: 'sass-loader'
                    }]
                })
            }, {
                test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "url-loader?limit=10000&mimetype=application/font-woff&name=fonts/[name]-[hash].[ext]"
            }, {
                test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: "file-loader?name=fonts/[name].[ext]?[hash]"
            }, {
                test: path.resolve(defaults.METAPHACTORY_ROOT_DIR, 'node_modules/react/react.js'),
                loader: "expose-loader?React"
            }]
        },
        resolveLoader: {
            modules: [path.resolve(__dirname, 'node_modules')]
        },
        resolve: {
            modules: [path.resolve(defaults.METAPHACTORY_ROOT_DIR, 'node_modules')],
            alias: Object.assign({
                _: 'lodash',
                'basic-styles.scss': path.join(defaults.METAPHACTORY_DIRS.src, 'styling/bootstrap.scss'),
                'basil.js': 'basil.js/src/basil.js',
                'handlebars': 'handlebars/dist/handlebars.js'
            }, defaults.EXTENSION_ALIASES)
        },

        output: {
            path: path.join(__dirname, "assets", "no_auth"),
            filename: "dll.[name].js",
            library: "[name]"
        },
        plugins: [
            new ThemePlugin(buildConfig, defaults),
            new ExtractTextPlugin("basic-styles.css"),
            new webpack.DllPlugin({
                path: path.join(__dirname, "assets/dll-manifest/[name]-manifest.json"),
                name: "[name]",
                context: defaults.METAPHACTORY_DIRS.src
            }),
            new webpack.optimize.UglifyJsPlugin({
                comments: false
            }),
            new ProgressBarPlugin()
        ],
        stats: {
            colors: true,
            hash: false,
            version: false,
            timings: false,
            assets: false,
            chunks: false,
            modules: false,
            reasons: false,
            children: false,
            source: false,
            errors: true,
            errorDetails: true,
            warnings: false,
            publicPath: false,
            chunks: false,
            chunkModules: false
        }
    };
};
