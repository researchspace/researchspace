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

/*
 Based on jsrelaxngvalidator at https://github.com/ndebeiss/jsrelaxngvalidator
 License: Apache License 2.0

 @see http://www.w3.org/2001/XMLSchema-datatypes

 Extract from <http://www.w3schools.com/Schema/schema_dtypes_date.asp>:

   date        Defines a date value                                      OK
   dateTime    Defines a date and time value                             OK
   duration    Defines a time interval                                   OK
   gDay        Defines a part of a date - the day (DD)                   OK
   gMonth      Defines a part of a date - the month (MM)                 OK
   gMonthDay   Defines a part of a date - the month and day (MM-DD)      OK
   gYear       Defines a part of a date - the year (YYYY)                OK
   gYearMonth  Defines a part of a date - the year and month (YYYY-MM)   OK
   time        Defines a time value                                      OK

 Extract from <http://www.w3schools.com/Schema/schema_dtypes_numeric.asp>:

   byte                 A signed 8-bit integer                  OK
   decimal              A decimal value                         OK
   int                  A signed 32-bit integer                 OK
   integer              An integer value                        OK
   long                 A signed 64-bit integer                 OK
   negativeInteger      An integer containing only negative values ( .., -2, -1.)       OK
   nonNegativeInteger   An integer containing only non-negative values (0, 1, 2, ..)    OK
   nonPositiveInteger   An integer containing only non-positive values (.., -2, -1, 0)  OK
   positiveInteger      An integer containing only positive values (1, 2, ..)           OK
   short                A signed 16-bit integer                 OK
   unsignedLong         An unsigned 64-bit integer              OK
   unsignedInt          An unsigned 32-bit integer              OK
   unsignedShort        An unsigned 16-bit integer              OK
   unsignedByte         An unsigned 8-bit integer               OK

 Extract from <http://www.w3schools.com/Schema/schema_dtypes_misc.asp>:

   anyURI         does not do any validation
   base64Binary   OK
   boolean        OK
   double         OK
   float          same as double
   hexBinary      OK

 Extract from <http://www.w3schools.com/Schema/schema_elements_ref.asp>:

   enumeration      Defines a list of acceptable values
   fractionDigits   Specifies the maximum number of decimal places allowed. Must be equal to or greater than zero             OK
   length           Specifies the exact number of characters or list items allowed. Must be equal to or greater than zero     OK but not for list and only length of string
   maxExclusive     Specifies the upper bounds for numeric values (the value must be less than this value)                    OK
   maxInclusive     Specifies the upper bounds for numeric values (the value must be less than or equal to this value)        OK
   maxLength        Specifies the maximum number of characters or list items allowed. Must be equal to or greater than zero   OK
   minExclusive     Specifies the lower bounds for numeric values (the value must be greater than this value)                 OK
   minInclusive     Specifies the lower bounds for numeric values (the value must be greater than or equal to this value)     OK
   minLength        Specifies the minimum number of characters or list items allowed. Must be equal to or greater than zero   OK
   pattern          Defines the exact sequence of characters that are acceptable                                              OK
   totalDigits      Specifies the exact number of digits allowed. Must be greater than zero                                   OK
   whiteSpace       Specifies how white space (line feeds, tabs, spaces, and carriage returns) is handled                     KO
*/

import * as Rdf from './Rdf';
import rdf from '../vocabularies/rdf';
import xsd from '../vocabularies/xsd';

const languageRegExp = new RegExp('^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$');

const whitespaceChar = '\t\n\r';
const normalizedStringRegExp = new RegExp('^[^' + whitespaceChar + ']*$');
const tokenRegExp = new RegExp(
  '^([^' + whitespaceChar + ' ](?!.*  )([^' + whitespaceChar + ']*[^' + whitespaceChar + ' ])?)?$');

const year = '-?([1-9][0-9]*)?[0-9]{4}';
const month = '[0-9]{2}';
const dayOfMonth = '[0-9]{2}';
const time = '[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]*)?';
const timeZone = '(Z|[\-\+][0-9][0-9]:[0-5][0-9])?';

