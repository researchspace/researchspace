"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webdriver = require("selenium-webdriver");
exports.name = 'firefox';
function createDriver() {
    return new webdriver.Builder().forBrowser('firefox').build();
}
exports.createDriver = createDriver;
//# sourceMappingURL=firefox.js.map