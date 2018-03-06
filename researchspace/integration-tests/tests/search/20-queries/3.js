"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_3(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('3) Find: Things has part Thing where Things created at Europe and created on Year 1000 BC - Year 2016 AD', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Thing');
                yield s.setRelation('has part');
                yield s.startNestedSearch();
                yield s.setRange('Place');
                yield s.setRelation('created at');
                yield s.typeRange('Europe');
                yield s.toggleRangeNode('Europe');
                yield s.submitRangeTree();
                yield s.getLastClause();
                const c2 = yield s.getLastClause();
                yield s.addAndClause(c2);
                yield s.setRange('Time');
                yield s.setRelation('created on');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('1000/BC', '2016/AD');
                const expectedResult = 4071;
                const resultNumber = yield s.getNumResults();
                yield t.equal(expectedResult, resultNumber, 'correct number of intermediate results');
                yield s.showFacet();
                const rel = yield s.openFacetRelation('has technique type');
                yield s.clickFacetCheckbox(rel, 'pierced');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('3'));
            }));
        }));
    });
}
exports.test_3 = test_3;
//# sourceMappingURL=3.js.map