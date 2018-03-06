"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_1(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('1) Find: Things acquired by Department of Greek and Roman Antiquities, British Museum', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Actor');
                yield s.setRelation('acquired by');
                yield s.typeRange('Department of Greek and Roman');
                yield s.selectRange('Department of Greek and Roman Antiquities, British Museum');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('1'));
            }));
        }));
    });
}
exports.test_1 = test_1;
//# sourceMappingURL=1.js.map