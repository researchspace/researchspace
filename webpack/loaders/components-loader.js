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
const _ = require('lodash');

module.exports.default = function(input) {
    const ifs =
        _.reduce(JSON.parse(input), (acc, file, component) => {
            const snipet = `
            if(tagName === '${component}') {
              return import(/* webpackChunkName: "${component}"*/'${file}').then(
                function(comp) {
                  onLoaded(comp);
                  return comp;
                }
              );
            }
          `;
            return acc + snipet;
        }, '');

    return `module.exports = function(tagName) {
    function onLoaded(comp) {
      if (!comp.default) {
        throw new Error('Failed to load component <' + tagName + '>');
      }
      comp.default.__htmlTag = tagName;
    }
    ${ifs}
  };`;
};
