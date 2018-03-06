Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var chai_1 = require("chai");
var enzyme_1 = require("enzyme");
var rdf_1 = require("platform/api/rdf");
var TestData_1 = require("./TestData");
var graph_1 = require("platform/components/semantic/graph");
var GRAPH_DATA = [
    {
        'group': 'edges',
        'data': {
            'label': 'label',
            'node': rdf_1.vocabularies.rdfs.label,
            'resource': rdf_1.vocabularies.rdfs.label.toString(),
            'source': TestData_1.person.alice.toString(),
            'target': rdf_1.Rdf.literal('Alice').toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:knows',
            'node': TestData_1.foaf.knows,
            'resource': TestData_1.foaf.knows.toString(),
            'source': TestData_1.person.alice.toString(),
            'target': TestData_1.person.bob.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:knows',
            'node': TestData_1.foaf.knows,
            'resource': TestData_1.foaf.knows.toString(),
            'source': TestData_1.person.alice.toString(),
            'target': TestData_1.person.carol.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:knows',
            'node': TestData_1.foaf.knows,
            'resource': TestData_1.foaf.knows.toString(),
            'source': TestData_1.person.alice.toString(),
            'target': TestData_1.person.mike.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:member',
            'node': TestData_1.foaf.member,
            'resource': TestData_1.foaf.member.toString(),
            'source': TestData_1.person.alice.toString(),
            'target': TestData_1.person.W3C.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:member',
            'node': TestData_1.foaf.member,
            'resource': TestData_1.foaf.member.toString(),
            'source': TestData_1.person.mike.toString(),
            'target': TestData_1.person.W3C.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:knows',
            'node': TestData_1.foaf.knows,
            'resource': TestData_1.foaf.knows.toString(),
            'source': TestData_1.person.mike.toString(),
            'target': TestData_1.person.carol.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:knows',
            'node': TestData_1.foaf.knows,
            'resource': TestData_1.foaf.knows.toString(),
            'source': TestData_1.person.carol.toString(),
            'target': TestData_1.person.mike.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'foaf:knows',
            'node': TestData_1.foaf.knows,
            'resource': TestData_1.foaf.knows.toString(),
            'source': TestData_1.person.bob.toString(),
            'target': TestData_1.person.carol.toString(),
        },
    },
    {
        'group': 'edges',
        'data': {
            'label': 'count',
            'node': rdf_1.Rdf.iri('http://example.com/count'),
            'resource': rdf_1.Rdf.iri('http://example.com/count').toString(),
            'source': TestData_1.person.bob.toString(),
            'target': rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString(),
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
                'label': 'alice',
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
            'label': 'Alice',
            'isBnode': false,
        },
    },
    {
        'group': 'nodes',
        'data': {
            'id': rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString(),
            'node': rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString(),
            'resource': rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString(),
            'parent': undefined,
            'isIri': false,
            'isLiteral': true,
            'label': '2',
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
                'label': 'bob',
                'isBnode': false
            },
            _b["->" + TestData_1.foaf.knows] = TestData_1.person.carol.toString(),
            _b["-><http://example.com/count>"] = rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString(),
            _b["" + TestData_1.foaf.knows] = [TestData_1.person.carol],
            _b['<http://example.com/count>'] = [rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString()],
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
                'label': 'carol',
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
                'label': 'mike',
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
            'label': 'W3C',
            'isBnode': false,
        },
    },
];
var GRAPH_STYLESHEET = [
    {
        'selector': 'node[?isLiteral]',
        'style': {
            'background-color': '#F2ED59',
        },
    },
    {
        'selector': 'node[resource = iri(<http://example.com/person/alice>)]',
        'style': {
            'content': '{{[<http://www.w3.org/2000/01/rdf-schema#label>].[0].value}}',
        },
    },
    {
        'selector': 'node[resource = literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]',
        'style': {
            'background-color': 'yellow',
        },
    },
    {
        'selector': 'node[resource = literal(Alice)]',
        'style': {
            'background-color': 'green',
        },
    },
    {
        'selector': 'node[resource = iri(<http://example.com/person/mike>)]',
        'style': {
            'background-color': '#30698C',
        },
    },
    {
        'selector': 'node[resource = iri(<http://example.com/org/W3C>)]',
        'style': {
            'background-color': '#75b461',
        },
    },
    {
        'selector': 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)]',
        'style': {
            'background-color': 'red',
        },
    },
    {
        'selector': 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)][property(<http://www.w3.org/2000/01/rdf-schema#label>) *= literal(Alice)]',
        'style': {
            'border-color': '#D95E52',
        },
    },
    {
        'selector': 'node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/carol>)][property(<http://example.com/count>) *= literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]',
        'style': {
            'content': 'Node linking to literal',
        },
    },
    {
        'selector': '[expanded-collapsed = literal(collapsed)]',
        'style': {
            'shape': 'rectangle',
        },
    },
];
describe('cytoscape', function () {
    var cytoscape;
    before(function (done) {
        this.timeout(10000);
        var cytoscapeComponent = enzyme_1.mount(react_1.createElement(graph_1.Graph, {
            elements: GRAPH_DATA,
            graphStyle: GRAPH_STYLESHEET,
            height: 0,
        }));
        setTimeout(function () {
            cytoscapeComponent.update();
            cytoscapeComponent.state().cytoscape.map(function (cy) { return cytoscape = cy; });
            done();
        }, 3000);
    });
    it('use handlebars templates to access node values in stylesheets', function () {
        chai_1.expect(cytoscape.getElementById(TestData_1.person.alice.toString()).renderedStyle()['label']).to.be.equal('Alice');
    });
    it('exact typed literal matching', function () {
        chai_1.expect(cytoscape.getElementById(rdf_1.Rdf.literal('2', rdf_1.vocabularies.xsd.integer).toString()).renderedStyle()['background-color']).to.be.equal('yellow');
    });
    it('exact string literal matching', function () {
        chai_1.expect(cytoscape.getElementById(rdf_1.Rdf.literal('Alice').toString()).renderedStyle()['background-color']).to.be.equal('green');
    });
    it('match node by outgoing property value', function () {
        [TestData_1.person.bob.toString(), TestData_1.person.mike.toString()].forEach(function (id) {
            return chai_1.expect(cytoscape.getElementById(id).renderedStyle()['background-color']).to.be.equal('red');
        });
    });
    it('conjunctive property matching with typed literal', function () {
        chai_1.expect(cytoscape.getElementById(TestData_1.person.bob.toString()).renderedStyle()['label']).to.be.equal('Node linking to literal');
    });
    it('conjunctive property matching with string literal', function () {
        chai_1.expect(cytoscape.getElementById(TestData_1.person.alice.toString()).renderedStyle()['border-color']).to.be.equal('#D95E52');
    });
});
var _a, _b, _c, _d;
