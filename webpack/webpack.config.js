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

const path = require('path');
const webpack = require('webpack');
const AssetsPlugin = require('assets-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const defaults = require('./defaults')();

/**
 * @param {ReturnType<import('./defaults')>} defaults
 * @returns {import('webpack').Configuration}
 */
module.exports = function(isProd) {
    const {
        ROOT_DIR,
        DIST,
        TEST,
        SRC,
        PROJECT,
    } = defaults;

    const publicPath = '/assets/no_auth/';

    const config = {
        stats: 'minimal',

        // we want source maps for prod and dev builds
        // we can't use eval source-maps because they don't work
        // with css/scss files
        devtool: 'source-map',
        resolveLoader: {
            modules: [path.resolve(ROOT_DIR, 'node_modules'), __dirname]
        },
        cache: true,
        entry: {
            'app': path.join(SRC, 'app/app.ts'),
            'page-renderer': path.join(SRC, 'app/external/PageRenderer.ts')
        },
        output: {
            path: path.join(DIST, 'no_auth'),
            filename: '[name].js',
            chunkFilename: '[name].js',
            publicPath
        },
        optimization: {
            runtimeChunk: 'single',
            providedExports: false,
            usedExports: false,
            concatenateModules: false,
            splitChunks: {
                chunks: 'all',
                maxInitialRequests: Infinity,
                maxAsyncRequests: Infinity,
                minSize: 0,
                minChunks: 1,
                cacheGroups: {
                    api: {
                      test: /src[\\/]main[\\/]web[\\/]api[\\/]/,
                      name: 'api',
                      enforce: true
                    },
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        enforce: true,
                        name(module) {
                            // get the name. E.g. node_modules/packageName/not/this/part.js
                            // or node_modules/packageName
                            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
                            // npm package names are URL-safe, but some servers don't like @ symbols
                            return `npm.${packageName.replace('@', '')}`;
                        },
                    },
                    styles: {
                        name: 'styles',
                        test: /(\.css$)|(\.scss$)/,
                        chunks: 'all',
                        enforce: true,
                    },
                    default: {
                        minChunks: 1,
                        priority: -20,
                        reuseExistingChunk: true
                    }
                },
            },
        },
        module: {
            /** @type {any[]} */
            rules: [
                // order of ts and scss loader matters, we detect it by id in webpack.dev file
                {
                    test: /(\.ts$)|(\.tsx$)/,
                    use: [
                        'cache-loader',
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: true,
                                experimentalWatchApi: true,
                            }
                        }
                    ],
                    include: [SRC, TEST],
                },
                {
                    test: /\.scss$/,
                    include: PROJECT.cssModulesBasedComponents,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        'cache-loader',
                        {
                            loader: '@teamsupercell/typings-for-css-modules-loader',
                            options: {
                                disableLocalsExport: true
                            }
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: true,
                                modules: {
                                    localIdentName: '[name]--[local]',
                                },
                                importLoaders: 2,
                                localsConvention: 'camelCase',
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true,
                                sassOptions: {
                                    outputStyle: 'expanded',
                                }
                            }
                        }
                    ],
                },
                {
                    test: /\.scss$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        'cache-loader',
                        {
                            loader: 'css-loader',
                            options : {
                                importLoaders: 2,
                                sourceMap: true,
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true,
                                sassOptions: {
                                    // we need to use expanded to not lose selectors with no styles for which we also need to generate typescript typings
                                    outputStyle: 'expanded'
                                }
                            }
                        }
                    ],
                    exclude: PROJECT.cssModulesBasedComponents
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        'cache-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                // plain css-loader is mainly used for mirador, where we need to enable url resolution to properly embed images form jquery-ui that is in node_modules
                                url: true,
                            },
                        }
                    ],
                },
                {
                    // we need to make sure that webpack doesn't apply JSON loader
                    // to components.json. We parse it on our own in the components-loader
                    // see https://github.com/webpack/webpack/issues/6586#issuecomment-398737313
                    type: 'javascript/auto',
                    test: /components\.json$/,
                    use: [{
                        loader: 'loaders/components-loader'
                    }],
                    exclude: [/node_modules/]
                },
                {
                    test: /\.png$/,
                    use: [{
                        loader: 'url-loader',
                        options: {
                            limit: 100000,
                            mimetype: 'image/png'
                        }
                    }],
                },
                {
                    test: /\.gif$/,
                    loader: "file-loader",
                },
                {
                    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    use: [{
                        loader: 'url-loader',
                        options: {
                            limit: 10000,
                            mimetype: 'application/font-woff'
                        }
                    }],
                },
                {
                    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader: "file-loader",
                },
                {
                    test: path.join(ROOT_DIR, 'node_modules/codemirror/lib/codemirror.js'),
                    loader: "expose-loader?CodeMirror",
                },

                // needed for ontodia
                {test: /\.ttl$/, use: ['raw-loader']},
            ],
            noParse: [/.+zone\.js\/dist\/.+/]
        },
        resolve: {
            modules: ['node_modules'],
            unsafeCache: true,
            alias: Object.assign(
                PROJECT.aliases, {
                    'platform-components': path.join(ROOT_DIR, 'components.json'),
                    'basic-styles.scss': path.join(SRC, 'styling/basic.scss'),
                    _: 'lodash',
                    'basil.js': 'basil.js/src/basil.js',
                    'handlebars': 'handlebars/dist/handlebars.js',
                    'jsonld': path.join(ROOT_DIR, 'node_modules/jsonld/dist/jsonld.js'),
                },
            ),
            extensions: ['.ts', '.tsx', '.js']
        },
        externals: {
            'google': 'false',
            // required by enzyme https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md
            'cheerio': 'window',
            'react/addons': true,
            'react/lib/ExecutionEnvironment': true,
            'react/lib/ReactContext': true
        },
        plugins: [
            new CircularDependencyPlugin({
                // exclude detection of files based on a RegExp
                exclude: /src\/main\/web\/ontodia|node_modules/,
                // add errors to webpack instead of warnings
                failOnError: true,
                // allow import cycles that include an asyncronous import,
                // e.g. via import(/* webpackMode: "weak" */ './file.js')
                allowAsyncCycles: false,
                // set the current working directory for displaying module paths
                cwd: process.cwd(),
            }),

            //cytoscape.js expects jquery in scope
            new webpack.ProvidePlugin({
                'cytoscape': 'cytoscape',
                '$': 'jquery',
                'jQuery': "jquery"
            }),

            //do not bundle mirador images
            new webpack.NormalModuleReplacementPlugin(/\.\/images\/ui-.*/, 'node-noop'),

            new webpack.WatchIgnorePlugin([
                /scss\.d\.ts$/
            ]),

            new AssetsPlugin({
                entrypoints: true,
                manifestFirst: true,
                prettyPrint: true,
                filename: 'bundles-manifest.json',
                path: defaults.DIST
            }),
            new MiniCssExtractPlugin({
                ignoreOrder: true,
                filename: isProd ? '[name]-[contenthash].css' : '[name].css',
                chunkFilename: isProd ? '[name]-[contenthash].css' : '[name].css',
            })
        ]
    };

    return config;
};
