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
    fs = require('fs'),
    _ = require('lodash'),
    webpack = require('webpack'),
    autoprefixer = require('autoprefixer'),
    MergePlugin = require('merge-webpack-plugin'),
    HappyPack = require('happypack'),
    ThemePlugin = require('./ThemePlugin');

var RuntimeAnalyzerPlugin = require('webpack-runtime-analyzer');

module.exports = function(buildConfig, defaults) {
    const {
        ROOT_DIR,
        METAPHACTORY_ROOT_DIR,
        METAPHACTORY_DIRS,
        DIST,
        TEST_DIRS,
        EXTENSIONS_WEB_DIRS,
        ALL_ROOT_DIRS,
        SRC_DIRS,
        EXTENSION_ALIASES
    } = defaults;

    // generate combined component.json
    const components = EXTENSIONS_WEB_DIRS.concat(METAPHACTORY_ROOT_DIR)
        .map(dir => path.join(dir, 'component.json'))
        .filter(dir => fs.existsSync(dir))
        .reduce((res, component) => Object.assign(res, JSON.parse(fs.readFileSync(component, 'utf8'))), {});
    fs.writeFileSync(path.join(__dirname, '.component.json'), JSON.stringify(components), 'utf8');
    //

    var entries = {};
    entries['app'] = [path.join(METAPHACTORY_DIRS.src, 'app', 'ts', 'app.ts')];
    entries['api-commons'] = [
        path.join(METAPHACTORY_DIRS.src, 'app', 'ts', 'bootstrap.ts'),
        // apis
        'platform/api/async', 'platform/api/events', 'platform/api/module-loader',
        'platform/api/navigation', 'platform/api/sparql', 'platform/api/rdf', 'platform/api/components',

        // services
        'platform/api/services/config', 'platform/api/services/config-holder',
        'platform/api/services/ldp', 'platform/api/services/page',
        'platform/api/services/resource-label', 'platform/api/services/resource-thumbnail',

        // components
        'platform/components/ui/template', 'platform/components/ui/overlay', 'platform/components/ui/spinner'
    ];

    const cssModulesBasedComponents =
    _.flatten(
      [
        //path.resolve(dirs.src, "common/ts/components"),
        "components/semantic/lazy-tree",
        "components/semantic/tree",
        "components/search/query-builder",
        "components/search/date",
        "components/search/facet/slider",
        "components/search/web-components",
        "components/search/configuration",
        "components/sets/views",
        "components/ui/highlight",
        "components/persistence",
        "components/collapsible",
        "components/dnd",
        "components/arguments"
      ].map(
        dir => SRC_DIRS.map(src => path.resolve(src, dir))
      )
    );

    const config = {
        resolveLoader: {
            modules: [path.resolve(__dirname, 'node_modules'), __dirname]
        },
        cache: true,
        entry: entries,
        output: {
            path: DIST,
            filename: '[name]-bundle.js',
            chunkFilename: '[name]-bundle.js',
            publicPath: '/assets/'
        },
        module: {
            noParse: [],
            rules: [
                // order of ts and scss loader matters, we detect it by id in webpack.dev file
                {
                    test: /(\.ts$)|(\.tsx$)/,
                    use: [{
                        loader: 'ts-loader',
                        options: {
                            happyPackMode: true,
                            transpileOnly: true
                        }

                    }],
                    include: SRC_DIRS.concat(TEST_DIRS)
                },
                {
                    test: /\.scss$/,
                    include: cssModulesBasedComponents,
                    use: [{
                        loader: 'happypack/loader?id=scss-modules'
                    }, ]
                },
                {
                    test: /\.scss$/,
                    use: [{
                        loader: 'happypack/loader?id=scss'
                    }],
                    exclude: cssModulesBasedComponents
                },
                {
                    test: /\.css$/,
                    use: [{
                        loader: 'happypack/loader?id=css'
                    }]
                },
                {
                    test: /\.component\.json$/,
                    use: [{
                        loader: 'components-loader'
                    }],
                    exclude: /node_modules/
                },

                {
                    test: /\.png$/,
                    use: [{
                        loader: 'url-loader',
                        options: {
                            limit: 100000,
                            mimetype: 'image/png'
                        }
                    }]
                },
                {
                    test: /\.gif$/,
                    loader: "file-loader"
                },

                // exclude highcharts
                {
                    test: /react\-highcharts\/dist\/ReactHighcharts\.js/,
                    use: process.env.BUNDLE_HIGHCHARTS ? [] : [{
                        loader: 'noop-loader'
                    }],
                    exclude: /node_modules/
                },
                {
                    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    use: [{
                        loader: 'url-loader',
                        options: {
                            limit: 10000,
                            mimetype: 'application/font-woff'
                        }
                    }]
                },
                {
                    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader: "file-loader"
                },

                {
                    test: path.join(METAPHACTORY_ROOT_DIR, 'node_modules/codemirror/lib/codemirror.js'),
                    loader: "expose-loader?CodeMirror"
                },
                // load images for simile timeline
                {
                    test: /.*red-circle\.png$/,
                    loader: 'file-loader?name=[name].[ext]&context=src/main/components/semantic/timeline/lib/timeline_2.3.0/timeline_js/images',
                    include: [path.join(METAPHACTORY_DIRS.src, 'components/semantic/timeline')]
                },
                {
                    test: /.*copyright-vertical\.png$/,
                    loader: 'file-loader?name=images/[name].[ext]&context=src/main/components/semantic/timeline/lib/timeline_2.3.0/timeline_js/images',
                    include: [path.join(METAPHACTORY_DIRS.src, 'components/semantic/timeline')]
                },
                {
                    test: /.*progress-running\.gif$/,
                    loader: 'file-loader?name=images/[name].[ext]&context=src/main/components/semantic/timeline/lib/timeline_2.3.0/timeline_js/images',
                    include: [path.join(METAPHACTORY_DIRS.src, 'components/semantic/timeline')]
                }
            ]
        },
        resolve: {
            modules: ['node_modules'].concat(ALL_ROOT_DIRS.map(dir => path.resolve(dir, 'node_modules'))),
            unsafeCache: true,
            alias: Object.assign({
                "platform/app": path.join(METAPHACTORY_DIRS.src, 'app/ts'),
                'platform/api': path.join(METAPHACTORY_DIRS.src, 'api'),
                'platform/components': path.join(METAPHACTORY_DIRS.src, 'components'),
                'basic-styles.scss': path.join(METAPHACTORY_DIRS.src, 'styling/basic.scss'),

                'custom-components': path.join(__dirname, '.component.json'),
                _: 'lodash',
                'basil.js': 'basil.js/src/basil.js',
                'handlebars': 'handlebars/dist/handlebars.js',
                'highcharts': 'highcharts/js/highcharts.src.js',
                'highcharts-more': path.join(METAPHACTORY_ROOT_DIR, 'node_modules/highcharts/js/highcharts-more.src.js'),
                'highcharts-css': path.join(METAPHACTORY_ROOT_DIR, 'node_modules/highcharts/css/highcharts.css')
            }, EXTENSION_ALIASES),
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
            // order matters see karma.config.js
            new webpack.DllReferencePlugin({
                manifest: require("./assets/dll-manifest/vendor-manifest.json"),
                context: path.resolve(METAPHACTORY_DIRS.src)
            }),
            new webpack.DllReferencePlugin({
                manifest: require("./assets/dll-manifest/basic_styling-manifest.json"),
                context: path.resolve(METAPHACTORY_DIRS.src)
            }),
            new webpack.optimize.CommonsChunkPlugin({
                names: ['api-commons'],
                minChunks: function(module) {
                    return module.context && module.context.indexOf("node_modules") !== -1;
                }
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'graphs-commons',
                chunks: [
                    'semantic-graph',
                    'semantic-graph-extension-expand-collapse',
                    'semantic-graph-extension-navigator',
                    'semantic-graph-extension-panzoom',
                    'semantic-graph-layout-breadthfirst',
                    'semantic-graph-layout-circle',
                    'semantic-graph-layout-concentric',
                    'semantic-graph-layout-cose-bilkent',
                    'semantic-graph-layout-cose',
                    'semantic-graph-layout-grid',
                    'semantic-graph-layout-preset'
                ],
                minChunks: 2
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'yasqe-commons',
                chunks: [
                    'mp-sparql-query-editor', 'mp-spin-query-template-editor', 'field-editor', 'mp-spin-query-editor'
                ]
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'code-highlight-commons',
                chunks: [
                    'mp-code-example', 'mp-code-highlight'
                ]
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'codemirror-commons',
                chunks: [
                    'mp-internal-page-editor', 'yasqe-commons', 'code-highlight-commons'
                ]
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'openlayers-commons',
                chunks: [
                    'semantic-search-query-builder', 'semantic-map'
                ]
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'splitpane-commons',
                chunks: [
                    'mp-splitpane',
                    'mp-splitpane-sidebar-closed',
                    'mp-splitpane-sidebar-open',
                    'mp-splitpane-toggle-on',
                    'mp-splitpane-toggle-off'
                ],
                minChunks: 1
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'print-commons',
                chunks: [
                    'mp-print', 'mp-print-section'
                ]
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'popover-commons',
                chunks: [
                    'mp-popover', 'mp-popover-trigger', 'mp-popover-content'
                ]
            }),
            new webpack.optimize.CommonsChunkPlugin({
                async: 'mirador-commons',
                chunks: [
                    'rs-iiif-mirador', 'rs-iiif-mirador-side-by-side-comparison'
                ]
            }),

            new webpack.LoaderOptionsPlugin({
                options: {
                    postcss: [
                        autoprefixer({
                            browsers: [
                                'last 3 version',
                                'ie >= 10',
                            ]
                        }),
                    ],
                    context: METAPHACTORY_DIRS.src
                }
            }),

            //cytoscape.js expects jquery in scope
            new webpack.ProvidePlugin({
                'cytoscape': 'cytoscape',
                '$': 'jquery',
                'jQuery': "jquery"
            }),

            //do not bundle images from dataTables in YASQR
            new webpack.NormalModuleReplacementPlugin(/\.\.\/images\/sort_[a-z]+(_disabled)?\.png$/, 'node-noop'),
            new webpack.NormalModuleReplacementPlugin(/\.\/images\/ui-.*/, 'node-noop'),

            new webpack.NormalModuleReplacementPlugin(/\.\/table\.js/, 'node-noop'),
            new webpack.NormalModuleReplacementPlugin(/\.\/pivot\.js/, 'node-noop'),
            new webpack.NormalModuleReplacementPlugin(/\.\/gchart\.js/, 'node-noop'),

            new HappyPack({
                id: 'scss-modules',
                threads: 2,
                loaders: [
                    'style-loader',
                    'typings-for-css-modules-loader?' + JSON.stringify({
                        modules: true,
                        importLoaders: 2,
                        localIdentName: '[name]--[local]',
                        namedExport: true,
                        camelCase: true
                    }),
                    'postcss-loader',
                    'sass-loader?' + JSON.stringify({
                        outputStyle: 'expanded'
                    })
                ]
            }),

            new HappyPack({
                id: 'scss',
                threads: 2,
                loaders: [
                    'style-loader',
                    'css-loader?' + JSON.stringify({
                        importLoaders: 2
                    }),
                    'postcss-loader',
                    'sass-loader?' + JSON.stringify({
                        outputStyle: 'expanded'
                    })
                ]
            }),

            new HappyPack({
                id: 'css',
                threads: 2,
                loaders: [
                    'style-loader',
                    'css-loader'
                ]
            }),
            new ThemePlugin(buildConfig, defaults)


            // new RuntimeAnalyzerPlugin({
            //   // Can be `standalone` or `publisher`.
            //   // In `standalone` mode analyzer will start rempl server in exclusive publisher mode.
            //   // In `publisher` mode you should start rempl on your own.
            //   mode: 'standalone',
            //   // Port that will be used in `standalone` mode to start rempl server.
            //   // When set to `0` a random port will be chosen.
            //   port: 0,
            //   // Automatically open analyzer in the default browser. Works for `standalone` mode only.
            //   open: false,
            //   // Use analyzer only when Webpack run in a watch mode. Set it to `false` to use plugin
            //   // in any Webpack mode. Take into account that a building process will not be terminated
            //   // when done since the plugin holds a connection to the rempl server. The only way
            //   // to terminate building process is using `ctrl+c` like in a watch mode.
            //   watchModeOnly: true
            // })

        ]
    };

    const addVendor = function(name, path) {
        config.resolve.alias[name + '$'] = path;
        config.module.noParse.push(new RegExp(path));
    };


    var minifiedLibs = [
        ['simile-ajax-bundle', path.join(METAPHACTORY_DIRS.src, 'components/semantic/timeline/lib/timeline_2.3.0/timeline_ajax/simile-ajax-bundle.js')],
        ['timeline-bundle', path.join(METAPHACTORY_DIRS.src, 'components/semantic/timeline/lib/timeline_2.3.0/timeline_js/timeline-bundle.js')],
        ['openlayers', path.join(METAPHACTORY_ROOT_DIR, 'node_modules/openlayers/dist/ol.js')]
    ];

    _.forEach(
        minifiedLibs,
        function(lib) {
            addVendor(lib[0], lib[1]);
        }
    );

    return config;
};
