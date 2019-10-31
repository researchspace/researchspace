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

const assign = require('object-assign');
const defaultsFn = require('../defaults.js');

/**
 * @param {import('karma').Config} config
 */
module.exports = function (config) {
  const defaults = defaultsFn();
  const karmaConfig = require('./karma.config.js')(defaults);

  config.set(assign({}, karmaConfig, {
    logLevel: config.LOG_INFO,
    junitReporter: {
      outputDir: 'project/webpack/tests_out/junit',
      outputFile: 'test-results.xml'
    },
    singleRun: true,
    reporters: ['junit'],
    files: [
      'project/webpack/assets/no_auth/dll.*',
      ... defaults.TEST_DIRS.map(testDir => testDir + '/**/*.test.ts')
    ],
  }));
};
