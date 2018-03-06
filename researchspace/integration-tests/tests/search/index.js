"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const index_1 = require("./20-queries/index");
const index_2 = require("./clipboard/index");
function searchTest(driver, t, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield index_1.search20Tests(driver, t, options);
        yield index_2.searchWithClipboard(driver, t, options);
    });
}
exports.searchTest = searchTest;
//# sourceMappingURL=index.js.map