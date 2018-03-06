"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_20(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield test.test('20) Find: Actors refers to Greece or Cyprus or Egypt and is owner of The Parthenon Sculptures and refers to Pericles', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Actor');
                yield s.setRange('Place');
                yield s.setRelation('refers to');
                yield s.typeRange('Greece');
                yield s.toggleRangeNode('Greece');
                yield s.submitRangeTree();
                const c1 = yield s.getLastClause();
                yield s.addOrClause(c1);
                yield s.typeRange('Cyprus');
                yield s.toggleRangeNode('Cyprus');
                yield s.submitRangeTree();
                yield s.addOrClause(c1);
                yield s.typeRange('Egypt');
                yield s.toggleRangeNode('Egypt');
                yield s.submitRangeTree();
                yield s.addAndClause(c1);
                yield s.setRange('Thing');
                yield s.setRelation('is owner of');
                yield s.typeRange('The Parthenon Sculptures');
                yield s.selectRange('The Parthenon Sculptures');
                const c2 = yield s.getLastClause();
                yield s.addOrClause(c2);
                yield s.typeRange('Minotaur');
                yield s.selectRange('Minotaur, gold (2011,4143.2)');
                yield s.addAndClause(c2);
                yield s.setRange('Actor');
                yield s.setRelation('refers to');
                yield s.typeRange('Pericles');
                yield s.selectRange('Pericles');
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/thesauri/nationality/British>',
                    '<http://collection.britishmuseum.org/id/thesauri/nationality/French>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/painter/draughtsman>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/politician/statesman>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/printmaker>'
                ]);
            }));
        }));
    });
}
exports.test_20 = test_20;
//# sourceMappingURL=20.js.map