/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
module.exports = function(config) {
  const defaults = require('../defaults.js')();
  const base = require('./karma.config.js')(defaults);
  config.set(Object.assign({}, base, {
    singleRun: true,
    reporters: ['mocha'],
    files: [
      defaults.TEST + '/components/semantic/table/SearchTable.test.ts',
      defaults.TEST + '/api/services/template/InstanceIdHelper.test.ts',
      defaults.TEST + '/components/semantic/table/SemanticTableResultsLoaded.test.ts',
      defaults.TEST + '/components/semantic/table/ResourceDropdownMenuTemplate.test.ts',
      defaults.TEST + '/components/ui/TabsLazyBadge.test.ts',
      ...base.files,
    ],
  }));
};
