Object.defineProperty(exports, "__esModule", { value: true });
var Rdf = require("./Rdf");
var rdf_1 = require("../vocabularies/rdf");
var xsd_1 = require("../vocabularies/xsd");
var languageRegExp = new RegExp('^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*$');
var whitespaceChar = '\t\n\r';
var normalizedStringRegExp = new RegExp('^[^' + whitespaceChar + ']*$');
var tokenRegExp = new RegExp('^([^' + whitespaceChar + ' ](?!.*  )([^' + whitespaceChar + ']*[^' + whitespaceChar + ' ])?)?$');
var year = '-?([1-9][0-9]*)?[0-9]{4}';
var month = '[0-9]{2}';
var dayOfMonth = '[0-9]{2}';
var time = '[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]*)?';
var timeZone = '(Z|[\-\+][0-9][0-9]:[0-5][0-9])?';
var dateRegExp = new RegExp('^' + year + '-' + month + '-' + dayOfMonth + timeZone + '$');
var dateTimeRegExp = new RegExp('^' + year + '-' + month + '-' + dayOfMonth + 'T' + time + timeZone + '$');
var durationRegExp = new RegExp('^' + '-?P(?!$)([0-9]+Y)?([0-9]+M)?([0-9]+D)?(T(?!$)([0-9]+H)?([0-9]+M)?([0-9]+(\\.[0-9]+)?S)?)?$');
var gDayRegExp = new RegExp('^' + '---' + dayOfMonth + timeZone + '$');
var gMonthRegExp = new RegExp('^' + '--' + month + timeZone + '$');
var gMonthDayRegExp = new RegExp('^' + '--' + month + '-' + dayOfMonth + timeZone + '$');
var gYearRegExp = new RegExp('^' + year + timeZone + '$');
var gYearMonthRegExp = new RegExp('^' + year + '-' + month + timeZone + '$');
var timeRegExp = new RegExp('^' + time + timeZone + '$');
var LONG_MAX = 9223372036854775807;
var LONG_MIN = -9223372036854775808;
var INT_MAX = 2147483647;
var INT_MIN = -2147483648;
var SHORT_MAX = 32767;
var SHORT_MIN = -32768;
var BYTE_MAX = 127;
var BYTE_MIN = -128;
var UNSIGNED_LONG_MAX = 18446744073709551615;
var UNSIGNED_INT_MAX = 4294967295;
var UNSIGNED_SHORT_MAX = 65535;
var UNSIGNED_BYTE_MAX = 255;
var integer = '[\-\+]?[0-9]+';
var integerRegExp = new RegExp('^' + integer + '$');
var decimal = '[\-\+]?(?!$)[0-9]*(\\.[0-9]*)?';
var decimalRegExp = new RegExp('^' + decimal + '$');
var b64 = '[A-Za-z0-9+/]';
var b16 = '[AEIMQUYcgkosw048]';
var b04 = '[AQgw]';
var b04S = '(' + b04 + ' ?)';
var b16S = '(' + b16 + ' ?)';
var b64S = '(' + b64 + ' ?)';
var base64BinaryRegExp = new RegExp('^((' + b64S + '{4})*((' + b64S + '{3}' + b64 + ')|(' + b64S + '{2}' + b16S + '=)|(' + b64S + b04S + '= ?=)))?$');
var booleanRegExp = new RegExp('(^true$)|(^false$)|(^0$)|(^1$)', 'i');
var doubleRegExp = new RegExp('(^-?INF$)|(^NaN$)|(^' + decimal + '([Ee]' + integer + ')?$)');
var hexBinaryRegExp = new RegExp('^' + '[0-9a-fA-F]*' + '$');
var fractionDigits = '\\.[0-9]';
var URI_PATTERN = "^(([a-zA-Z][0-9a-zA-Z+\\-.]*:)?/{0,2}[0-9a-zA-Z;/?:@&=+$.\\-_!~*'()%]+)?(#[0-9a-zA-Z;/?:@&=+$.\\-_!~*'()%]+)?$";
var Whitespace;
(function (Whitespace) {
    Whitespace[Whitespace["PRESERVE"] = 0] = "PRESERVE";
    Whitespace[Whitespace["REPLACE"] = 1] = "REPLACE";
    Whitespace[Whitespace["COLLAPSE"] = 2] = "COLLAPSE";
})(Whitespace || (Whitespace = {}));
function success() {
    return { success: true };
}
function failure(message, child, errorPart) {
    return { success: false, message: message, child: child, errorPart: errorPart };
}
function parseXsdDatatype(datatype) {
    var datatypeIri;
    if (typeof datatype === 'string') {
        datatypeIri = Rdf.iri(datatype
            .replace(/^xsd:(.*)$/, xsd_1.default._NAMESPACE + "$1")
            .replace(/^rdf:(.*)$/, rdf_1.default._NAMESPACE + "$1"));
    }
    else {
        datatypeIri = datatype;
    }
    var parts = datatypeIri.value.split('#');
    if (parts.length === 2) {
        var ns = parts[0] + '#';
        if (ns === xsd_1.default._NAMESPACE || ns === xsd_1.default._DATATYPES_NAMESPACE) {
            return { iri: datatypeIri, prefix: 'xsd', localName: parts[1] };
        }
        else if (ns === rdf_1.default._NAMESPACE) {
            return { iri: datatypeIri, prefix: 'rdf', localName: parts[1] };
        }
    }
    return undefined;
}
exports.parseXsdDatatype = parseXsdDatatype;
function replaceDatatypeAliases(datatype) {
    var xsdDatatype = parseXsdDatatype(datatype);
    return xsdDatatype ? Rdf.iri(xsd_1.default._NAMESPACE + xsdDatatype.localName) : datatype;
}
exports.replaceDatatypeAliases = replaceDatatypeAliases;
function sameXsdDatatype(datatype1, datatype2) {
    var type1 = parseXsdDatatype(datatype1);
    var type2 = parseXsdDatatype(datatype2);
    if (type1 && type2) {
        return type1.localName === type2.localName;
    }
    else {
        return datatype1.equals(datatype2);
    }
}
exports.sameXsdDatatype = sameXsdDatatype;
function datatypeToString(datatype) {
    var type = parseXsdDatatype(datatype);
    return type ? type.prefix + ":" + type.localName : datatype.value;
}
exports.datatypeToString = datatypeToString;
function validate(literal, params) {
    var datatype = parseXsdDatatype(literal.dataType);
    if (!datatype) {
        return failure("Unknown XSD datatype " + datatypeToString(literal.dataType), { iri: literal.dataType, localName: '', prefix: '' }, '');
    }
    if (!params) {
        params = [];
    }
    return datatypeAllows(datatype, literal.value, params);
}
exports.validate = validate;
function equal(first, second) {
    var type1 = parseXsdDatatype(first.dataType);
    var type2 = parseXsdDatatype(second.dataType);
    if (!type1) {
        return failure("Unknown XSD datatype " + datatypeToString(first.dataType), { iri: first.dataType, localName: '', prefix: '' }, '');
    }
    else if (!type2) {
        return failure("Unknown XSD datatype " + datatypeToString(second.dataType), { iri: first.dataType, localName: '', prefix: '' }, '');
    }
    else if (type1.localName !== type2.localName || type1.prefix !== type2.prefix) {
        return failure("Datatypes are not equal: " + datatypeToString(first.dataType) + " != " +
            ("" + datatypeToString(second.dataType)), type1, '');
    }
    return datatypeEqual(type1, first.value, second.value);
}
exports.equal = equal;
function datatypeAllows(datatype, data, params) {
    if (datatype.localName === 'date') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(dateRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'dateTime') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(dateTimeRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'gDay') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(gDayRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'gMonth') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(gMonthRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'gMonthDay') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(gMonthDayRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'gYear') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(gYearRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'gYearMonth') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(gYearMonthRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'time') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(timeRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'duration') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(durationRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'boolean') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(booleanRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'base64Binary') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(base64BinaryRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'hexBinary') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(hexBinaryRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'float') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(doubleRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'double') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(doubleRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'anyURI') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(new RegExp(URI_PATTERN), value, datatype, params);
    }
    else if (datatype.localName === 'string' || datatype.localName === 'langString') {
        var value = whitespace(data, Whitespace.PRESERVE, params);
        return checkParams(value, datatype, params);
    }
    else if (datatype.localName === 'normalizedString') {
        var value = whitespace(data, Whitespace.PRESERVE, params);
        return checkRegExpAndParams(normalizedStringRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'token') {
        var value = whitespace(data, Whitespace.PRESERVE, params);
        return checkRegExpAndParams(tokenRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'language') {
        var value = whitespace(data, Whitespace.PRESERVE, params);
        return checkRegExpAndParams(languageRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'decimal') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(decimalRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'integer') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkRegExpAndParams(integerRegExp, value, datatype, params);
    }
    else if (datatype.localName === 'long') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(LONG_MIN, LONG_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'int') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(INT_MIN, INT_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'short') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(SHORT_MIN, SHORT_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'byte') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(BYTE_MIN, BYTE_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'negativeInteger') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(undefined, -1, value, datatype, params);
    }
    else if (datatype.localName === 'nonPositiveInteger') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(undefined, 0, value, datatype, params);
    }
    else if (datatype.localName === 'nonNegativeInteger') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(0, undefined, value, datatype, params);
    }
    else if (datatype.localName === 'positiveInteger') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(1, undefined, value, datatype, params);
    }
    else if (datatype.localName === 'unsignedLong') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(0, UNSIGNED_LONG_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'unsignedInt') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(0, UNSIGNED_INT_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'unsignedShort') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(0, UNSIGNED_SHORT_MAX, value, datatype, params);
    }
    else if (datatype.localName === 'unsignedByte') {
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkIntegerRange(0, UNSIGNED_BYTE_MAX, value, datatype, params);
    }
    else {
        console.warn("Unknown XSD datatype " + datatypeToString(datatype.iri));
        var value = whitespace(data, Whitespace.COLLAPSE, params);
        return checkParams(value, datatype, params);
    }
}
function datatypeEqual(datatype, first, second) {
    if (datatype.localName === 'boolean') {
        var value = whitespace(second, Whitespace.COLLAPSE);
        var patternValue = whitespace(first, Whitespace.COLLAPSE);
        if (value.toLowerCase() === patternValue.toLowerCase()) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else if (datatype.localName === 'float' || datatype.localName === 'double' || datatype.localName === 'decimal') {
        var value = parseFloat(second);
        var patternValue = parseFloat(first);
        if (value === patternValue) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else if (datatype.localName === 'integer' ||
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
        var value = parseInt(second);
        var patternValue = parseInt(first);
        if (value === patternValue) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else if (datatype.localName === 'anyURI') {
        var value = whitespace(second, Whitespace.COLLAPSE);
        var patternValue = whitespace(first, Whitespace.COLLAPSE);
        if (value === patternValue) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else if (datatype.localName === 'string' ||
        datatype.localName === 'normalizedString' ||
        datatype.localName === 'token' ||
        datatype.localName === 'language') {
        var value = whitespace(second, Whitespace.PRESERVE);
        var patternValue = whitespace(first, Whitespace.PRESERVE);
        if (value === patternValue) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else if (datatype.localName === 'base64Binary') {
        var value = second.replace(/ /g, '');
        var patternValue = first.replace(/ /g, '');
        if (value === patternValue) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else if (datatype.localName === 'hexBinary') {
        var value = whitespace(second, Whitespace.COLLAPSE);
        var patternValue = whitespace(first, Whitespace.COLLAPSE);
        if (value.toUpperCase() === patternValue.toUpperCase()) {
            return success();
        }
        else {
            return failure('Invalid value, expected is [' + patternValue + ']', datatype, second);
        }
    }
    else {
        console.warn("Unknown XSD datatype " + datatypeToString(datatype.iri));
        return success();
    }
}
exports.datatypeEqual = datatypeEqual;
function whitespace(str, defaultWhitespace, params) {
    var wsParam = defaultWhitespace;
    if (params) {
        params.forEach(function (param) {
            if ('whitespace' in param) {
                wsParam = param.whitespace;
            }
        });
    }
    if (wsParam === Whitespace.REPLACE) {
        return str.replace(/[\t\n\r]/g, ' ');
    }
    else if (wsParam === Whitespace.COLLAPSE) {
        var value = str.replace(/[\t\n\r ]+/g, ' ');
        return value.replace(/^ /, '').replace(/ $/, '');
    }
    return str;
}
function checkIntegerRange(min, max, str, datatype, params) {
    var checkInteger = checkRegExp(integerRegExp, str, datatype);
    if (!checkInteger.success) {
        return checkInteger;
    }
    var intValue = parseInt(str);
    if (min !== undefined) {
        if (intValue < min) {
            return failure('Integer value is too small, minimum is ' + min +
                ' for datatype ' + datatypeToString(datatype.iri), datatype, str);
        }
    }
    if (max !== undefined) {
        if (intValue > max) {
            return failure('Integer value is too big, maximum is ' + max +
                ' for datatype ' + datatypeToString(datatype.iri), datatype, str);
        }
    }
    return checkParams(str, datatype, params);
}
function checkRegExpAndParams(regExp, str, datatype, params) {
    var check = checkRegExp(regExp, str, datatype);
    if (!check.success) {
        return check;
    }
    return checkParams(str, datatype, params);
}
function checkRegExp(regExp, str, datatype) {
    if (regExp.test(str)) {
        return success();
    }
    return failure("Invalid " + datatypeToString(datatype.iri), datatype, str);
}
function checkParams(str, datatype, params) {
    var enumeration = [];
    for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
        var param = params_1[_i];
        for (var paramName in param) {
            if (!param.hasOwnProperty(paramName)) {
                continue;
            }
            var paramValue = param[paramName];
            if (paramName === 'enumeration') {
                enumeration.push(paramValue);
            }
            else if (paramName !== 'whitespace') {
                var check = checkParam(str, paramName, paramValue, datatype);
                if (!check.success) {
                    return check;
                }
            }
        }
    }
    if (enumeration.length > 0) {
        var check = checkEnumeration(str, enumeration, datatype);
        if (!check.success) {
            return check;
        }
    }
    return success();
}
function checkParam(str, paramName, paramValue, datatype) {
    if (paramName === 'length') {
        var number = parseInt(paramValue, 10);
        if (str.length !== number) {
            return failure('Invalid number of characters, expected ' + number + ', found: ' + str.length, datatype, str);
        }
    }
    else if (paramName === 'minLength') {
        var number = parseInt(paramValue, 10);
        if (str.length < number) {
            return failure('String too small, ' + paramName + ' is ' + number + ', found: ' + str.length, datatype, str);
        }
    }
    else if (paramName === 'maxLength') {
        var number = parseInt(paramValue, 10);
        if (str.length > number) {
            return failure('String too long, ' + paramName + ' is ' + number + ', found: ' + str.length, datatype, str);
        }
    }
    else if (paramName === 'minInclusive') {
        var number = parseFloat(paramValue);
        var value = parseFloat(str);
        if (value < number) {
            return failure('Value too small, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
        }
    }
    else if (paramName === 'minExclusive') {
        var number = parseFloat(paramValue);
        var value = parseFloat(str);
        if (value <= number) {
            return failure('Value too small, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
        }
    }
    else if (paramName === 'maxInclusive') {
        var number = parseFloat(paramValue);
        var value = parseFloat(str);
        if (value > number) {
            return failure('Value too big, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
        }
    }
    else if (paramName === 'maxExclusive') {
        var number = parseFloat(paramValue);
        var value = parseFloat(str);
        if (value >= number) {
            return failure('Value too big, ' + paramName + ' is ' + number + ', found: ' + value, datatype, str);
        }
    }
    else if (paramName === 'totalDigits') {
        var number = parseInt(paramValue, 10);
        var length_1 = str.replace(/\./, '').length;
        if (length_1 !== number) {
            return failure('Invalid number of digits, ' + paramName + ' is ' + number + ', found: ' + length_1, datatype, str);
        }
    }
    else if (paramName === 'fractionDigits') {
        var number = parseInt(paramValue, 10);
        var regExp = new RegExp(fractionDigits + '{' + number + '}$');
        var check = checkRegExp(regExp, str, datatype);
        if (!check.success) {
            return failure('Invalid number of fraction digits, expected: ' + number, check, str);
        }
    }
    else if (paramName === 'pattern') {
        var escaped = paramValue.replace(/\\/gm, '\\\\');
        var regExp = new RegExp('^' + escaped + '$');
        var check = checkRegExp(regExp, str, datatype);
        if (!check.success) {
            return failure("Value " + str + " does not respect pattern: " + paramValue, check, str);
        }
    }
    return success();
}
function checkEnumeration(str, enumeration, datatype) {
    for (var _i = 0, enumeration_1 = enumeration; _i < enumeration_1.length; _i++) {
        var value = enumeration_1[_i];
        var escaped = escapeRegExp(value);
        var regExp = new RegExp('^' + escaped + '$');
        var check = checkRegExp(regExp, str, datatype);
        if (check.success) {
            return check;
        }
    }
    var msg = "Invalid value " + str + ", must be one of [" + enumeration[0];
    for (var i = 1; i < enumeration.length; i++) {
        var value = enumeration[i];
        msg += ',' + value;
    }
    msg += ']';
    return failure(msg, datatype, str);
}
function escapeRegExp(str) {
    return str.replace(/\\/gm, '\\\\').replace(/([\f\b\n\t\r\[\^$|?*+(){}])/gm, '\\$1');
}
