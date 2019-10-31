/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
export function extractParams(
  props: {}, paramPrefix: string = QUERY_PARAM_PREFIX
): ParamMap {
  return _.transform(
    props, (res: ParamMap, value: any, key: string) => {
      if (_.startsWith(key, paramPrefix)) {
        const propName =
          _.camelCase(
            key.substr(paramPrefix.length)
          );
        res[propName] = value;
      }
      return res;
    });
}
