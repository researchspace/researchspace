"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_2(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('2) Find: Actors is owner of Thing where things created at Africa', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Actor');
                yield s.setRange('Thing');
                yield s.setRelation('is owner of');
                yield s.startNestedSearch();
                yield s.setRange('Place');
                yield s.setRelation('created at');
                yield s.typeRange('Africa');
                yield s.toggleRangeNode('Africa');
                yield s.submitRangeTree();
                const expectedResult = 2191;
                const resultNumber = yield s.getNumResults();
                yield t.equal(expectedResult, resultNumber, 'correct number of intermediate results');
                yield s.showFacet();
                const rel = yield s.openFacetRelation('is member of');
                yield s.clickFacetCheckbox(rel, 'Factory of Garrard, Robert');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/person-institution/70138>'
                ]);
            }));
        }));
    });
}
exports.test_2 = test_2;
//# sourceMappingURL=2.js.map