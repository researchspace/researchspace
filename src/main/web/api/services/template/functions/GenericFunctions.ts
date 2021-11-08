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
import * as uuidLib from 'uuid';

/**
 * Handlebars doesn't have any meance to use comparison operators in templates.
 * This function provides conditional if function for templates.
 *
 * Ex.:
 * {{#ifCond value ">=" 0}}<div>some content</div>{{else}}<div>some other content</div>{{/ifCond}}
 */
function checkCondition(v1, operator, v2) {
  switch (operator) {
    case '==':
      // tslint:disable-next-line:triple-equals
      return v1 == v2;
    case '===':
      return v1 === v2;
    case '!==':
      return v1 !== v2;
    case '<':
      return v1 < v2;
    case '<=':
      return v1 <= v2;
    case '>':
      return v1 > v2;
    case '>=':
      return v1 >= v2;
    case '&&':
      return v1 && v2;
    case '||':
      return v1 || v2;
    default:
      return false;
  }
}

/**
 * Generic helper functions for Handlebars templates.
 */
export const GenericFunctions = {
  /**
   * if operator for handlebars templates.
   */
  ifCond: function (v1, operator, v2, options) {
    return checkCondition(v1, operator, v2) ? options.fn(this) : options.inverse(this);
  },

  and: function() {
    return Array.prototype.every.call(arguments, Boolean);
  },

  eq: (v1, v2) => v1 === v2,
  not: (v1) => !v1,

  or: function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  },

  /**
   * switch statement for handlebars templates
   * Use break=true to skip other cases
   * Use default for unmatched cases
   *
   * @example
   *
   * {{#switch type}}
   *   {{#case "http://example.com/Organisation" break=true}}
   *     <p>Type is Organisation</p>
   *   {{/case}}
   *   {{#case "http://example.com/Person" break=true}}
   *     <p>Type is Person</p>
   *   {{/case}}
   *   {{#default}}
   *     <p>Default content here</p>
   *   {{/default}}
   * {{/switch}}
   *
   */
  switch: function (value, options) {
    this.switchValue = value;
    this.switchBreak = false;
    let html = options.fn(this);
    delete this.switchBreak;
    delete this.switchValue;
    return html;
  },

  case: function (value) {
    let args = Array.prototype.slice.call(arguments);
    let options = args.pop();

    if (this.switchBreak || args.indexOf(this.switchValue) === -1) {
      return '';
    } else {
      if (options.hash.break === true) {
        this.switchBreak = true;
      }
      return options.fn(this);
    }
  },

  default: function (options) {
    if (!this.switchBreak) {
      return options.fn(this);
    }
  },

  /**
   *  object length helper for handlebars templates.
   */
  objectLength: function (object) {
    return Object.keys(object).length;
  },

  /**
   * Raw block for template escaping.
   */
  raw: function (options) {
    return options.fn(this);
  },

  getValueByKey(options: Array<{key: string, value: string}>, keys: Array<string>, noMatch: any) {
    for (let i = 0; i < keys.length; i++) {
      const value = _.find(options, o => o.key === keys[i]);
      if (value) {
        return value.value;
      }
    }
    return noMatch;
  },

  hasKey(options: Array<string>, key: string) {
    const has = _.some(options, o => o === key);
    return has ? true : undefined;
  },

  stringify(options) {
    return JSON.stringify(options);
  },

  /**
   * generate uuid
   */
  uuid() {
    return uuidLib.v4();
  }
};
