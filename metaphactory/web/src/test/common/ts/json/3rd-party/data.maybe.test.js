Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var json_1 = require("platform/api/json");
describe('instance to json serialization', function () {
    describe('maybe serialization', function () {
        it('serialize/deserialize "Just" part', function () {
            var just = maybe.Just(1);
            var expected = {
                '#type': 'Data.Maybe',
                '#value': {
                    'value': 1,
                },
            };
            chai_1.expect(json_1.serialize(just)).to.be.deep.equal(expected);
            chai_1.expect(json_1.deserialize(json_1.serialize(just))).to.be.deep.equal(just);
        });
        it('serialize/deserialize nested "Just" part', function () {
            var just = maybe.Just(maybe.Just(rdf_1.Rdf.iri('http://example.com')));
            var expected = {
                '#type': 'Data.Maybe',
                '#value': {
                    'value': {
                        '#type': 'Data.Maybe',
                        '#value': {
                            'value': {
                                '#type': 'Iri',
                                '#value': {
                                    'value': 'http://example.com',
                                },
                            },
                        },
                    },
                },
            };
            chai_1.expect(json_1.serialize(just)).to.be.deep.equal(expected);
            chai_1.expect(json_1.deserialize(json_1.serialize(just))).to.be.instanceof(maybe);
            chai_1.expect(json_1.deserialize(json_1.serialize(just))).to.be.deep.equal(just);
        });
        it('serialize/deserialize "Nothing" part', function () {
            var nothing = maybe.Nothing();
            chai_1.expect(json_1.deserialize(json_1.serialize(nothing))).to.be.deep.equal(nothing);
        });
    });
});
