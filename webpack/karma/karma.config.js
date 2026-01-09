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

var webpack = require('webpack'),
    path = require('path'),
    MiniCssExtractPlugin = require('mini-css-extract-plugin'),
    webpackConfigFn = require('../webpack.config.js');

/**
 * @param {ReturnType<import('../defaults')>} defaults
 * @returns {import('karma').ConfigOptions}
 */
module.exports = function (defaults) {
    const webpackConfig = webpackConfigFn(defaults);
    webpackConfig.mode = 'development';
    delete webpackConfig.optimization.splitChunks;
    
    // Replace MiniCssExtractPlugin.loader with style-loader for tests
    // MiniCssExtractPlugin extracts CSS into separate files, which causes issues in the Karma/Webpack
    // test environment (running in memory). The loader often fails to find the extracted data,
    // leading to errors like "TypeError: Cannot read properties of undefined (reading 'data')".
    // style-loader injects CSS directly into the DOM, which is the standard and more robust approach for tests.
    webpackConfig.module.rules.forEach(rule => {
        if (Array.isArray(rule.use)) {
            rule.use = rule.use.map(use => {
                if (use === MiniCssExtractPlugin.loader) {
                    return 'style-loader';
                }
                return use;
            });
        }
    });

    // Remove MiniCssExtractPlugin from plugins
    webpackConfig.plugins = webpackConfig.plugins.filter(plugin => !(plugin instanceof MiniCssExtractPlugin));
    
    delete webpackConfig.entry;
    delete webpackConfig.devtool;
    webpackConfig.output.path = path.resolve(defaults.ROOT_DIR, 'build/webpack-build');

    // add alias for test directory from metaphacts-platform web project
    webpackConfig.resolve.alias['platform-tests'] = defaults.TEST;

    return {
        frameworks: ['mocha', 'chai', 'chai-as-promised', 'webpack'],
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
        // use for debugging in the real browser
        //browsers: ['Chromium'],
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