const dateRegExp = new RegExp('^' + year + '-' + month + '-' + dayOfMonth + timeZone + '$');
const dateTimeRegExp = new RegExp('^' + year + '-' + month + '-' + dayOfMonth + 'T' + time + timeZone + '$');
const durationRegExp = new RegExp(
  '^' + '-?P(?!$)([0-9]+Y)?([0-9]+M)?([0-9]+D)?(T(?!$)([0-9]+H)?([0-9]+M)?([0-9]+(\\.[0-9]+)?S)?)?$');
const gDayRegExp = new RegExp('^' + '---' + dayOfMonth + timeZone + '$');
const gMonthRegExp = new RegExp('^' + '--' + month + timeZone + '$');
const gMonthDayRegExp = new RegExp('^' + '--' + month + '-' + dayOfMonth + timeZone + '$');
const gYearRegExp = new RegExp('^' + year + timeZone + '$');
const gYearMonthRegExp = new RegExp('^' + year + '-' + month + timeZone + '$');
const timeRegExp = new RegExp('^' + time + timeZone + '$');

const LONG_MAX = 9223372036854775807;
const LONG_MIN = -9223372036854775808;
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;
const SHORT_MAX = 32767;
const SHORT_MIN = -32768;
const BYTE_MAX = 127;
const BYTE_MIN = -128;

const UNSIGNED_LONG_MAX = 18446744073709551615;
const UNSIGNED_INT_MAX = 4294967295;
const UNSIGNED_SHORT_MAX = 65535;
const UNSIGNED_BYTE_MAX = 255;

const integer = '[\-\+]?[0-9]+';
const integerRegExp = new RegExp('^' + integer + '$');
const decimal = '[\-\+]?(?!$)[0-9]*(\\.[0-9]*)?';
const decimalRegExp = new RegExp('^' + decimal + '$');

/*
  Base64Binary  ::=
    ((B64S B64S B64S B64S)*
    ((B64S B64S B64S B64) |
     (B64S B64S B16S '=') |
     (B64S B04S '=' #x20? '=')))?

 B64S  ::=  B64 #x20?
 B16S  ::=  B16 #x20?
 B04S  ::=  B04 #x20?

 B04  ::=  [AQgw]
 B16  ::=  [AEIMQUYcgkosw048]
 B64  ::=  [A-Za-z0-9+/]
*/
const b64 = '[A-Za-z0-9+/]';
const b16 = '[AEIMQUYcgkosw048]';
const b04 = '[AQgw]';
const b04S = '(' + b04 + ' ?)';
const b16S = '(' + b16 + ' ?)';
const b64S = '(' + b64 + ' ?)';

const base64BinaryRegExp = new RegExp(
  '^((' + b64S + '{4})*((' + b64S + '{3}' + b64 + ')|(' + b64S + '{2}' + b16S + '=)|(' + b64S + b04S + '= ?=)))?$');
const booleanRegExp = new RegExp('(^true$)|(^false$)|(^0$)|(^1$)', 'i');
const doubleRegExp = new RegExp('(^-?INF$)|(^NaN$)|(^' + decimal + '([Ee]' + integer + ')?$)');
const hexBinaryRegExp = new RegExp('^' + '[0-9a-fA-F]*' + '$');
const fractionDigits = '\\.[0-9]';


// URI regex — reference: http://ftp.davidashen.net/PreTI/RNV/rnv-1.7.8.zip/xsd.c:298
const URI_PATTERN = "^(([a-zA-Z][0-9a-zA-Z+\\-.]*:)?/{0,2}[0-9a-zA-Z;/?:@&=+$.\\-_!~*'()%]+)?(#[0-9a-zA-Z;/?:@&=+$.\\-_!~*'()%]+)?$";

enum Whitespace { PRESERVE, REPLACE, COLLAPSE }

export interface Datatype {
  iri: Rdf.Iri;
  prefix: string;
  localName: string;
}

type Param =
  {whitespace: Whitespace} |
  {enumeration: string} |
  {length: string} |
  {minLength: string} |
  {maxLength: string} |
  {minInclusive: string} |
  {minExclusive: string} |
  {maxInclusive: string} |
  {maxExclusive: string} |
  {totalDigits: string} |
  {fractionDigits: string} |
  {pattern: string};

