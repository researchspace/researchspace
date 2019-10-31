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

var webpack = require('webpack'),
    path = require('path'),
    webpackConfigFn = require('../webpack.config.js');

/**
 * @param {ReturnType<import('../defaults')>} defaults
 * @returns {import('karma').ConfigOptions}
 */
module.exports = function (defaults) {
    const webpackConfig = webpackConfigFn(defaults);
    delete webpackConfig.entry;

    webpackConfig.mode = 'development';

    // karma webpack plugin is not compatible with CommonsChunkPlugin and DllReferencePlugin,
    // so need to remove it in tests
    webpackConfig.plugins.splice(2, 1);

    // enable happypack for ts
    webpackConfig.plugins.push(defaults.tsHappyPack(webpackConfig.module.rules[0].use[0]));

    // add test dependencies to webpack module resolution path
    webpackConfig.resolve.modules.push(path.join(__dirname, '../node_modules'));

    // add alias for test directory from metaphacts-platform web project
    webpackConfig.resolve.alias['platform-tests'] = defaults.METAPHACTORY_DIRS.test;

    // exclude Highcharts from tests
    webpackConfig.plugins.push(
        new webpack.DefinePlugin({
            BUNDLE_HIGHCHARTS: Boolean(process.env.BUNDLE_HIGHCHARTS)
        })
    );

    return {
        frameworks: ['mocha', 'chai', 'chai-as-promised'],
        plugins: [
            'karma-mocha',
            'karma-mocha-reporter',
            'karma-chai-plugins',
            'karma-sourcemap-loader',
            'karma-webpack',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-junit-reporter'
        ],
        basePath: defaults.ROOT_DIR,
        preprocessors: {
            '**/*.test.ts': ['webpack']
        },
        webpack: webpackConfig,
        webpackMiddleware: {
            // webpack-dev-middleware configuration
            // i. e.
            noInfo: true,
            stats: {
                assets: false,
                colors: true,
                version: false,
                hash: false,
                timings: false,
                chunks: false,
                chunkModules: false
            }
        },
        browsers: ['ChromiumHeadlessNoSandbox'],
        customLaunchers: {
          ChromiumHeadlessNoSandbox: {
            base: 'ChromiumHeadless',
            flags: [
                '--no-sandbox',
                '--headless',
                '--disable-gpu',
                '--disable-translate',
                '--disable-extensions',
                '--no-proxy-server'
                ]
          }
        },
        client: {
            captureConsole: false
        },

        // see https://github.com/angular/angular-cli/issues/2125#issuecomment-247395088
        mime: {
            'text/x-typescript': ['ts', 'tsx']
        },

        // increase timeouts, especially relevant for CI build
        browserDisconnectTimeout: 30000, // default 2000
        browserDisconnectTolerance: 1, // default 0
        browserNoActivityTimeout: 180000, //default 10000
        captureTimeout: 180000
    };
};
