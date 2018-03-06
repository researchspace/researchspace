"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chrome = require("./targets/chrome");
const browser_stack_1 = require("./targets/browser-stack");
const targets = {};
targets['local'] = {
    options: {
        dataset: 'bm',
        loginUrl: 'http://localhost:10214/login',
        searchUrl: 'http://localhost:10214/resource/rsp:Search',
        username: process.env.RS_DEVELOP_USERNAME || 'admin',
        password: process.env.RS_DEVELOP_PASSWORD || 'admin'
    },
    targets: [chrome]
};
targets['development-local'] = {
    options: {
        dataset: 'bm',
        searchUrl: 'https://development.researchspace.org/resource/Start',
        noLogin: true
    },
    targets: [chrome]
};
targets['jenkins'] = {
    options: {
        dataset: 'bm',
        loginUrl: 'https://development.researchspace.org/login',
        searchUrl: 'https://development.researchspace.org/resource/Start',
        username: process.env.RS_DEVELOP_USERNAME || 'admin',
        password: process.env.RS_DEVELOP_PASSWORD || 'admin'
    },
    targets: [
        browser_stack_1.windows('Firefox'),
        browser_stack_1.windows('Chrome'),
        browser_stack_1.windows('Edge'),
        browser_stack_1.osx('Firefox'),
        browser_stack_1.osx('Chrome')
    ].map(browser_stack_1.browserStack)
};
function getTargets(machine) {
    return targets[machine];
}
exports.getTargets = getTargets;
//# sourceMappingURL=machines.js.map