/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as _ from 'lodash';

export interface ParamMap {
  [index: string]: string;
}

export const QUERY_PARAM_PREFIX = 'urlqueryparam';

/**
 * Extracts all values from object where key starts with 'paramPrefix',
 * drops `paramPrefix`.
 *
 * Useful in web-components that needs to accept additional
 * arbitrary query parameters for url.
 *
 * For example lets say we have `paramPrefix` = 'urlqueryparam' and
 * the following object:
 * {
 *   urlqueryparamParamA: 'a',
 *   urlqueryparamParamB: 'b',
 *   someProp: 'c'
 * }
 *
 * As result of the transformation we will get:
 * {
 *   paramA: 'a',
 *   paramB: 'b'
 * }
 */
export function extractParams(props: {}, paramPrefix: string = QUERY_PARAM_PREFIX): ParamMap {
  return _.transform(props, (res: ParamMap, value: any, key: string) => {
    if (_.startsWith(key, paramPrefix)) {
      const propName = _.camelCase(key.substr(paramPrefix.length));
      res[propName] = value;
    }
    return res;
  });
}