export interface ValidationResult {
  success: boolean;
  message?: string;
  child?: Datatype | ValidationResult;
  errorPart?: string;
}

function success(): ValidationResult {
  return {success: true};
}

function failure(
  message: string,
  child: Datatype | ValidationResult,
  errorPart: string
): ValidationResult {
  return {success: false, message, child, errorPart};
}

export function parseXsdDatatype(datatype: Rdf.Iri | string): Datatype {
  let datatypeIri: Rdf.Iri;
  if (typeof datatype === 'string') {
    datatypeIri = Rdf.iri(datatype
      .replace(/^xsd:(.*)$/, `${xsd._NAMESPACE}$1`)
      .replace(/^rdf:(.*)$/, `${rdf._NAMESPACE}$1`));
  } else {
    datatypeIri = datatype;
  }
  const parts = datatypeIri.value.split('#');
  if (parts.length === 2) {
    const ns = parts[0] + '#';
    if (ns === xsd._NAMESPACE || ns === xsd._DATATYPES_NAMESPACE) {
      return {iri: datatypeIri, prefix: 'xsd', localName: parts[1]};
    } else if (ns === rdf._NAMESPACE) {
      return {iri: datatypeIri, prefix: 'rdf', localName: parts[1]};
    }
  }
  return undefined;
}

/**
 * Replaces XSD datatype aliases with versions from main namespace
 * @see xsd._DATATYPES_NAMESPACE
 */
export function replaceDatatypeAliases(datatype: Rdf.Iri): Rdf.Iri {
  const xsdDatatype = parseXsdDatatype(datatype);
  return xsdDatatype ? Rdf.iri(xsd._NAMESPACE + xsdDatatype.localName) : datatype;
}

export function sameXsdDatatype(datatype1: Rdf.Iri, datatype2: Rdf.Iri): boolean {
  const type1 = parseXsdDatatype(datatype1);
  const type2 = parseXsdDatatype(datatype2);
  if (type1 && type2) {
    return type1.localName === type2.localName;
  } else {
    return datatype1.equals(datatype2);
  }
}

export function datatypeToString(datatype: Rdf.Iri): string {
  const type = parseXsdDatatype(datatype);
  return type ? `${type.prefix}:${type.localName}` : datatype.value;
}

export function validate(literal: Rdf.Literal, params?: Param[]): ValidationResult {
  const datatype = parseXsdDatatype(literal.datatype);
  if (!datatype) {
    return failure(
      `Unknown XSD datatype ${datatypeToString(literal.datatype)}`,
      {iri: literal.datatype, localName: '', prefix: ''}, '');
  }
  if (!params) { params = []; }
  return datatypeAllows(datatype, literal.value, params);
}

export function equal(first: Rdf.Literal, second: Rdf.Literal): ValidationResult {
  const type1 = parseXsdDatatype(first.datatype);
  const type2 = parseXsdDatatype(second.datatype);
  if (!type1) {
    return failure(
      `Unknown XSD datatype ${datatypeToString(first.datatype)}`,
      {iri: first.datatype, localName: '', prefix: ''}, '');
  } else if (!type2) {
    return failure(
      `Unknown XSD datatype ${datatypeToString(second.datatype)}`,
      {iri: first.datatype, localName: '', prefix: ''}, '');
  } else if (type1.localName !== type2.localName || type1.prefix !== type2.prefix) {
    return failure(
      `Datatypes are not equal: ${datatypeToString(first.datatype)} != ` +
      `${datatypeToString(second.datatype)}`, type1, '');
  }
  return datatypeEqual(type1, first.value, second.value);
}

/**
 * Performs XSD datatype validation with additional constraints specified in params.
 */
