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

const assign = require('object-assign'),
      defaultsFn = require('../defaults.js'),
      utils = require('../utils.js');

module.exports = function(config) {
  const buildConfig = utils.parseArgs(config.env.buildConfig);
  const defaults = defaultsFn(buildConfig);
  const karmaConfig = require('./karma.config.js')(buildConfig, defaults);

  config.set(assign({}, karmaConfig, {
    logLevel: config.LOG_INFO,
    autoWatch: true,
    reporters: [ 'mocha' ],
    // Fix for tests run twice
    // https://github.com/nikku/karma-browserify/issues/67#issuecomment-84281528
    files: [
      {
        pattern: 'project/webpack/assets/no_auth/dll.*',
        watched: false,
        served: true
      },
      ... defaults.TEST_DIRS.map(testDir => ({
        pattern: testDir + '/**/*.test.ts',
        watched: false,
        included: true,
        served: true

      }))
    ],
    mochaReporter: {
      showDiff: true
    }
  }));
};
