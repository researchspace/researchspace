/**
 * This is a special module that is required for html-to-react dependency to work with webpack 5.
 *
 * punycode library has two dist files one for old commonjs style exports one for ESM. webpack 4 used commonjs one, webpack 5 is using ESM one by default.
 *
 * The problem is that exports structured slightly differently in the ESM one, so to make sure that old code works correctly we need to reconstruct commonjs style exports.
 *
 */
import * as punycode from 'punycode/punycode.es6';
let { decode, encode, toASCII, toUnicode, ucs2decode, ucs2encode } = punycode;
let { ucs2 } = punycode.default;
export { decode, encode, toASCII, toUnicode, ucs2decode, ucs2encode, ucs2 };

