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

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const AssetsPlugin = require('assets-webpack-plugin');
const autoprefixer = require('autoprefixer');
const HappyPack = require('happypack');
const resolveTheme = require('./theme');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// GS:
const getRepoInfo = require('git-repo-info');

/**
 * @param {ReturnType<import('./defaults')>} defaults
 * @returns {import('webpack').Configuration}
 */
module.exports = function (defaults) {
    const {
      WEB_PROJECTS,
      ROOT_DIR,
      METAPHACTORY_ROOT_DIR,
      METAPHACTORY_DIRS,
      GRAPHSCOPE_ROOT_DIR,
      GRAPHSCOPE_SOURCE_DIR,
      GRAPHSCOPE_NEW_SOURCE_DIR,
      DIST,
      TEST_DIRS,
      SRC_DIRS
    } = defaults;

    console.log('Building the following web projects: ' + WEB_PROJECTS.map(p => p.name).join(', '));

    /**
     * Env
     * Get npm lifecycle event to identify the environment
     */
    var ENV = process.env.npm_lifecycle_event;
    var isTest = ENV === 'test' || ENV === 'test-watch';
    var isProd = ENV === 'build';
    var info = getRepoInfo(); //git repo info  // This is needed for the version file.

    /** @type {{ [entryKey: string]: Array<string> }} */
    const entries = {};
    /** @type {Array<string>} */
    let extensions = [];
    /** @type {Array<string>} */
    const cssModulesBasedComponents = [];
    /**
     * Mapping from schemaName -> import path for JSON file
     * @type {{ [schemaName: string]: string }}
     */
    const jsonSchemas = {};
    /** @type {{ [componentTag: string]: string }} */
    const components = {};

    for (const project of WEB_PROJECTS) {
      if (project.entries) {
        Object.keys(project.entries).forEach(key => {
          const entryPath = project.entries[key];
          entries[key] = [path.join(project.webDir, entryPath)];
        });
      }

      if (project.cssModulesBasedComponents) {
        for (const componentDir of project.cssModulesBasedComponents) {
          cssModulesBasedComponents.push(
            path.resolve(project.webDir, componentDir)
          );
        }
      }

      if (project.extensions) {
        extensions = [...extensions, ...project.extensions];
      }

      if (project.generatedJsonSchemas) {
        for (const schemaName of project.generatedJsonSchemas) {
          const schemaPath = `${project.schemasAlias}/${schemaName}.json`;
          jsonSchemas[schemaName] = schemaPath;
        }
      }

      const componentsJsonPath = path.join(project.webDir, 'component.json');
      if (fs.existsSync(componentsJsonPath)) {
        const componentsJson = JSON.parse(fs.readFileSync(componentsJsonPath, 'utf8'));
        Object.assign(components, componentsJson);
      }
    }

    // generate combined .mp-extensions JSON
    fs.writeFileSync(path.join(__dirname, '.mp-extensions'), JSON.stringify(extensions), 'utf8');
    // generate combined .mp-components JSON
    fs.writeFileSync(path.join(__dirname, '.mp-components'), JSON.stringify(components), 'utf8');
    // generate combined .mp-schemas JSON
    fs.writeFileSync(path.join(__dirname, '.mp-schemas'), JSON.stringify(jsonSchemas), 'utf8');

    const {themeDir} = resolveTheme(defaults);
    console.log('Using theme directory: ' + themeDir);

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
            /** @type {any[]} */
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
                    include: [SRC_DIRS.concat(TEST_DIRS), GRAPHSCOPE_NEW_SOURCE_DIR],
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                    test: /\.scss$/,
                    include: cssModulesBasedComponents,
                    use: [{
                        loader: 'happypack/loader?id=scss-modules'
                    }, ],
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                    test: /\.scss$/,
                    use: [{
                        loader: 'happypack/loader?id=scss'
                    }],
                    exclude: [cssModulesBasedComponents, GRAPHSCOPE_SOURCE_DIR]
                },
                {
                    test: /\.css$/,
                    use: [{
                        loader: 'happypack/loader?id=css'
                    }],
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                    test: /\.mp-components$/,
                    use: [{loader: 'loaders/components-loader'}],
                    exclude: [/node_modules/]
                },
                {
                    test: /\.mp-extensions$/,
                    use: [{loader: 'loaders/extensions-loader'}],
                    exclude: [/node_modules/]
                },
                {
                    test: /\.mp-schemas$/,
                    use: [{loader: 'loaders/schemas-loader'}],
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
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                    test: /\.gif$/,
                    loader: "file-loader",
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },

                // exclude highcharts
                {
                    test: /react\-highcharts\/dist\/ReactHighcharts\.js/,
                    use: process.env.BUNDLE_HIGHCHARTS ? [] : [{
                        loader: 'noop-loader'
                    }],
                    exclude: [/node_modules/, GRAPHSCOPE_SOURCE_DIR]
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
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    loader: "file-loader",
                    exclude: [GRAPHSCOPE_SOURCE_DIR, /.*ketcher\.svg$/, /.*library\.svg$/]
                },

                {
                    test: path.join(METAPHACTORY_ROOT_DIR, 'node_modules/codemirror/lib/codemirror.js'),
                    loader: "expose-loader?CodeMirror",
                    exclude: GRAPHSCOPE_SOURCE_DIR
                },
                // graphscope
                // .ts
                // {
                //   test: /\.ts$/,
                //   include: GRAPHSCOPE_SOURCE_DIR,
                //   enforce: "pre",
                //   use: isTest ? [] : [{
                //     loader: "tslint-loader",
                //     options: {
                //       emitErrors: false,
                //       failOnHint: false
                //     }
                //   }],
                //   // always exclude .e2e.ts, if not testing also exclude .spec.ts and .livespec.ts
                //   exclude: [isTest ? /\.(e2e)\.ts$/ : /\.(livespec|spec|e2e)\.ts$/, /node_modules\/(?!(ng2-.+))/]
                // },
                {
                  test: /\.ts$/,
                  include: GRAPHSCOPE_SOURCE_DIR,
                  use: [{
                    loader: "ts-loader",
                    options: {
                      transpileOnly: true
                    }
                  }],
                  // always exclude .e2e.ts, if not testing also exclude .spec.ts and .livespec.ts
                  exclude: [isTest ? /\.(e2e)\.ts$/ : /\.(livespec|spec|e2e)\.ts$/, /node_modules\/(?!(ng2-.+))/]
                },
                // assets not in public, moved to dist/fonts
                {
                  test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)$/,
                  include: GRAPHSCOPE_SOURCE_DIR,
                  use: [{
                    loader: "file-loader",
                    options: {
                      name: "fonts/[name].[hash].[ext]?"
                    }
                  }]
                },
                // .html maybe specific loader?
                {
                  test: /\.html$/,
                  include: GRAPHSCOPE_SOURCE_DIR,
                  use: [{
                    loader: "raw-loader"
                  }]
                },
                // Support for CSS as raw text
                // use 'null' loader in test mode (https://github.com/webpack/null-loader)
                // all css in src/style will be bundled in an external css file
                {
                  test: /\.css$/,
                  include: GRAPHSCOPE_SOURCE_DIR,
                  exclude: path.join(GRAPHSCOPE_SOURCE_DIR, 'app'),
                  use: isTest ? 'null' : [{
                        loader: "css-loader",
                        options: {
                          sourceMap: "true"
                        }
                      },
                      {
                        loader: "postcss-loader",
                        options: {
                          options: {}
                        }
                      }
                    ]
                },
                // all css required in src/app files will be merged in js files
                {
                  test: /\.css$/,
                  include: path.join(GRAPHSCOPE_SOURCE_DIR, 'app'),
                  use: [{
                      loader: "raw-loader"
                    },
                    {
                      loader: "postcss-loader",
                      options: {
                        options: {}
                      }
                    }
                  ]
                },

                // support for .scss files
                // use 'null' loader in test mode (https://github.com/webpack/null-loader)
                // all css in src/style will be bundled in an external css file
                {
                  test: /\.scss$/,
                  include: GRAPHSCOPE_SOURCE_DIR,
                  exclude: path.join(GRAPHSCOPE_SOURCE_DIR, 'app'),
                  use: isTest ? 'null' : [{
                        loader: "css-loader",
                        options: {
                          sourceMap: "true"
                        }
                      },
                      {
                        loader: "postcss-loader",
                        options: {
                          options: {}
                        }
                      }
                    ]
                },
                // all css required in src/app files will be merged in js files
                {
                  test: /\.scss$/,
                  include: path.join(GRAPHSCOPE_SOURCE_DIR, 'app'),
                  use: [{
                      loader: "raw-loader"
                    },
                    {
                      loader: "sass-loader"
                    }
                  ]
                },
                {
                  test: /\.(js|ts)$/,
                  enforce: "post",
                  include: GRAPHSCOPE_SOURCE_DIR,
                  use: isTest ? [] : [{
                    loader: 'istanbul-instrumenter-loader'
                  }],
                  exclude: [/\.spec\.ts$/, /\.livespec\.ts$/, /\.e2e\.ts$/, /node_modules/]
                },
                {
                  test: /.*ketcher\.svg$/,
                  loader: 'raw-loader',
                  exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                  test: /.*library\.svg$/,
                  loader: 'raw-loader',
                  exclude: GRAPHSCOPE_SOURCE_DIR
                },
                {
                  test: /.*library\.sdf$/,
                  loader: 'raw-loader',
                  exclude: GRAPHSCOPE_SOURCE_DIR
                }
              ],
              noParse: [/.+zone\.js\/dist\/.+/, /.+angular2\/bundles\/.+/, /angular2-polyfills\.js/]
        },
        resolve: {
            modules: ['node_modules'].concat(
              WEB_PROJECTS.map(project => path.resolve(project.webDir, 'node_modules'))
            ),
            unsafeCache: true,
            alias: Object.assign(
              defaults.ALIASES,
              {
                'platform-components': path.join(__dirname, '.mp-components'),
                'platform-extensions': path.join(__dirname, '.mp-extensions'),
                'platform-schemas': path.join(__dirname, '.mp-schemas'),
                'platform-theme': themeDir,
                _: 'lodash',
                'basil.js': 'basil.js/src/basil.js',
                'handlebars': 'handlebars/dist/handlebars.js',
                'ketcher.svg': path.join(METAPHACTORY_ROOT_DIR, 'node_modules/ketcher/dist/ketcher.svg'),
                'library.sdf': path.join(METAPHACTORY_ROOT_DIR, 'node_modules/ketcher/dist/library.sdf'),
                'library.svg': path.join(METAPHACTORY_ROOT_DIR, 'node_modules/ketcher/dist/library.svg'),
                'jsonld': path.join(METAPHACTORY_ROOT_DIR, 'node_modules/jsonld/dist/jsonld.js'),
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
            // order matters see karma.config.js
            new webpack.DllReferencePlugin({
                /** @type {any} */
                manifest: require("./assets/dll-manifest/vendor-manifest.json"),
                context: path.resolve(METAPHACTORY_DIRS.src)
            }),
            new webpack.DllReferencePlugin({
                /** @type {any} */
                manifest: require("./assets/dll-manifest/basic_styling-manifest.json"),
                context: path.resolve(METAPHACTORY_DIRS.src)
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

            //do not bundle mirador images
          new webpack.NormalModuleReplacementPlugin(/\.\/images\/ui-.*/, 'node-noop'),

          new webpack.WatchIgnorePlugin([
              /scss\.d\.ts$/
          ]),

         // new BundleAnalyzerPlugin(),

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

            /*
             * Generate json files with bundle - hashed bundle file names,
             * so we can properly refer to bundles in main.hbs and login.hbs files
             */
            new AssetsPlugin({
              // TODO: use this generated file even in local dev builds
              filename: 'bundles-manifest.json',
              path: defaults.DIST
            })
        ]
    };

    return config;
};
