Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var json_1 = require("platform/api/json");
describe('instance to json serialization', function () {
    describe('plain javascirpt objects serialization', function () {
        it('keeps number unchanged', function () {
            var num = 1;
            chai_1.expect(json_1.deserialize(json_1.serialize(num))).to.be.equals(num);
        });
        it('keeps string unchanged', function () {
            var str = 'test';
            chai_1.expect(json_1.deserialize(json_1.serialize(str))).to.be.equals(str);
        });
        it('keeps plain object unchanged', function () {
            var obj = { x: 1 };
            chai_1.expect(json_1.deserialize(json_1.serialize(obj))).to.be.deep.equal(obj);
        });
        it('keeps null unchanged', function () {
            chai_1.expect(json_1.deserialize(json_1.serialize(null))).to.be.equals(null);
        });
        it('keeps array unchanged', function () {
            var array = [{ x: 1 }];
            chai_1.expect(json_1.deserialize(json_1.serialize(array))).to.be.deep.equal(array);
        });
    });
});
