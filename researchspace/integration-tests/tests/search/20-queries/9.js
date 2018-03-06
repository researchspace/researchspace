"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_9(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('9) Find: Actors has met Year 800 AD - Year 1960 AD and is owner of Thing where Things has material type gold and created at Asia', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Actor');
                yield s.setRange('Time');
                yield s.setRelation('has met');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('800/AD', '1960/AD');
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Thing');
                yield s.setRelation('is owner of');
                yield s.startNestedSearch();
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('gol');
                yield s.toggleRangeNode('gold');
                yield s.submitRangeTree();
                yield s.getLastClause();
                const c3 = yield s.getLastClause();
                yield s.addAndClause(c3);
                yield s.setRange('Place');
                yield s.setRelation('created at');
                yield s.typeRange('asia');
                yield s.toggleRangeNode('Asia');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('9'));
            }));
        }));
    });
}
exports.test_9 = test_9;
//# sourceMappingURL=9.js.map