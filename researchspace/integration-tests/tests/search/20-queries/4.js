"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_4(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('4) Find: Events from Asia and created Thing where Things has material type gold or silver and found or acquired at China', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Event');
                yield s.setRange('Place');
                yield s.setRelation('from');
                yield s.typeRange('Asia');
                yield s.toggleRangeNode('Asia');
                yield s.submitRangeTree();
                const c1 = yield s.getLastClause();
                yield s.addAndClause(c1);
                yield s.setRange('Thing');
                yield s.setRelation('created');
                yield s.startNestedSearch();
                yield s.setRange('Concept');
                yield s.setRelation('has material type');
                yield s.typeRange('gol');
                yield s.toggleRangeNode('gold');
                yield s.submitRangeTree();
                yield s.getLastClause();
                const c3 = yield s.getLastClause();
                yield s.addOrClause(c3);
                yield s.typeRange('silve');
                yield s.toggleRangeNode('silver');
                yield s.submitRangeTree();
                yield s.addAndClause(c3);
                yield s.setRange('Place');
                yield s.setRelation('found or acquired at');
                yield s.typeRange('China');
                yield s.toggleRangeNode('China');
                yield s.submitRangeTree();
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, yield d.readData('4'));
            }));
        }));
    });
}
exports.test_4 = test_4;
//# sourceMappingURL=4.js.map