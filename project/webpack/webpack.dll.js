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

const path = require("path");
const webpack = require("webpack");
const AssetsPlugin = require('assets-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const resolveTheme = require('./theme');

const devMode = process.env.NODE_ENV !== 'production';

/**
 * @param {ReturnType<import('./defaults')>} defaults
 * @returns {import('webpack').Configuration}
 */
module.exports = function(defaults) {
    const {themeDir} = resolveTheme(defaults);
    return {
        entry: {
            'basic_styling': ['basic-styles.scss'],
            vendor: [
                'react', 'react-dom', 'lodash', 'core-js', 'jquery', 'superagent', 'sparqljs', 'n3',
                'react-bootstrap', 'react-select', 'kefir', 'data.maybe', 'immutable', 'handlebars',
                'html-to-react', 'object-assign', 'dom-serializer', 'basil.js', 'moment',
                'griddle-react', 'urijs', 'he', 'history', 'js-cookie', 'react-notification-system',
                'core.lambda', 'data.either', 'uuid', 'es6-promise', 'tslib',
                '@webcomponents/custom-elements',
                '@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js',
            ]
        },
        module: {
            rules: [{
                test: /\.css$/,
                loader: 'style!css?-restructuring!autoprefixer-loader'
            }, {
              test: /\.scss$/,
              use: [{
                    loader: MiniCssExtractPlugin.loader
                  },{
                        loader: 'css-loader'
                    }, {
                        loader: 'sass-loader'
                    }
                   ]
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
            alias: Object.assign(
              defaults.ALIASES,
              {
                'platform-theme': themeDir,
                // the override here is for unknown (?) reasons (`basic-styles.scss` alias already defined
                // differently in `metaphacts-platform/web/platform-web-build.json`)
                'basic-styles.scss': path.join(defaults.METAPHACTORY_DIRS.src, 'styling/bootstrap.scss'),
                _: 'lodash',
                'basil.js': 'basil.js/src/basil.js',
                'handlebars': 'handlebars/dist/handlebars.js'
              }
            )
        },

        output: {
            path: path.join(__dirname, "assets", "no_auth"),
            filename: "dll.[name].js",
            library: "[name]",
            // set diffrent namespace for source maps; otherwise it defaults to `output.library`
            // which includes placeholders like [name] and produces invalid source URLs like this
            //   webpack://[name]C:/.../node_modules/file.js
            // and these invalid URLs causes Firefox to print way too many warnings
            devtoolNamespace: 'metaphacts-dll'
        },
        plugins: [
          new MiniCssExtractPlugin({
            filename: devMode ? 'basic-styles.css' : 'basic-styles.[hash].css',
            chunkFilename: devMode ? '[id].css' : '[id].[hash].css',
          }),
          new webpack.DllPlugin({
            path: path.join(__dirname, "assets/dll-manifest/[name]-manifest.json"),
            name: "[name]",
            context: defaults.METAPHACTORY_DIRS.src
          }),
          /*
           * Generate json files with bundle - hashed bundle file names,
           * so we can properly refer to bundles in main.hbs and login.hbs files
           */
          new AssetsPlugin({
            // TODO: use this generated file even in local dev builds
            filename: "dll-manifest.json",
            path: defaults.DIST,
            fullPath: true
          }),
          // @ts-ignore
          new ProgressBarPlugin()
        ],
        stats: {
            colors: true,
            hash: false,
            version: false,
            timings: false,
            assets: false,
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
