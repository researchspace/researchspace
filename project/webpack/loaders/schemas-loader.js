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

/** @type {string} input */
module.exports = function (input) {
  /** @type {{ [schemaName: string]: string }} */
  const schemaPaths = JSON.parse(input);
  /** @type {Array<string>} */
  const imports = [];
  for (const key of Object.keys(schemaPaths)) {
    const jsonPath = schemaPaths[key];
    imports.push(
      `"${key}": require("${jsonPath}")`
    );
  }
  return 'module.exports = {\n' + imports.join(',\n') + '\n}';
};
