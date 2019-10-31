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
    return (v1 == v2);
  case '===':
    return (v1 === v2);
  case '!==':
    return (v1 !== v2);
  case '<':
    return (v1 < v2);
  case '<=':
    return (v1 <= v2);
  case '>':
    return (v1 > v2);
  case '>=':
    return (v1 >= v2);
  case '&&':
    return (v1 && v2);
  case '||':
    return (v1 || v2);
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
    return checkCondition(v1, operator, v2)
        ? options.fn(this)
        : options.inverse(this);
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
  switch: function(value, options) {
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

  default: function(options) {
    if (!this.switchBreak) {
      return options.fn(this);
    }
  },

  /**
   *  object length helper for handlebars templates.
   */
  objectLength: function(object) {
    return Object.keys(object).length;
  },

  /**
   * Raw block for template escaping.
   */
  raw: function (options) {
    return options.fn(this);
  },
};
