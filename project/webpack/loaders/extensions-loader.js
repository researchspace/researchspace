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

module.exports.default = function (input) {
  const extensionPaths = JSON.parse(input);
  if (!Array.isArray(extensionPaths)) {
    throw new Error('Extensions must be an array of module paths');
  }
  return extensionPaths.reduce((acc, modulePath) => {
    if (typeof modulePath !== 'string') {
      throw new Error('Extension module path must be a string');
    }
    return acc + `require("${modulePath}");\n`;
  }, '');
};
