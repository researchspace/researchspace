"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webdriver = require("selenium-webdriver");
const _ = require("lodash");
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
exports.windows = (browser, version) => Object.assign({
    os: 'WINDOWS',
    os_version: '10',
    browserName: browser,
}, browserOptions(browser));
exports.osx = (browser) => Object.assign({
    os: 'osx',
    os_version: 'Sierra',
    browserName: browser,
}, browserOptions(browser));
function browserOptions(browser) {
    switch (browser) {
        case 'Firefox':
            return {
                browser_version: '47'
            };
        case 'Chrome':
            return {
                'chromeOptions': {
                    'args': ['--start-fullscreen']
                }
            };
    }
}
function browserStack(settings) {
    return {
        name: settings['browserName'],
        createDriver: () => new webdriver.Builder()
            .usingServer('http://hub-cloud.browserstack.com/wd/hub')
            .withCapabilities(_.assign({}, settings, {
            'browserstack.user': username,
            'browserstack.key': accessKey,
            'resolution': '1920x1080',
        }))
            .build()
    };
}
exports.browserStack = browserStack;
//# sourceMappingURL=browser-stack.js.map