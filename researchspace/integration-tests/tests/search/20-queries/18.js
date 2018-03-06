"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_18(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('18) Find: Things created on Year 800 BC - Year 300 BC and created at Greece and refers to Birth of Athena and has material type pottery', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Time');
                yield s.setRelation('created on');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('800/BC', '300/BC');
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Place');
                yield s.setRelation('created at');
                yield s.typeRange('greece');
                yield s.toggleRangeNode('Greece');
                yield s.submitRangeTree();
                const c2 = yield s.getLastClause();
                yield s.addAndClause(c2);
                yield s.setRange('Event');
                yield s.setRelation('refers to');
                yield s.typeRange('birth of athena');
                yield s.selectRange('Birth of Athena');
                const c3 = yield s.getLastClause();
                yield s.addAndClause(c3);
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('pottery');
                yield s.toggleRangeNode('pottery');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/object/GAA7253>'
                ]);
            }));
        }));
    });
}
exports.test_18 = test_18;
//# sourceMappingURL=18.js.map