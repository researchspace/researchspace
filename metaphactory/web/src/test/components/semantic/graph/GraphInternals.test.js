Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var rdf_1 = require("platform/api/rdf");
var GraphInternals = require("../../../../main/components/semantic/graph/GraphInternals");
var TestData_1 = require("./TestData");
var SPARQL_CONSTRUCT_RESPONSE = [
    rdf_1.Rdf.triple(TestData_1.person.alice, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal('Alice')),
    rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.bob),
    rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.carol),
    rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.mike),
    rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.member, TestData_1.person.W3C),
    rdf_1.Rdf.triple(TestData_1.person.mike, TestData_1.foaf.member, TestData_1.person.W3C),
    rdf_1.Rdf.triple(TestData_1.person.mike, TestData_1.foaf.knows, TestData_1.person.carol),
    rdf_1.Rdf.triple(TestData_1.person.carol, TestData_1.foaf.knows, TestData_1.person.mike),
    rdf_1.Rdf.triple(TestData_1.person.bob, TestData_1.foaf.knows, TestData_1.person.carol),
];
describe('GraphInternals', function () {
    it('build data with default options', function () {
        var config = {
            query: '',
            height: 0,
        };
        var graphData = GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + rdf_1.vocabularies.rdfs.label.toString() + rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.vocabularies.rdfs.label,
                    'resource': rdf_1.vocabularies.rdfs.label.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': rdf_1.Rdf.literal('Alice').toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.bob.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.bob.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.mike.toString() + TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.mike.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.mike.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.mike.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.carol.toString(),
                    'target': TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.bob.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.bob.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.Rdf.literal('Alice'),
                    'resource': rdf_1.Rdf.literal('Alice').toString(),
                    'parent': undefined,
                    'isIri': false,
                    'isLiteral': true,
                    'isBnode': false,
                },
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.bob.toString(),
                        'node': TestData_1.person.bob,
                        'resource': TestData_1.person.bob.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _b),
            },
            {
                'group': 'nodes',
                'data': (_c = {
                        'id': TestData_1.person.carol.toString(),
                        'node': TestData_1.person.carol,
                        'resource': TestData_1.person.carol.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                    _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                    _c),
            },
            {
                'group': 'nodes',
                'data': (_d = {
                        'id': TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _d["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _d["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _d["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _d["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _d),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C.toString(),
                    'node': TestData_1.person.W3C,
                    'resource': TestData_1.person.W3C.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b, _c, _d;
    });
    it('build data with hidden predicates', function () {
        var config = {
            query: '',
            height: 0,
            hidePredicates: [rdf_1.vocabularies.rdfs.label.toString(), TestData_1.foaf.member.toString()],
        };
        var graphData = GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.bob.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.bob.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.mike.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.mike.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.carol.toString(),
                    'target': TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.bob.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.bob.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.bob.toString(),
                        'node': TestData_1.person.bob,
                        'resource': TestData_1.person.bob.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _b),
            },
            {
                'group': 'nodes',
                'data': (_c = {
                        'id': TestData_1.person.carol.toString(),
                        'node': TestData_1.person.carol,
                        'resource': TestData_1.person.carol.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                    _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                    _c),
            },
            {
                'group': 'nodes',
                'data': (_d = {
                        'id': TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _d["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _d["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _d["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _d["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _d),
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b, _c, _d;
    });
    it('build data with show predicates', function () {
        var config = {
            query: '',
            height: 0,
            showPredicates: [rdf_1.vocabularies.rdfs.label.toString(), TestData_1.foaf.member.toString()],
        };
        var graphData = GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + rdf_1.vocabularies.rdfs.label.toString() + rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.vocabularies.rdfs.label,
                    'resource': rdf_1.vocabularies.rdfs.label.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': rdf_1.Rdf.literal('Alice').toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.alice.toString() + TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.mike.toString() + TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.mike.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.Rdf.literal('Alice'),
                    'resource': rdf_1.Rdf.literal('Alice').toString(),
                    'parent': undefined,
                    'isIri': false,
                    'isLiteral': true,
                    'isBnode': false,
                },
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _b["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _b["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _b),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C.toString(),
                    'node': TestData_1.person.W3C,
                    'resource': TestData_1.person.W3C.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b;
    });
    it('build data with group-by', function () {
        var config = {
            query: '',
            height: 0,
            groupBy: TestData_1.foaf.member.toString(),
        };
        var graphData = GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        rdf_1.vocabularies.rdfs.label.toString() + rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.vocabularies.rdfs.label,
                    'resource': rdf_1.vocabularies.rdfs.label.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': rdf_1.Rdf.literal('Alice').toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.bob.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.bob.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() +
                        TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.carol.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.bob.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.bob.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.Rdf.literal('Alice'),
                    'resource': rdf_1.Rdf.literal('Alice').toString(),
                    'parent': undefined,
                    'isIri': false,
                    'isLiteral': true,
                    'isBnode': false,
                },
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.bob.toString(),
                        'node': TestData_1.person.bob,
                        'resource': TestData_1.person.bob.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _b),
            },
            {
                'group': 'nodes',
                'data': (_c = {
                        'id': TestData_1.person.carol.toString(),
                        'node': TestData_1.person.carol,
                        'resource': TestData_1.person.carol.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                    _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                    _c),
            },
            {
                'group': 'nodes',
                'data': (_d = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _d["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _d["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _d["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _d["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _d),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C.toString(),
                    'node': TestData_1.person.W3C,
                    'resource': TestData_1.person.W3C.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b, _c, _d;
    });
    it('build data with group-by and hidden predicates', function () {
        var config = {
            query: '',
            height: 0,
            groupBy: TestData_1.foaf.member.toString(),
            hidePredicates: [rdf_1.vocabularies.rdfs.label.toString()],
        };
        var graphData = GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                    'node': TestData_1.foaf.member,
                    'resource': TestData_1.foaf.member.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.W3C.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.bob.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.bob.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() +
                        TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.carol.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.bob.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.bob.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.bob.toString(),
                        'node': TestData_1.person.bob,
                        'resource': TestData_1.person.bob.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _b),
            },
            {
                'group': 'nodes',
                'data': (_c = {
                        'id': TestData_1.person.carol.toString(),
                        'node': TestData_1.person.carol,
                        'resource': TestData_1.person.carol.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                    _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                    _c),
            },
            {
                'group': 'nodes',
                'data': (_d = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _d["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _d["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _d["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _d["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _d),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C.toString(),
                    'node': TestData_1.person.W3C,
                    'resource': TestData_1.person.W3C.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b, _c, _d;
    });
    it('build data with group-by and show predicates', function () {
        var config = {
            query: '',
            height: 0,
            showPredicates: [TestData_1.foaf.knows.toString()],
            groupBy: TestData_1.foaf.member.toString(),
        };
        var graphData = GraphInternals.prepareGraphData(config)(SPARQL_CONSTRUCT_RESPONSE);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.bob.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.bob.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() +
                        TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.carol.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.bob.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.bob.toString(),
                    'target': TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.bob.toString(),
                        'node': TestData_1.person.bob,
                        'resource': TestData_1.person.bob.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _b),
            },
            {
                'group': 'nodes',
                'data': (_c = {
                        'id': TestData_1.person.carol.toString(),
                        'node': TestData_1.person.carol,
                        'resource': TestData_1.person.carol.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                    _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                    _c),
            },
            {
                'group': 'nodes',
                'data': (_d = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _d["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                    _d["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _d["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                    _d["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _d),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C.toString(),
                    'node': TestData_1.person.W3C,
                    'resource': TestData_1.person.W3C.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b, _c, _d;
    });
    it('build data with group-by and node mirroring', function () {
        var COMPLEX_GROUPED_DATA = [
            rdf_1.Rdf.triple(TestData_1.person.alice, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal('Alice')),
            rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.bob),
            rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.carol),
            rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.mike),
            rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.member, TestData_1.person.W3C),
            rdf_1.Rdf.triple(TestData_1.person.mike, TestData_1.foaf.member, TestData_1.person.W3C),
            rdf_1.Rdf.triple(TestData_1.person.mike, TestData_1.foaf.knows, TestData_1.person.carol),
            rdf_1.Rdf.triple(TestData_1.person.carol, TestData_1.foaf.knows, TestData_1.person.mike),
            rdf_1.Rdf.triple(TestData_1.person.bob, TestData_1.foaf.knows, TestData_1.person.carol),
            rdf_1.Rdf.triple(TestData_1.person.carol, TestData_1.foaf.member, TestData_1.person.W3C2),
            rdf_1.Rdf.triple(TestData_1.person.bob, TestData_1.foaf.member, TestData_1.person.W3C2),
            rdf_1.Rdf.triple(TestData_1.person.mike, TestData_1.foaf.member, TestData_1.person.W3C2),
            rdf_1.Rdf.triple(TestData_1.person.alice, TestData_1.foaf.knows, TestData_1.person.sam),
            rdf_1.Rdf.triple(TestData_1.person.mike, TestData_1.foaf.knows, TestData_1.person.sam),
            rdf_1.Rdf.triple(TestData_1.person.bob, TestData_1.foaf.knows, TestData_1.person.sam),
        ];
        var config = {
            query: '',
            height: 0,
            groupBy: TestData_1.foaf.member.toString(),
            hidePredicates: [TestData_1.foaf.member.toString()],
        };
        var graphData = GraphInternals.prepareGraphData(config)(COMPLEX_GROUPED_DATA);
        var expectedGraphData = [
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        rdf_1.vocabularies.rdfs.label.toString() + rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.vocabularies.rdfs.label,
                    'resource': rdf_1.vocabularies.rdfs.label.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': rdf_1.Rdf.literal('Alice').toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.sam.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.sam.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.sam.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                    'target': TestData_1.person.sam.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.sam.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString(),
                    'target': TestData_1.person.sam.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.sam.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString(),
                    'target': TestData_1.person.sam.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() +
                        TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                    'target': TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString(),
                },
            },
            {
                'group': 'edges',
                'data': {
                    'id': TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString() +
                        TestData_1.foaf.knows.toString() + TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                    'node': TestData_1.foaf.knows,
                    'resource': TestData_1.foaf.knows.toString(),
                    'source': TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString(),
                    'target': TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                },
            },
            {
                'group': 'nodes',
                'data': (_a = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.alice.toString(),
                        'node': TestData_1.person.alice,
                        'resource': TestData_1.person.alice.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _a["->" + rdf_1.vocabularies.rdfs.label] = rdf_1.Rdf.literal('Alice').toString(),
                    _a["->" + TestData_1.foaf.knows] = TestData_1.person.bob + " " + TestData_1.person.carol + " " + TestData_1.person.mike + " " + TestData_1.person.sam,
                    _a["->" + TestData_1.foaf.member] = TestData_1.person.W3C.toString(),
                    _a["" + rdf_1.vocabularies.rdfs.label] = [rdf_1.Rdf.literal('Alice')],
                    _a["" + TestData_1.foaf.knows] = [
                        TestData_1.person.bob, TestData_1.person.carol, TestData_1.person.mike, TestData_1.person.sam,
                    ],
                    _a["" + TestData_1.foaf.member] = [TestData_1.person.W3C],
                    _a),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': rdf_1.Rdf.literal('Alice').toString(),
                    'node': rdf_1.Rdf.literal('Alice'),
                    'resource': rdf_1.Rdf.literal('Alice').toString(),
                    'parent': undefined,
                    'isIri': false,
                    'isLiteral': true,
                    'isBnode': false,
                },
            },
            {
                'group': 'nodes',
                'data': (_b = {
                        'id': TestData_1.person.W3C2.toString() + TestData_1.person.bob.toString(),
                        'node': TestData_1.person.bob,
                        'resource': TestData_1.person.bob.toString(),
                        'parent': TestData_1.person.W3C2.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol + " " + TestData_1.person.sam,
                    _b["->" + TestData_1.foaf.member] = "" + TestData_1.person.W3C2,
                    _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol, TestData_1.person.sam],
                    _b["" + TestData_1.foaf.member] = [TestData_1.person.W3C2],
                    _b),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.sam.toString(),
                    'node': TestData_1.person.sam,
                    'resource': TestData_1.person.sam.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
            {
                'group': 'nodes',
                'data': (_c = {
                        'id': TestData_1.person.W3C2.toString() + TestData_1.person.carol.toString(),
                        'node': TestData_1.person.carol,
                        'resource': TestData_1.person.carol.toString(),
                        'parent': TestData_1.person.W3C2.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                    _c["->" + TestData_1.foaf.member] = "" + TestData_1.person.W3C2,
                    _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                    _c["" + TestData_1.foaf.member] = [TestData_1.person.W3C2],
                    _c),
            },
            {
                'group': 'nodes',
                'data': (_d = {
                        'id': TestData_1.person.W3C.toString() + TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': TestData_1.person.W3C.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _d["->" + TestData_1.foaf.knows] = TestData_1.person.carol + " " + TestData_1.person.sam,
                    _d["->" + TestData_1.foaf.member] = TestData_1.person.W3C + " " + TestData_1.person.W3C2,
                    _d["" + TestData_1.foaf.knows] = [TestData_1.person.carol, TestData_1.person.sam],
                    _d["" + TestData_1.foaf.member] = [TestData_1.person.W3C, TestData_1.person.W3C2],
                    _d),
            },
            {
                'group': 'nodes',
                'data': (_e = {
                        'id': TestData_1.person.W3C2.toString() + TestData_1.person.mike.toString(),
                        'node': TestData_1.person.mike,
                        'resource': TestData_1.person.mike.toString(),
                        'parent': TestData_1.person.W3C2.toString(),
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false
                    },
                    _e["->" + TestData_1.foaf.knows] = TestData_1.person.carol + " " + TestData_1.person.sam,
                    _e["->" + TestData_1.foaf.member] = TestData_1.person.W3C + " " + TestData_1.person.W3C2,
                    _e["" + TestData_1.foaf.knows] = [TestData_1.person.carol, TestData_1.person.sam],
                    _e["" + TestData_1.foaf.member] = [TestData_1.person.W3C, TestData_1.person.W3C2],
                    _e),
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C.toString(),
                    'node': TestData_1.person.W3C,
                    'resource': TestData_1.person.W3C.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
            {
                'group': 'nodes',
                'data': {
                    'id': TestData_1.person.W3C2.toString(),
                    'node': TestData_1.person.W3C2,
                    'resource': TestData_1.person.W3C2.toString(),
                    'parent': undefined,
                    'isIri': true,
                    'isLiteral': false,
                    'isBnode': false,
                },
            },
        ];
        chai_1.assert.sameDeepMembers(graphData, expectedGraphData);
        var _a, _b, _c, _d, _e;
    });
});
