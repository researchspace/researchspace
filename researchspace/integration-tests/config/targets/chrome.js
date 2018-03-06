"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const selenium_webdriver_1 = require("selenium-webdriver");
exports.name = 'chrome';
function createDriver() {
    return new selenium_webdriver_1.Builder().forBrowser('chrome').build();
}
exports.createDriver = createDriver;
//# sourceMappingURL=chrome.js.map