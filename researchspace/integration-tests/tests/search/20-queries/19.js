"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_19(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('19) Find: Things refers to Year 200 AD - Year 800 AD and has material type organic or Concept where Concepts is type of Death or Birthday and is type of Europe', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Time');
                yield s.setRelation('refers to');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('200/AD', '800/AD');
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('organic');
                yield s.toggleRangeNode('organic');
                yield s.submitRangeTree();
                const c2 = yield s.getLastClause();
                yield s.addOrClause(c2);
                yield s.startNestedSearch();
                yield s.setRange('Event');
                yield s.setRelation('is type of');
                yield s.typeRange('death');
                yield s.selectRange('Death');
                const c3 = yield s.getLastClause();
                yield s.addOrClause(c3);
                yield s.typeRange('birthday');
                yield s.selectRange('Birthday');
                yield s.addAndClause(c3);
                yield s.setRange('Place');
                yield s.setRelation('is type of');
                yield s.typeRange('europe');
                yield s.toggleRangeNode('Europe');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('19'));
            }));
        }));
    });
}
exports.test_19 = test_19;
//# sourceMappingURL=19.js.map