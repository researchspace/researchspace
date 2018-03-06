Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var maybe = require("data.maybe");
var immutable_1 = require("immutable");
var rdf_1 = require("platform/api/rdf");
var json_1 = require("platform/api/json");
describe('instance to json serialization', function () {
    describe('immutable.js serialization', function () {
        it('serialize/deserialize immutable.js Recrod', function () {
            var RecordX = immutable_1.Record({ x: 1 });
            var record = new RecordX({ x: 2 });
            json_1.recordSerializer('Record', RecordX);
            var expectedSerialization = {
                '#type': 'Record',
                '#value': {
                    x: 2,
                },
            };
            chai_1.expect(json_1.serialize(record)).to.be.deep.equal(expectedSerialization);
            chai_1.expect(json_1.deserialize(json_1.serialize(record))).to.be.instanceof(immutable_1.Record);
            chai_1.expect(json_1.deserialize(json_1.serialize(record))).to.be.deep.equal(record);
        });
        it('serialize/deserialize immutable.js nested Recrod', function () {
            var RecordX = immutable_1.Record({ x: null });
            json_1.recordSerializer('RecordX', RecordX);
            var RecordY = immutable_1.Record({ x: null });
            json_1.recordSerializer('RecordY', RecordY);
            var record = new RecordY({
                x: RecordX({
                    x: maybe.Just(rdf_1.Rdf.iri('http://example.com')),
                }),
            });
            var expectedSerialization = {
                '#type': 'RecordY',
                '#value': {
                    x: {
                        '#type': 'RecordX',
                        '#value': {
                            x: {
                                '#type': 'Data.Maybe',
                                '#value': {
                                    value: {
                                        '#type': 'Iri',
                                        '#value': {
                                            value: 'http://example.com',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            };
            chai_1.expect(json_1.serialize(record)).to.be.deep.equal(expectedSerialization);
            chai_1.expect(json_1.deserialize(json_1.serialize(record))).to.be.instanceof(RecordY);
        });
        it('serialize/deserialize Immutable.Map', function () {
            var map = immutable_1.Map({ x: 1, y: 2 });
            var expectedSerialization = {
                '#type': 'Immutable.Map',
                '#value': {
                    'x': 1,
                    'y': 2,
                },
            };
            var serializedMap = json_1.serialize(map);
            chai_1.expect(serializedMap).to.be.deep.equal(expectedSerialization);
            chai_1.expect(json_1.deserialize(serializedMap)).to.be.instanceof(immutable_1.Map);
            chai_1.expect(json_1.deserialize(serializedMap)).to.be.deep.equal(map);
        });
        it('serialize/deserialize Immutable.List', function () {
            var list = immutable_1.List(['first', 'second']);
            var expectedSerialization = {
                '#type': 'Immutable.List',
                '#value': ['first', 'second'],
            };
            var serializedList = json_1.serialize(list);
            chai_1.expect(serializedList).to.be.deep.equal(expectedSerialization);
            chai_1.expect(json_1.deserialize(serializedList)).to.be.instanceof(immutable_1.List);
            chai_1.expect(json_1.deserialize(serializedList)).to.be.deep.equal(list);
        });
    });
});