function datatypeAllows(
  datatype: Datatype, data: string, params: Param[]): ValidationResult {
  /*
   * Date and duration checks
   */
  if (datatype.localName === 'date') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(dateRegExp, value, datatype, params);
  } else if (datatype.localName === 'dateTime') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(dateTimeRegExp, value, datatype, params);
  } else if (datatype.localName === 'gDay') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(gDayRegExp, value, datatype, params);
  } else if (datatype.localName === 'gMonth') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(gMonthRegExp, value, datatype, params);
  } else if (datatype.localName === 'gMonthDay') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(gMonthDayRegExp, value, datatype, params);
  } else if (datatype.localName === 'gYear') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(gYearRegExp, value, datatype, params);
  } else if (datatype.localName === 'gYearMonth') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(gYearMonthRegExp, value, datatype, params);
  } else if (datatype.localName === 'time') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(timeRegExp, value, datatype, params);
  } else if (datatype.localName === 'duration') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(durationRegExp, value, datatype, params);
  /*
   * Primitive types
   */
  } else if (datatype.localName === 'boolean') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(booleanRegExp, value, datatype, params);
  } else if (datatype.localName === 'base64Binary') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(base64BinaryRegExp, value, datatype, params);
  } else if (datatype.localName === 'hexBinary') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(hexBinaryRegExp, value, datatype, params);
  } else if (datatype.localName === 'float') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(doubleRegExp, value, datatype, params);
  } else if (datatype.localName === 'double') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(doubleRegExp, value, datatype, params);
  } else if (datatype.localName === 'anyURI') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(new RegExp(URI_PATTERN), value, datatype, params);
  /*
   * Types derived from string
   */
  } else if (datatype.localName === 'string' || datatype.localName === 'langString') {
    const value = whitespace(data, Whitespace.PRESERVE, params);
    return checkParams(value, datatype, params);
  } else if (datatype.localName === 'normalizedString') {
    const value = whitespace(data, Whitespace.PRESERVE, params);
    return checkRegExpAndParams(normalizedStringRegExp, value, datatype, params);
  } else if (datatype.localName === 'token') {
    const value = whitespace(data, Whitespace.PRESERVE, params);
    return checkRegExpAndParams(tokenRegExp, value, datatype, params);
  } else if (datatype.localName === 'language') {
    const value = whitespace(data, Whitespace.PRESERVE, params);
    return checkRegExpAndParams(languageRegExp, value, datatype, params);
  /*
   * Types derived from decimal
   */
  } else if (datatype.localName === 'decimal') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(decimalRegExp, value, datatype, params);
  } else if (datatype.localName === 'integer') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkRegExpAndParams(integerRegExp, value, datatype, params);
  } else if (datatype.localName === 'long') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(LONG_MIN, LONG_MAX, value, datatype, params);
  } else if (datatype.localName === 'int') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(INT_MIN, INT_MAX, value, datatype, params);
  } else if (datatype.localName === 'short') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(SHORT_MIN, SHORT_MAX, value, datatype, params);
  } else if (datatype.localName === 'byte') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(BYTE_MIN, BYTE_MAX, value, datatype, params);
  /*
   * Integer types
   */
  } else if (datatype.localName === 'negativeInteger') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(undefined, -1, value, datatype, params);
  } else if (datatype.localName === 'nonPositiveInteger') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(undefined, 0, value, datatype, params);
  } else if (datatype.localName === 'nonNegativeInteger') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(0, undefined, value, datatype, params);
  } else if (datatype.localName === 'positiveInteger') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(1, undefined, value, datatype, params);
  /*
   * Signed or unsigned numbers
   */
  } else if (datatype.localName === 'unsignedLong') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(0, UNSIGNED_LONG_MAX, value, datatype, params);
  } else if (datatype.localName === 'unsignedInt') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(0, UNSIGNED_INT_MAX, value, datatype, params);
  } else if (datatype.localName === 'unsignedShort') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(0, UNSIGNED_SHORT_MAX, value, datatype, params);
  } else if (datatype.localName === 'unsignedByte') {
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkIntegerRange(0, UNSIGNED_BYTE_MAX, value, datatype, params);
  } else {
    console.warn(`Unknown XSD datatype ${datatypeToString(datatype.iri)}`);
    const value = whitespace(data, Whitespace.COLLAPSE, params);
    return checkParams(value, datatype, params);
  }
}

/**
 * Performs equality comparison of two values of specified datatype.
 */
