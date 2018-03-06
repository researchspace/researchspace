"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_17(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('17) Find: Things has material type marble and created on Year 700 BC - Year 100 BC and created at Greece and "kouros"', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('marble');
                yield s.toggleRangeNode('marble');
                yield s.submitRangeTree();
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Time');
                yield s.setRelation('created on');
                yield s.setDateFormat('YearRange');
                yield s.setYearRange('700/BC', '100/BC');
                const c2 = yield s.getLastClause();
                yield s.addAndClause(c2);
                yield s.setRange('Place');
                yield s.setRelation('created at');
                yield s.typeRange('greece');
                yield s.toggleRangeNode('Greece');
                yield s.submitRangeTree();
                const c3 = yield s.getLastClause();
                yield s.addAndClause(c3);
                yield s.setRange('Text search');
                yield s.typeTextRange('kouros');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/object/GAA3387>',
                    '<http://collection.britishmuseum.org/id/object/GAA5829>'
                ]);
            }));
        }));
    });
}
exports.test_17 = test_17;
//# sourceMappingURL=17.js.map