"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_8(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('8) Find: Things created inProduction of Dead. Positively dead, paper (1868,0808.5792)', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Event');
                yield s.setRelation('created in');
                yield s.typeRange('production of dead positively');
                yield s.selectRange('Production of Dead. Positively dead, paper (1868,0808.5792)');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, ['<http://collection.britishmuseum.org/id/object/PPA77219>']);
            }));
        }));
    });
}
exports.test_8 = test_8;
//# sourceMappingURL=8.js.map