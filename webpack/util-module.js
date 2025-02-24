/**
 * This is a special module that is required for n3 dependency to work in the browser.
 * Because currently it relies on the 'util' module which is not available in the browser,
 * and polyfils for node modules were removed in webpack 5.
 * 
 * This hack can be removed when we upgrade n3, because the latest version doesn't have such issues.
 */
const inherits = require('inherits');
const util = {
    inherits: inherits
}

module.exports = util;