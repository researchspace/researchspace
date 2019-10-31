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
const {execFile} = require('child_process');

if (process.argv.length < 4) {
  const scriptName = path.basename(process.argv[1]);
  console.error(
    `Invalid arguments for ${scriptName}:\n` +
    `$ ${scriptName} <project-name> <interface-name>`
  );
  process.exit(1);
}

const [nodePath,, projectName, interfaceName, required = '--required'] = process.argv;
const projectRoot = path.normalize(`${__dirname}/../..`);

if (!fs.existsSync(path.join(projectRoot, projectName))) {
  console.error(`Project "${projectName}" does not exists.`);
  process.exit(2);
}

const targetExecutable = path.normalize(
  'project/webpack/node_modules/typescript-json-schema/bin/typescript-json-schema'
);
const args = [
  targetExecutable,
  'tsconfig.json',
  interfaceName,
  '--out', `${projectName}/web/schemas/${interfaceName}.json`,
  required,
  '--propOrder', 'true'
];
execFile(nodePath, args, {cwd: projectRoot}, (/** @type {NodeJS.ErrnoException} */error, stdout, stderr) => {
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  if (error) {
    console.error('Json scheme was not generated! Please, check your package.json and npm configuration!');
    throw error;
  } else {
    console.log('Json schema was generated.');
  }
});