export function datatypeEqual(datatype: Datatype, first: string, second: string): ValidationResult {
  if (datatype.localName === 'boolean') {
    const value = whitespace(second, Whitespace.COLLAPSE);
    const patternValue = whitespace(first, Whitespace.COLLAPSE);
    if (value.toLowerCase() === patternValue.toLowerCase()) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else if (datatype.localName === 'float' || datatype.localName === 'double' || datatype.localName === 'decimal') {
    const value = parseFloat(second);
    const patternValue = parseFloat(first);
    if (value === patternValue) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else if (
    datatype.localName === 'integer' ||
    datatype.localName === 'long' ||
    datatype.localName === 'int' ||
    datatype.localName === 'short' ||
    datatype.localName === 'byte' ||
    datatype.localName === 'negativeInteger' ||
    datatype.localName === 'nonPositiveInteger' ||
    datatype.localName === 'nonNegativeInteger' ||
    datatype.localName === 'positiveInteger' ||
    datatype.localName === 'unsignedLong' ||
    datatype.localName === 'unsignedInt' ||
    datatype.localName === 'unsignedShort' ||
    datatype.localName === 'unsignedByte') {
    const value = parseInt(second);
    const patternValue = parseInt(first);
    if (value === patternValue) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else if (datatype.localName === 'anyURI') {
    const value = whitespace(second, Whitespace.COLLAPSE);
    const patternValue = whitespace(first, Whitespace.COLLAPSE);
    if (value === patternValue) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else if (
    datatype.localName === 'string' ||
    datatype.localName === 'normalizedString' ||
    datatype.localName === 'token' ||
    datatype.localName === 'language') {
    const value = whitespace(second, Whitespace.PRESERVE);
    const patternValue = whitespace(first, Whitespace.PRESERVE);
    if (value === patternValue) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else if (datatype.localName === 'base64Binary') {
    const value = second.replace(/ /g, '');
    const patternValue = first.replace(/ /g, '');
    if (value === patternValue) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else if (datatype.localName === 'hexBinary') {
    const value = whitespace(second, Whitespace.COLLAPSE);
    const patternValue = whitespace(first, Whitespace.COLLAPSE);
    // canonical representation of hexBinary prohibites lower case
    if (value.toUpperCase() === patternValue.toUpperCase()) {
      return success();
    } else {
      return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
    }
  } else {
    console.warn(`Unknown XSD datatype ${datatypeToString(datatype.iri)}`);
    return success();
  }
}

function whitespace(str: string, defaultWhitespace: Whitespace, params?: Param[]) {
  let wsParam = defaultWhitespace;
  if (params) {
    params.forEach(param => {
      if ('whitespace' in param) { wsParam = (param as any).whitespace; }
    });
  }
  if (wsParam === Whitespace.REPLACE) {
    return str.replace(/[\t\n\r]/g, ' ');
  } else if (wsParam === Whitespace.COLLAPSE) {
    const value = str.replace(/[\t\n\r ]+/g, ' ');
    // removes leading and trailing space
    return value.replace(/^ /, '').replace(/ $/, '');
  }
  return str;
}

function checkIntegerRange(
  min: number, max: number,
  str: string, datatype: Datatype, params: Param[]): ValidationResult {
  const checkInteger = checkRegExp(integerRegExp, str, datatype);
  if (!checkInteger.success) { return checkInteger; }
  const intValue = parseInt(str);
  // min can be undefined if condition is just inferior
  if (min !== undefined) {
    if (intValue < min) {
      return failure(
        'Integer value is too small, minimum is ' + min +
        ' for datatype ' + datatypeToString(datatype.iri), datatype, str);
    }
  }
  if (max !== undefined) {
    if (intValue > max) {
      return failure(
        'Integer value is too big, maximum is ' + max +
        ' for datatype ' + datatypeToString(datatype.iri), datatype, str);
    }
  }
  return checkParams(str, datatype, params);
}

function checkRegExpAndParams(regExp: RegExp, str: string, datatype: Datatype, params: Param[]): ValidationResult {
  const check = checkRegExp(regExp, str, datatype);
  if (!check.success) { return check; }
  return checkParams(str, datatype, params);
}

function checkRegExp(regExp: RegExp, str: string, datatype: Datatype): ValidationResult {
  if (regExp.test(str)) { return success(); }
  return failure(`Invalid ${datatypeToString(datatype.iri)}`, datatype, str);
}

function checkParams(str: string, datatype: Datatype, params: Param[]): ValidationResult {
  const enumeration: string[] = [];
  for (const param of params) {
    for (const paramName in param) {
      if (!param.hasOwnProperty(paramName)) { continue; }
      const paramValue = param[paramName] as any;
      // gathers enumerations before triggering it
      if (paramName === 'enumeration') {
        enumeration.push(paramValue);
      } else if (paramName !== 'whitespace') {
        const check = checkParam(str, paramName, paramValue, datatype);
        if (!check.success) { return check; }
      }
    }
  }
  if (enumeration.length > 0) {
    const check = checkEnumeration(str, enumeration, datatype);
    if (!check.success) { return check; }
  }
  return success();
}

function checkParam(str: string, paramName: string, paramValue: string, datatype: Datatype): ValidationResult {
  if (paramName === 'length') {
    const number = parseInt(paramValue, 10);
    if (str.length !== number) {
      return failure('Invalid number of characters, expected ' + number + ', found: ' + str.length, datatype, str);
    }
  } else if (paramName === 'minLength') {
    const number = parseInt(paramValue, 10);
    if (str.length < number) {
      return failure('String too small, ' + paramName + ' is ' + number + ', found: ' + str.length, datatype, str);
    }
  } else if (paramName === 'maxLength') {
    const number = parseInt(paramValue, 10);
    if (str.length > number) {
      return failure('String too long, ' + paramName + ' is ' + number + ', found: ' + str.length, datatype, str);
    }
  } else if (paramName === 'minInclusive') {
    const number = parseFloat(paramValue);
    const value = parseFloat(str);
    if (value < number) {
      return failure('Value too small, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
    }
  } else if (paramName === 'minExclusive') {
    const number = parseFloat(paramValue);
    const value = parseFloat(str);
    if (value <= number) {
      return failure('Value too small, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
    }
  } else if (paramName === 'maxInclusive') {
    const number = parseFloat(paramValue);
    const value = parseFloat(str);
    if (value > number) {
      return failure('Value too big, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
    }
  } else if (paramName === 'maxExclusive') {
    const number = parseFloat(paramValue);
    const value = parseFloat(str);
    if (value >= number) {
      return failure('Value too big, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
    }
  } else if (paramName === 'totalDigits') {
    const number = parseInt(paramValue, 10);
    const length = str.replace(/\./, '').length;
    if (length !== number) {
      return failure('Invalid number of digits, ' + paramName + ' is ' + number + ', found: ' + length, datatype, str);
    }
  } else if (paramName === 'fractionDigits') {
    const number = parseInt(paramValue, 10);
    const regExp = new RegExp(fractionDigits + '{' + number + '}$');
    const check = checkRegExp(regExp, str, datatype);
    // adds an error message
    if (!check.success) {
      return failure('Invalid number of fraction digits, expected: ' + number, check, str);
    }
  } else if (paramName === 'pattern') {
    const escaped = paramValue.replace(/\\/gm, '\\\\');
    const regExp = new RegExp('^' + escaped + '$');
    const check = checkRegExp(regExp, str, datatype);
    // adds an error message
    if (!check.success) {
      return failure(`Value ${str} does not respect pattern: ${paramValue}`, check, str);
    }
  }
  return success();
}

function checkEnumeration(str: string, enumeration: string[], datatype: Datatype): ValidationResult {
  for (let value of enumeration) {
    const escaped = escapeRegExp(value);
    const regExp = new RegExp('^' + escaped + '$');
    const check = checkRegExp(regExp, str, datatype);
    if (check.success) { return check; }
  }
  let msg = `Invalid value ${str}, must be one of [` + enumeration[0];
  for (let i = 1; i < enumeration.length; i++) {
    const value = enumeration[i];
    msg += ',' + value;
  }
  msg += ']';
  return failure(msg, datatype, str);
}

function escapeRegExp(str: string) {
  return str.replace(/\\/gm, '\\\\').replace(/([\f\b\n\t\r\[\^$|?*+(){}])/gm, '\\$1');
}
