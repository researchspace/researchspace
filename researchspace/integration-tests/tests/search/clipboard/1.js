"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const util_1 = require("../util");
const util_2 = require("../../util");
function test_1(driver, test, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const setName = 'Things Set';
        yield test.test('clipboard 1) Find: Actors is owner ofentities from set: Things Set', (t) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield util_1.testSearch(driver, t, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Thing');
                yield s.setRange('Actor');
                yield s.setRelation('acquired by');
                yield s.typeRange('Department of Greek and Roman');
                yield s.selectRange('Department of Greek and Roman Antiquities, British Museum');
                yield util_2.waitLoaders(driver);
                yield s.saveSet(setName);
            }));
            yield util_1.testSearch(driver, test, options, (s, d) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield s.setDomain('Actor');
                yield s.setRange('Thing');
                yield s.setRelation('is owner of');
                yield s.fillRangeFromSet(setName);
                const results = yield s.getSearchResults();
                yield util_2.sameSets(t, results, [
                    '<http://collection.britishmuseum.org/id/person-institution/104636>',
                    '<http://collection.britishmuseum.org/id/person-institution/114607>',
                    '<http://collection.britishmuseum.org/id/person-institution/115445>',
                    '<http://collection.britishmuseum.org/id/person-institution/171106>',
                    '<http://collection.britishmuseum.org/id/person-institution/182209>',
                    '<http://collection.britishmuseum.org/id/person-institution/58789>',
                    '<http://collection.britishmuseum.org/id/person-institution/64572>',
                    '<http://collection.britishmuseum.org/id/thesauri/department/C>',
                    '<http://collection.britishmuseum.org/id/thesauri/department/P>',
                    '<http://collection.britishmuseum.org/id/thesauri/nationality/American-USA>',
                    '<http://collection.britishmuseum.org/id/thesauri/nationality/British>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/academic/intellectual>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/collector>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/dealer/auction-house>',
                    '<http://collection.britishmuseum.org/id/thesauri/profession/institution/organisation>'
                ]);
                yield s.deleteSet(setName);
            }));
        }));
    });
}
exports.test_1 = test_1;
//# sourceMappingURL=1.js.map