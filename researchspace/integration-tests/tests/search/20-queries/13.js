"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_13(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('13) Find: Things found by archaeologist and from Europe and created on Year 2000 BC - Year 100 AD and has material type organic', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Actor');
                yield s.setRelation('found by');
                yield s.typeRange('archaeo');
                yield s.selectRange('archaeologist');
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Place');
                yield s.setRelation('from');
                yield s.typeRange('europe');
                yield s.toggleRangeNode('Europe');
                yield s.submitRangeTree();
                const c2 = yield s.getLastClause();
                yield s.addAndClause(c2);
                yield s.setRange('Time');
                yield s.setRelation('created on');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('2000/BC', '100/AD');
                const c3 = yield s.getLastClause();
                yield s.addAndClause(c3);
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('organic');
                yield s.toggleRangeNode('organic');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('13'));
            }));
        }));
    });
}
exports.test_13 = test_13;
//# sourceMappingURL=13.js.map