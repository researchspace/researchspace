/*!
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

const fs = require('fs');

const [,, buildJsonPath] = process.argv;

/** @type {import('./defaults').RootBuildConfig} */
const ROOT_BUILD_CONFIG = JSON.parse(
  fs.readFileSync(buildJsonPath, 'utf-8')
);

let testResultPaths = 'project/webpack/tests_out/junit/**/*.xml';
for (const projectName of ROOT_BUILD_CONFIG.includeProjects) {
  testResultPaths += ' ' + `${projectName}/core/target/test-reports/*.xml`;
}

const {defaultShiroIniFolder = 'metaphacts-platform/app/config'} = ROOT_BUILD_CONFIG;

if (!fs.existsSync('./target')) {
  fs.mkdirSync('./target');
}
fs.writeFileSync('./target/testResultPaths', testResultPaths, {encoding: 'utf-8'});
fs.writeFileSync('./target/defaultShiroIniFolder', defaultShiroIniFolder, {encoding: 'utf-8'});
