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
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { ModuleFederationPlugin } = require('@module-federation/enhanced');

const defaults = require('./defaults')();

const { sharedDependencies } = require('./sharedDependencies');

const platformApiPackages = [
    'api/rdf',
    'api/sparql',
    'api/events',
    'api/components',
    'api/async',

    'components/forms',
    'components/forms/inputs',

    'components/semantic/query',
    
    'components/ui/spinner'
];

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


    const platformExposes =
          platformApiPackages.reduce((acc, package) => {
              let relativePackage = './' + package;
              acc[relativePackage] = path.join(SRC, package);
              return acc;
          }, {});

    const federationConfig =  {
        name: 'platform',
        filename: 'remoteEntry.js',
        remotes: {},
        exposes: platformExposes,
        shared: sharedDependencies,

        // because we always have an access to platform source code when building plugins,
        // we don't want to do type check as part of MF plugin.
        // We simply generate d.ts files as part of normal build using ForkTsCheckerWebpackPlugin
        dts: false,

        tsConfigPath: path.resolve(__dirname, '../tsconfig.json'),
    };

    const config = {
        // we want source maps for prod and dev builds
        // we can't use eval source-maps because they don't work
        // with css/scss files
        devtool: 'source-map',
        resolveLoader: {
            modules: [path.resolve(ROOT_DIR, 'node_modules'), __dirname]
        },
        cache: {
            type: 'filesystem',
            cacheDirectory: path.resolve(ROOT_DIR, 'build/webpack_temp_cache'),
        },
        entry: {
            'app': path.join(SRC, 'app/app.ts'),
            'page-renderer': path.join(SRC, 'app/external/PageRenderer.ts')
        },
        output: {
            path: path.join(DIST, 'no_auth'),
            filename: '[name].js',
            chunkFilename: '[name].js',
            // use faster hashing algorithm, see https://webpack.js.org/configuration/output/#outputhashfunction
            hashFunction: 'xxhash64',
            publicPath
        },
        optimization: {
            moduleIds: 'named',
            chunkIds: 'named',
            emitOnErrors: true,
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
                    defaultVendors: {
                        test: /[\\/]node_modules[\\/]/,
                        enforce: true,
                        name(module) {
                            // get the name. E.g. node_modules/packageName/not/this/part.js
                            // or node_modules/packageName
                            const match = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
                            if (match) {
                                const packageName = match[1];
                                // npm package names are URL-safe, but some servers don't like @ symbols
                                return `npm.${packageName.replace('@', '')}`;
                            } else {
                                return 'vendor';
                            }
                        },
                    },
                    styles: {
                        name: 'styles',
                        type: "css/mini-extract",
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
            parser: {
                javascript: {
                    // to suppress webpack warning related to re-export of compile only types
                    // in typescript.
                    // for more background see https://github.com/webpack/webpack/issues/7378
                    reexportExportsPresence: false,
                },
            },

            /** @type {any[]} */
            rules: [
                // order of ts and scss loader matters, we detect it by id in webpack.dev file
                {
                    test: /(\.ts$)|(\.tsx$)/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: true,
                            }
                        }
                    ],
                    include: [SRC, TEST],
                },
                {
                    test: /\.scss$/,
                    include: PROJECT.cssModulesBasedComponents,
                    use: [
                        MiniCssExtractPlugin.loader,
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
                                    exportLocalsConvention: 'camel-case',
                                    localIdentName: '[name]--[local]',
                                },
                                importLoaders: 2,
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true,
                                sassOptions: {
                                    outputStyle: 'expanded',
                                    quietDeps: true,
                                }
                            }
                        }
                    ],
                },
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options : {
                                importLoaders: 2,
                                sourceMap: true,
                                url: {
                                    filter: (url, resourcePath) => {
                                      // ignore resources that are included in css files that point to /assets
                                      // they are going to be served at runtime, we don't need to bundle them
                                      if (url.startsWith("/assets/")) {
                                        return false;
                                      }                        
                                      return true;
                                    },
                                }
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: true,
                                sassOptions: {
                                    // we need to use expanded to not lose selectors with no styles for which we also need to generate typescript typings
                                    outputStyle: 'expanded',
                                    quietDeps: true,
                                }
                            }
                        }
                    ],
                    exclude: PROJECT.cssModulesBasedComponents
                },
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
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
                    type: 'asset/inline',
                },
                {
                    test: /\.gif$/,
                    type: 'asset/resource',
                },
                {
                    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    type: 'asset/resource',
                    generator: {
                        filename: '[name][ext]'
                    }
                },
                {
                    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    // we use resource for fonts even so webpack documentation recommends inline, because
                    // otherwise we get 20MB style file with all icon fonts variations inlined
                    type: 'asset/resource',
                    generator: {
                        filename: '[name][ext]'
                    }    
                },
                {
                    test: path.join(ROOT_DIR, 'node_modules/codemirror/lib/codemirror.js'),
                    loader: "expose-loader",
                    options: {
                        exposes: ["CodeMirror"]
                    }
                },
                {
                    test: /\.ttl$/,
                    type: 'asset/source',
                },
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
            extensions: ['.ts', '.tsx', '.js', '.scss'],

            // these node.js dependencies are not used in the browser, but required by some libraries that we are using, 
            fallback: { 
                'stream': false, 'buffer': false, 
                'http': false, 'https': false, 'url': false, 'path': false,
                'crypto': false, 'os': false, 'assert': false, 'fs': false, 
                'net': false, 'tls': false, 'zlib': false,
            }
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
            new ForkTsCheckerWebpackPlugin({
                typescript: {
                    configFile: path.resolve(__dirname, '../tsconfig.json'),
                    mode: 'write-dts'
                }
            }),
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
                'jQuery': 'jquery'
            }),

            //do not bundle mirador images
            new webpack.NormalModuleReplacementPlugin(/\.\/images\/ui-.*/, 'node-noop'),
            new webpack.NormalModuleReplacementPlugin(
                /^util$/,
                path.join(ROOT_DIR, 'webpack/util-module.js')
            ),          
            new webpack.WatchIgnorePlugin({
                paths: [/scss\.d\.ts$/]
            }),
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
            }),
            new webpack.NormalModuleReplacementPlugin(
                /^punycode$/,
                path.join(ROOT_DIR, 'webpack/punycode-module.js')
            ),

            // it should always be the last plugin, because we remove it in karma config for unit tests
            new ModuleFederationPlugin(federationConfig),
        ]
    };

    return config;
};
