Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var utils_1 = require("platform/components/utils");
var value = 'bar';
var namespace = 'test';
describe('LocalPersistence', function () {
    it('can save value', function () {
        chai_1.expect(utils_1.BrowserPersistence).to.respondTo('setItem');
    });
    it('can read value', function () {
        chai_1.expect(utils_1.BrowserPersistence).to.respondTo('getItem');
        utils_1.BrowserPersistence.setItem('foo', value, namespace);
        chai_1.expect(utils_1.BrowserPersistence.getItem('foo', namespace)).to.be.eql(value);
    });
    it('can clear values', function () {
        chai_1.expect(utils_1.BrowserPersistence).to.respondTo('removeItem');
        utils_1.BrowserPersistence.setItem('foo', value, namespace);
        utils_1.BrowserPersistence.removeItem('foo', namespace);
        chai_1.expect(utils_1.BrowserPersistence.getItem('foo', namespace)).to.be.null;
    });
});
