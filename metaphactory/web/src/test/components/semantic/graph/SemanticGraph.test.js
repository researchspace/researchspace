Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var enzyme_1 = require("enzyme");
var react_1 = require("react");
var sinon = require("sinon");
var Kefir = require("kefir");
var NamespaceService = require("platform/api/services/namespace");
sinon.stub(NamespaceService, 'getRegisteredPrefixes', function () {
    return Kefir.constant({});
});
var graph_1 = require("platform/components/semantic/graph");
var rdf_1 = require("platform/api/rdf");
var TestData_1 = require("./TestData");
var LabelService_1 = require("../../../test-utils/mocks/LabelService");
var SparqlClient_1 = require("../../../test-utils/mocks/SparqlClient");
var ThumbnailService_1 = require("../../../test-utils/mocks/ThumbnailService");
var QUERY = "\n        prefix vocabularies.rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n        prefix person: <http://example.com/person/>\n        prefix foaf: <http://xmlns.com/foaf/0.1/>\n\n        CONSTRUCT {\n          ?s ?p ?o\n        } WHERE {\n         {\n           SELECT ?s ?p ?o WHERE {\n             VALUES (?s ?p ?o)\n             {\n               (person:alice foaf:knows person:bob)\n               (person:alice vocabularies.rdfs:label \"Alice\")\n               (person:alice foaf:knows person:carol)\n               (person:carol foaf:knows person:mike)\n               (person:mike foaf:knows person:carol)\n               (person:bob foaf:knows person:carol)\n               (person:alice foaf:knows person:mike)\n               (person:alice foaf:member person:W3C)\n               (person:mike foaf:member person:W3C)\n             }\n           }\n         }\n       }\n";
var DATA = "\n@prefix vocabularies.rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n@prefix person: <http://example.com/person/> .\n\nperson:alice\n  vocabularies.rdfs:label \"Alice\" ;\n  foaf:knows person:bob ;\n  foaf:knows person:carol ;\n  foaf:knows person:mike ;\n  foaf:member person:W3C .\n\nperson:mike foaf:member person:W3C ;\n  foaf:knows person:carol .\n\nperson:carol foaf:knows person:mike .\nperson:bob foaf:knows person:carol .\n";
var LABELS = "\n{\n  \"http://xmlns.com/foaf/0.1/knows\":\"foaf:knows\",\n  \"http://www.w3.org/2000/01/rdf-schema#label\":\"label\",\n  \"http://xmlns.com/foaf/0.1/member\":\"foaf:member\",\n  \"http://example.com/person/W3C\":\"W3C\",\n  \"http://example.com/person/alice\":\"alice\",\n  \"http://example.com/person/bob\":\"bob\",\n  \"http://example.com/person/carol\":\"carol\",\n  \"http://example.com/person/mike\":\"mike\"\n}\n";
var W3C_THUMBNAIL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/W3C%C2%AE_Icon.svg/210px-W3C%C2%AE_Icon.svg.png';
var DEFAULT_THUMBNAIL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
var THUMBNAILS = "\n{\n  \"http://example.com/person/W3C\": \"" + W3C_THUMBNAIL + "\",\n  \"http://example.com/person/alice\": null,\n  \"http://example.com/person/bob\": null,\n  \"http://example.com/person/carol\": null,\n  \"http://example.com/person/mike\": null\n}\n";
describe('graph-widget', function () {
    var server;
    before(function () {
        server = sinon.fakeServer.create();
        server.respondImmediately = true;
        SparqlClient_1.mockConstructQuery(server, DATA);
        LabelService_1.mockLabelsService(server, LABELS);
        ThumbnailService_1.mockThumbnailService(server, THUMBNAILS);
    });
    after(function () {
        server.restore();
    });
    describe('rendering with default graph-widget configuration', function () {
        var graphWidget;
        before(function (done) {
            graphWidget = enzyme_1.mount(react_1.createElement(graph_1.SemanticGraph, {
                query: QUERY,
                height: 0,
            }));
            setTimeout(function () {
                graphWidget.update();
                done();
            }, 1000);
        });
        it('default stylesheet is applied if no styles are provided in props', function () {
            var cytoscapeComponent = graphWidget.find(graph_1.Graph);
            chai_1.expect(cytoscapeComponent.props().graphStyle).to.be.deep.equal(graph_1.SemanticGraph.DEFAULT_STYLE);
        });
        it('query executed and result is properly translated to Cytotscape format', function () {
            var expectedGraphData = [
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.bob.toString(),
                        'label': 'foaf:knows',
                        'node': TestData_1.foaf.knows,
                        'resource': TestData_1.foaf.knows.toString(),
                        'source': TestData_1.person.alice.toString(),
                        'target': TestData_1.person.bob.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                        'label': 'foaf:knows',
                        'node': TestData_1.foaf.knows,
                        'resource': TestData_1.foaf.knows.toString(),
                        'source': TestData_1.person.alice.toString(),
                        'target': TestData_1.person.carol.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.alice.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.mike.toString(),
                        'label': 'foaf:knows',
                        'node': TestData_1.foaf.knows,
                        'resource': TestData_1.foaf.knows.toString(),
                        'source': TestData_1.person.alice.toString(),
                        'target': TestData_1.person.mike.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.alice.toString() + TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                        'label': 'foaf:member',
                        'node': TestData_1.foaf.member,
                        'resource': TestData_1.foaf.member.toString(),
                        'source': TestData_1.person.alice.toString(),
                        'target': TestData_1.person.W3C.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.mike.toString() + TestData_1.foaf.member.toString() + TestData_1.person.W3C.toString(),
                        'label': 'foaf:member',
                        'node': TestData_1.foaf.member,
                        'resource': TestData_1.foaf.member.toString(),
                        'source': TestData_1.person.mike.toString(),
                        'target': TestData_1.person.W3C.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.mike.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                        'label': 'foaf:knows',
                        'node': TestData_1.foaf.knows,
                        'resource': TestData_1.foaf.knows.toString(),
                        'source': TestData_1.person.mike.toString(),
                        'target': TestData_1.person.carol.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.carol.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.mike.toString(),
                        'label': 'foaf:knows',
                        'node': TestData_1.foaf.knows,
                        'resource': TestData_1.foaf.knows.toString(),
                        'source': TestData_1.person.carol.toString(),
                        'target': TestData_1.person.mike.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'edges',
                    'data': {
                        'id': TestData_1.person.bob.toString() + TestData_1.foaf.knows.toString() + TestData_1.person.carol.toString(),
                        'label': 'foaf:knows',
                        'node': TestData_1.foaf.knows,
                        'resource': TestData_1.foaf.knows.toString(),
                        'source': TestData_1.person.bob.toString(),
                        'target': TestData_1.person.carol.toString(),
                        'thumbnail': DEFAULT_THUMBNAIL,
                    },
                },
                {
                    'group': 'nodes',
                    'data': (_a = {
                            'id': TestData_1.person.alice.toString(),
                            'label': 'alice',
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
                        _a['thumbnail'] = DEFAULT_THUMBNAIL,
                        _a),
                },
                {
                    'group': 'nodes',
                    'data': (_b = {
                            'id': TestData_1.person.bob.toString(),
                            'label': 'bob',
                            'node': TestData_1.person.bob,
                            'resource': TestData_1.person.bob.toString(),
                            'parent': undefined,
                            'isIri': true,
                            'isLiteral': false,
                            'isBnode': false
                        },
                        _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
                        _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
                        _b['thumbnail'] = DEFAULT_THUMBNAIL,
                        _b),
                },
                {
                    'group': 'nodes',
                    'data': (_c = {
                            'id': TestData_1.person.carol.toString(),
                            'label': 'carol',
                            'node': TestData_1.person.carol,
                            'resource': TestData_1.person.carol.toString(),
                            'parent': undefined,
                            'isIri': true,
                            'isLiteral': false,
                            'isBnode': false
                        },
                        _c["->" + TestData_1.foaf.knows] = TestData_1.person.mike.toString(),
                        _c["" + TestData_1.foaf.knows] = [TestData_1.person.mike],
                        _c['thumbnail'] = DEFAULT_THUMBNAIL,
                        _c),
                },
                {
                    'group': 'nodes',
                    'data': (_d = {
                            'id': TestData_1.person.mike.toString(),
                            'label': 'mike',
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
                        _d['thumbnail'] = DEFAULT_THUMBNAIL,
                        _d),
                },
                {
                    'group': 'nodes',
                    'data': {
                        'id': TestData_1.person.W3C.toString(),
                        'label': 'W3C',
                        'node': TestData_1.person.W3C,
                        'resource': TestData_1.person.W3C.toString(),
                        'parent': undefined,
                        'isIri': true,
                        'isLiteral': false,
                        'isBnode': false,
                        'thumbnail': W3C_THUMBNAIL,
                    },
                },
            ];
            var cytoscapeComponent = graphWidget.find(graph_1.Graph);
            chai_1.assert.sameDeepMembers(cytoscapeComponent.props().elements, expectedGraphData);
            var _a, _b, _c, _d;
        });
    });
});
