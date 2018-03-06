Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("./ldp");
var lodash_1 = require("lodash");
var VocabPlatform = rdf_1.vocabularies.VocabPlatform, xsd = rdf_1.vocabularies.xsd, ldp = rdf_1.vocabularies.ldp, rdf = rdf_1.vocabularies.rdf, rdfs = rdf_1.vocabularies.rdfs, spl = rdf_1.vocabularies.spl, spin = rdf_1.vocabularies.spin, dct = rdf_1.vocabularies.dct;
var DEFAULT_NAMESPACE = 'http://metaphacts.com/query/';
var CATEGORIES_PREDICATE = dct.subject;
var QueryTemplateServiceClass = (function (_super) {
    tslib_1.__extends(QueryTemplateServiceClass, _super);
    function QueryTemplateServiceClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    QueryTemplateServiceClass.prototype.addItem = function (template, queryIri, namespace) {
        var _this = this;
        var graph = this.createGraph(template, queryIri, namespace);
        var addTemplateGraph = function () { return _this.addResource(graph, maybe.Just(template.identifier)); };
        return ldp_1.RootContainer(this.context)
            .options(VocabPlatform.QueryTemplateContainer)
            .flatMap(addTemplateGraph)
            .flatMapErrors(function (e) { return _this.createContainer().flatMap(addTemplateGraph); }).toProperty();
    };
    QueryTemplateServiceClass.prototype.updateItem = function (iri, template, queryIri, namespace) {
        var graph = this.createGraph(template, queryIri, namespace);
        return this.update(iri, graph);
    };
    QueryTemplateServiceClass.prototype.createGraph = function (template, queryIri, namespace) {
        if (namespace === void 0) { namespace = DEFAULT_NAMESPACE; }
        var identifier = template.identifier, label = template.label, description = template.description, args = template.args;
        var subject = rdf_1.Rdf.iri('');
        var argsTriples = args.map(function (arg, index) {
            var argIri = rdf_1.Rdf.iri(namespace + identifier + '/arg/' + index);
            var triples = [
                rdf_1.Rdf.triple(subject, spin.constraintProp, argIri),
                rdf_1.Rdf.triple(argIri, rdfs.label, rdf_1.Rdf.literal(arg.label)),
                rdf_1.Rdf.triple(argIri, spl.predicateProp, rdf_1.Rdf.iri(namespace + identifier + '/predicate/' + arg.variable)),
                rdf_1.Rdf.triple(argIri, spl.valueTypeProp, rdf_1.Rdf.iri(arg.valueType)),
            ];
            if (arg.defaultValue) {
                triples.push(rdf_1.Rdf.triple(argIri, spl.defaultValue, arg.defaultValue));
            }
            var optional = arg.optional !== undefined ? arg.optional : false;
            triples.push(rdf_1.Rdf.triple(argIri, spl.optionalProp, rdf_1.Rdf.literal(optional, xsd.boolean)));
            if (arg.comment !== undefined) {
                triples.push(rdf_1.Rdf.triple(argIri, rdfs.comment, rdf_1.Rdf.literal(arg.comment)));
            }
            return triples;
        });
        var mergedArgsTriples = [].concat.apply([], argsTriples);
        var categories = template.categories.map(function (category) { return rdf_1.Rdf.triple(subject, CATEGORIES_PREDICATE, category); });
        return rdf_1.Rdf.graph([
            rdf_1.Rdf.triple(subject, rdf.type, spin.Template),
            rdf_1.Rdf.triple(subject, rdf.type, template.templateType),
            rdf_1.Rdf.triple(subject, rdfs.label, rdf_1.Rdf.literal(label)),
            rdf_1.Rdf.triple(subject, rdfs.comment, rdf_1.Rdf.literal(description)),
            rdf_1.Rdf.triple(subject, spin.bodyProp, rdf_1.Rdf.iri(queryIri))
        ].concat(mergedArgsTriples, categories));
    };
    QueryTemplateServiceClass.prototype.createContainer = function () {
        return ldp_1.RootContainer(this.context).addResource(rdf_1.Rdf.graph([
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdf.type, ldp.Container),
            rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), rdfs.label, rdf_1.Rdf.literal('SPIN Query Templates')),
        ]), maybe.Just(VocabPlatform.QueryTemplateContainer.value));
    };
    QueryTemplateServiceClass.prototype.getQueryTemplate = function (iri) {
        var _this = this;
        return this.get(iri).map(function (graph) { return _this.parseGraphToQueryTemplate(iri, graph); });
    };
    QueryTemplateServiceClass.prototype.parseGraphToQueryTemplate = function (iri, graph) {
        var _this = this;
        var templateTypes = [spin.AskTemplate,
            spin.SelectTemplate,
            spin.ConstructTemplate,
            spin.UpdateTemplate].map(function (qt) { return qt.value; });
        var templateType = graph.triples
            .find(function (t) { return t.p.equals(rdf.type) &&
            lodash_1.includes(templateTypes, t.o.value); }).o;
        var argsIris = graph.triples
            .filter(function (t) { return t.s.equals(iri) && t.p.equals(spin.constraintProp); })
            .toArray()
            .map(function (item) { return item.o; });
        var args = argsIris.map(function (item) {
            var label = graph.triples.find(function (t) { return t.s.equals(item) && t.p.equals(rdfs.label); }).o.value;
            var variable = graph.triples.find(function (t) { return t.s.equals(item) && t.p.equals(spl.predicateProp); }).o.value;
            var comment = graph.triples.find(function (t) { return t.s.equals(item) && t.p.equals(rdfs.comment); }).o.value;
            var optional = graph.triples.find(function (t) { return t.s.equals(item) && t.p.equals(spl.optionalProp); });
            var valueType = graph.triples.find(function (t) { return t.s.equals(item) && t.p.equals(spl.valueTypeProp); }).o.value;
            var defaultValue = graph.triples.find(function (t) { return t.s.equals(item) && t.p.equals(spl.defaultValue); });
            return {
                label: label,
                variable: _this.extractValueFromIri(variable),
                comment: comment,
                valueType: valueType,
                defaultValue: defaultValue ? defaultValue.o : undefined,
                optional: optional ? (optional.o.value === 'true') : false,
            };
        });
        var template = {
            templateType: templateType,
            identifier: this.extractValueFromIri(iri.value),
            label: graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(rdfs.label); }).o.value,
            description: graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(rdfs.comment); }).o.value,
            categories: graph.triples
                .filter(function (t) { return t.s.equals(iri) && t.p.equals(CATEGORIES_PREDICATE) && t.o.isIri(); })
                .map(function (t) { return t.o; }).toArray(),
            args: args,
        };
        var queryIri = graph.triples.find(function (t) { return t.s.equals(iri) && t.p.equals(spin.bodyProp); }).o.value;
        return { template: template, queryIri: queryIri };
    };
    QueryTemplateServiceClass.prototype.extractValueFromIri = function (iri) {
        return /[^/]*$/.exec(iri)[0];
    };
    return QueryTemplateServiceClass;
}(ldp_1.LdpService));
exports.QueryTemplateServiceClass = QueryTemplateServiceClass;
exports.QueryTemplateService = function (context) {
    return new QueryTemplateServiceClass(VocabPlatform.QueryTemplateContainer.value, context);
};
