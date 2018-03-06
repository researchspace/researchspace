Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var maybe = require("data.maybe");
var lodash_1 = require("lodash");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("./ldp");
var VocabPlatform = rdf_1.vocabularies.VocabPlatform, ldp = rdf_1.vocabularies.ldp, rdf = rdf_1.vocabularies.rdf, rdfs = rdf_1.vocabularies.rdfs, sp = rdf_1.vocabularies.sp;
var QueryServiceClass = (function (_super) {
    tslib_1.__extends(QueryServiceClass, _super);
    function QueryServiceClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    QueryServiceClass.prototype.addItem = function (query) {
        var _this = this;
        var graph = this.createGraph(query);
        var label = query.label;
        return this.options(VocabPlatform.QueryContainer).flatMap(function (v) { return _this.addResource(graph, maybe.Just(label)); }).flatMapErrors(function (e) { return _this.createContainer().flatMap(function (containerIri) {
            return _this.addResource(graph, maybe.Just(label));
        }); }).toProperty();
    };
    QueryServiceClass.prototype.updateItem = function (iri, query) {
        var graph = this.createGraph(query);
        return this.update(iri, graph);
    };
    QueryServiceClass.prototype.createGraph = function (query) {
        var label = query.label, value = query.value, type = query.type, queryType = query.queryType;
        var queryClass = (type === 'update') ? sp.Update : sp.Query;
        var triples = [
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdf.type, queryClass),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdf.type, this.getType(type, queryType)),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdfs.label, rdf_1.Rdf.literal(label)),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), sp.text, rdf_1.Rdf.literal(value)),
        ];
        if (query.structure) {
            triples.push(rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdf_1.vocabularies.VocabPlatform.searchState, rdf_1.Rdf.literal(query.structure)));
        }
        return rdf_1.Rdf.graph(triples);
    };
    QueryServiceClass.prototype.getType = function (type, queryType) {
        if (type !== 'update') {
            switch (queryType) {
                case 'ASK':
                    return sp.Ask;
                case 'SELECT':
                    return sp.Select;
                case 'DESCRIBE':
                    return sp.Describe;
                case 'CONSTRUCT':
                    return sp.Construct;
                default:
                    return sp.Select;
            }
        }
        else {
            return sp.Update;
        }
    };
    QueryServiceClass.prototype.createContainer = function () {
        return new ldp_1.LdpService(VocabPlatform.RootContainer.value, this.context).addResource(rdf_1.Rdf.graph([
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdf.type, ldp.Container),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdfs.label, rdf_1.Rdf.literal('LDP Container for resources of type ' + VocabPlatform.QueryContainer)),
        ]), maybe.Just(VocabPlatform.QueryContainer.value));
    };
    QueryServiceClass.prototype.getQuery = function (iri) {
        var _this = this;
        return this.get(iri).map(function (graph) { return _this.parseGraphToQuery(iri, graph); });
    };
    QueryServiceClass.prototype.parseGraphToQuery = function (iri, graph) {
        var queryTypes = [sp.Ask, sp.Select, sp.Describe, sp.Construct, sp.Update]
            .map(function (qt) { return qt.value; });
        var label = graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(rdfs.label); }).o.value;
        var value = graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(sp.text); }).o.value;
        var structure = graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(rdf_1.vocabularies.VocabPlatform.searchState); });
        var sTypeIRI = graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(rdf.type) && lodash_1.includes(queryTypes, t.o.value); }).o.value;
        var queryType = this.extractTypeFromIri(sTypeIRI).toUpperCase();
        return {
            label: label,
            value: value,
            type: (queryType === 'UPDATE') ? 'update' : 'query',
            queryType: queryType,
            structure: structure ? structure.o.value : undefined,
        };
    };
    QueryServiceClass.prototype.extractTypeFromIri = function (sTypeIRI) {
        return /[^#]*$/.exec(sTypeIRI)[0];
    };
    return QueryServiceClass;
}(ldp_1.LdpService));
exports.QueryServiceClass = QueryServiceClass;
exports.QueryService = function (context) {
    return new QueryServiceClass(VocabPlatform.QueryContainer.value, context);
};
