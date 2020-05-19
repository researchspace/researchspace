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

const defaultsFn = require('../defaults.js');

/**
 * @param {import('karma').Config} config
 */
module.exports = function (config) {
  const defaults = defaultsFn();
  const karmaConfig = require('./karma.config.js')(defaults);
 
  config.set(Object.assign({}, karmaConfig, {
    logLevel: config.LOG_INFO,
    autoWatch: true,
    reporters: [ 'mocha' ],
    // Fix for tests run twice
    // https://github.com/nikku/karma-browserify/issues/67#issuecomment-84281528
    files: [
      {
        pattern: defaults.TEST + '/**/*.test.ts',
        watched: false,
        included: true,
        served: true

      }
    ],
    mochaReporter: {
      showDiff: true
    }
  }));
};
