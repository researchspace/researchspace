"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_15(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('15) Find: Actors refers to USSR or Russia Europe and performed action at Year 1700 AD - Year 2000 AD', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Actor');
                yield s.setRange('Place');
                yield s.setRelation('refers to');
                yield s.typeRange('ussr');
                yield s.toggleRangeNode('USSR');
                yield s.submitRangeTree();
                const c1 = yield s.getLastClause();
                yield s.addOrClause(c1);
                yield s.typeRange('russia');
                yield s.toggleRangeNode('Russia Europe');
                yield s.submitRangeTree();
                yield s.addAndClause(c1);
                yield s.setRange('Time');
                yield s.setRelation('performed action at');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('1700/AD', '2000/AD');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('15'));
            }));
        }));
    });
}
exports.test_15 = test_15;
//# sourceMappingURL=15.js.map