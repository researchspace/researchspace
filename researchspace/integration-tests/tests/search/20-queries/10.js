"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_10(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('10) Find: Things has type Egyptian hierogylphic and from Egypt', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Concept');
                yield s.setRelation('has type');
                yield s.typeRange('egyptian');
                yield s.toggleRangeNode('Egyptian hierogylphic');
                yield s.submitRangeTree();
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Place');
                yield s.setRelation('from');
                yield s.typeRange('egypt');
                yield s.toggleRangeNode('Egypt');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/object/GAA53407/inscription/1>',
                    '<http://collection.britishmuseum.org/id/object/GAA59639/inscription/1>'
                ]);
            }));
        }));
    });
}
exports.test_10 = test_10;
//# sourceMappingURL=10.js.map