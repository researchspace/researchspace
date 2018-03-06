Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var Kefir = require("kefir");
var rdf_1 = require("platform/api/rdf");
var ldp_1 = require("platform/api/services/ldp");
var vocabularies_1 = require("../data/vocabularies/vocabularies");
var LdpAnnotationServiceClass = (function (_super) {
    tslib_1.__extends(LdpAnnotationServiceClass, _super);
    function LdpAnnotationServiceClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LdpAnnotationServiceClass.prototype.addAnnotation = function (annotation) {
        return this.serializeAnnotation(annotation).flatMap(this.addResource).toProperty();
    };
    LdpAnnotationServiceClass.prototype.updateAnnotation = function (annotationIri, annotation) {
        var _this = this;
        return this.serializeAnnotation(annotation).flatMap(function (graph) { return _this.update(annotationIri, graph); }).toProperty();
    };
    LdpAnnotationServiceClass.prototype.serializeAnnotation = function (annotation) {
        var _this = this;
        var metadata = annotation.metadata
            ? rdf_1.turtle.deserialize.turtleToGraph(annotation.metadata)
            : Kefir.constant(rdf_1.Rdf.graph());
        return metadata.map(function (mGraph) { return rdf_1.Rdf.union(mGraph, _this.annotationToGraph(annotation)); });
    };
    LdpAnnotationServiceClass.prototype.annotationToGraph = function (annotation) {
        var annotationIri = rdf_1.Rdf.iri('');
        var bodyResource = rdf_1.Rdf.iri('http://www.metaphacts.com/');
        var triples = [rdf_1.Rdf.triple(annotationIri, rdf_1.vocabularies.rdf.type, rdf_1.vocabularies.oa.Annotation)];
        if (annotation.label) {
            triples.push(rdf_1.Rdf.triple(annotationIri, rdf_1.vocabularies.rdfs.label, rdf_1.Rdf.literal(annotation.label)));
        }
        if (annotation.target) {
            triples.push(rdf_1.Rdf.triple(annotationIri, rdf_1.vocabularies.oa.hasTarget, annotation.target));
        }
        if (annotation.html) {
            triples.push(rdf_1.Rdf.triple(annotationIri, rdf_1.vocabularies.oa.hasBody, bodyResource));
            triples.push(rdf_1.Rdf.triple(bodyResource, rdf_1.vocabularies.rdf.type, rdf_1.vocabularies.oa.TextualBody));
            triples.push(rdf_1.Rdf.triple(bodyResource, rdf_1.vocabularies.oa.text, rdf_1.Rdf.literal(annotation.html)));
            triples.push(rdf_1.Rdf.triple(bodyResource, rdf_1.vocabularies.dc.format, rdf_1.Rdf.literal('text/html')));
        }
        annotation.rdfa.forEach(function (rdfaItem) {
            triples.push(rdf_1.Rdf.triple(annotationIri, rdfaItem.predicate, rdfaItem.object));
        });
        return rdf_1.Rdf.graph.apply(rdf_1.Rdf, triples);
    };
    LdpAnnotationServiceClass.prototype.getAnnotation = function (annotationIri) {
        var _this = this;
        return this.get(annotationIri).map(function (graph) { return _this.parseGraphToAnnotation(annotationIri, graph); });
    };
    LdpAnnotationServiceClass.prototype.parseGraphToAnnotation = function (annotationIri, graph) {
        var targetTriple = graph.triples.find(function (t) { return t.s.equals(annotationIri) && t.p.equals(rdf_1.vocabularies.oa.hasTarget); });
        var bodyTriple = graph.triples.find(function (t) { return t.s.equals(annotationIri) && t.p.equals(rdf_1.vocabularies.oa.hasBody); });
        var labelTriple = graph.triples.find(function (t) { return t.s.equals(annotationIri) && t.p.equals(rdf_1.vocabularies.rdfs.label); });
        var htmlTriple = graph.triples.find(function (t) { return t.p.equals(rdf_1.vocabularies.oa.text); });
        return {
            target: targetTriple ? targetTriple.o : undefined,
            body: bodyTriple ? bodyTriple.o : undefined,
            label: labelTriple ? labelTriple.o.value : undefined,
            html: htmlTriple ? htmlTriple.o.value : undefined,
            rdfa: graph.triples.filterNot(function (t) {
                return t.s.equals(annotationIri) &&
                    !t.p.equals(rdf_1.vocabularies.rdfs.label) && !t.p.equals(rdf_1.vocabularies.rdf.type) &&
                    !t.p.equals(rdf_1.vocabularies.oa.hasTarget) && !t.p.equals(rdf_1.vocabularies.oa.hasBody);
            }).map(function (t) {
                return {
                    predicate: t.p,
                    object: t.o,
                };
            }).toJS(),
        };
    };
    return LdpAnnotationServiceClass;
}(ldp_1.LdpService));
exports.LdpAnnotationServiceClass = LdpAnnotationServiceClass;
exports.LdpAnnotationService = new LdpAnnotationServiceClass(vocabularies_1.rso.AnnotationsContainer.value);
exports.default = exports.LdpAnnotationService;
