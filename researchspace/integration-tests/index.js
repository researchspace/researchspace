"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const t = require("tap");
require('selenium-webdriver/lib/promise').USE_PROMISE_MANAGER = false;
const machines_1 = require("./config/machines");
const search_1 = require("./tests/search");
const util_1 = require("./tests/util");
(function () {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const machine = process.argv.length >= 3 && process.argv[2] || 'local';
        const { targets, options } = machines_1.getTargets(machine);
        for (let { name, createDriver } of targets) {
            yield t.test(name, (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const driver = createDriver();
                yield driver.manage().window().maximize();
                if (!options.noLogin) {
                    yield util_1.authorize(driver, t, options.loginUrl || "", options.username || "", options.password || "");
                }
                yield search_1.searchTest(driver, t, options);
                yield driver.quit();
            }));
        }
    });
})();
//# sourceMappingURL=index.js.map