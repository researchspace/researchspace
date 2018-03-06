"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_6(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('6) Find: Concepts has broader gold', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Concept');
                yield s.setRange('Concept');
                yield s.setRelation('has broader');
                yield s.typeRange('gold');
                yield s.toggleRangeNode('gold');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, ['thes:x114734']);
            }));
        }));
    });
}
exports.test_6 = test_6;
//# sourceMappingURL=6.js.map