"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_14(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('14) Find: Things refers to Death of Chatham or Death or English History and "duke"', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Event');
                yield s.setRelation('refers to');
                yield s.typeRange('death of chath');
                yield s.selectRange('Death of Chatham');
                const c1 = yield s.getLastClause();
                yield s.addOrClause(c1);
                yield s.typeRange('death');
                yield s.selectRange('Death');
                yield s.addOrClause(c1);
                yield s.typeRange('english history');
                yield s.selectRange('English History');
                yield s.addAndClause(c1);
                yield s.setRange('Text search');
                yield s.typeTextRange('duke');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/object/PDB8162>',
                    '<http://collection.britishmuseum.org/id/object/PDB8162/inscription/1>',
                    '<http://collection.britishmuseum.org/id/object/PDB8395>'
                ]);
            }));
        }));
    });
}
exports.test_14 = test_14;
//# sourceMappingURL=14.js.map