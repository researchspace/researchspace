"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_11(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('11) Find: Things has material type metal and created on Year 100 BC - Year 500 AD and created at Greece and has type coin', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('metal');
                yield s.toggleRangeNode('metal');
                yield s.submitRangeTree();
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Time');
                yield s.setRelation('created on');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('100/BC', '500/AD');
                const c2 = yield s.getLastClause();
                yield s.addAndClause(c2);
                yield s.setRange('Place');
                yield s.setRelation('created at');
                yield s.typeRange('greece');
                yield s.toggleRangeNode('Greece');
                yield s.submitRangeTree();
                const c3 = yield s.getLastClause();
                yield s.addAndClause(c3);
                yield s.setRange('Concept');
                yield s.setRelation('has type');
                yield s.typeRange('coin');
                yield s.toggleRangeNode('coin');
                yield s.submitRangeTree();
                const expectedResult = 4478;
                const resultNumber = yield s.getNumResults();
                yield t.equal(expectedResult, resultNumber, 'correct number of intermediate results');
                yield s.showFacet();
                const rel = yield s.openFacetRelation('found or acquired at');
                yield s.clickFacetCheckbox(rel, 'British Isles');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('11'));
            }));
        }));
    });
}
exports.test_11 = test_11;
//# sourceMappingURL=11.js.map