/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Standalone Sigma unit tests; also discovered by the existing Karma suite.
 * Only graph fetching and browser storage are replaced. Graphology, RDF terms,
 * SPARQL parsing/binding and the components' pure helpers use real code.
 */
const fs = require('fs'), path = require('path'), Module = require('module');
const root = path.resolve(__dirname, '..');
const ts = require('typescript'), Mocha = require('mocha');
global.window = global;
global.location = { href: 'http://localhost/sigma-tests' };
const storage = new Map();
global.localStorage = {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'platform/components/semantic/graph/GraphInternals') return {};
  if (request === 'platform/api/async') request = path.join(root, 'src/main/web/api/async/Cancellation.ts');
  else if (request.startsWith('platform/')) request = path.join(root, 'src/main/web', request.slice('platform/'.length));
  return originalLoad.call(this, request, parent, isMain);
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2016,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    },
  }).outputText, filename);
}
const mocha = new Mocha({ reporter: 'spec' });
const tests = path.join(root, 'src/test/web/components/semantic/sigma-graph');
fs.readdirSync(tests).filter(file => file.endsWith('.test.ts')).sort()
  .forEach(file => mocha.addFile(path.join(tests, file)));
mocha.run(failures => { process.exitCode = failures ? 1 : 0; });
