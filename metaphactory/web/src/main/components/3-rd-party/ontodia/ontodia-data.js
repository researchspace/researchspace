Object.defineProperty(exports, "__esModule", { value: true });
var maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var vocabularies_1 = require("platform/api/rdf/vocabularies/vocabularies");
var sparql_1 = require("platform/api/sparql");
var ldp_1 = require("platform/api/services/ldp");
var ontodia_ns_1 = require("./ontodia-ns");
function getLayoutByDiagram(diagram, context) {
    var ldpService = new ldp_1.LdpService(vocabularies_1.VocabPlatform.OntodiaDiagramContainer.value, context);
    return new Promise(function (resolve, reject) {
        ldpService.get(rdf_1.Rdf.iri(diagram)).onValue(function (g) {
            var data = g.triples.find(function (t) { return t.p.equals(ontodia_ns_1.default.diagramLayoutString); }).o;
            var label = g.triples.find(function (t) { return t.p.equals(vocabularies_1.rdfs.label); }).o;
            var layout = JSON.parse(data.value);
            resolve({
                label: label.value,
                layoutData: layout.layoutData,
                linkSettings: layout.linkSettings,
            });
        });
    });
}
exports.getLayoutByDiagram = getLayoutByDiagram;
function getRDFGraphBySparqlQuery(query) {
    return new Promise(function (resolve, reject) {
        sparql_1.SparqlClient.construct(query).onValue(function (g) {
            var graph = [];
            g.forEach(function (triple) {
                graph.push({
                    subject: {
                        'type': triple.s.isIri() ? 'uri' : 'literal',
                        'value': triple.s.value,
                    },
                    predicate: {
                        'type': triple.p.isIri() ? 'uri' : 'literal',
                        'value': triple.p.value,
                    },
                    object: {
                        'type': triple.o.isIri() ? 'uri' : 'literal',
                        'value': triple.o.value,
                    },
                });
            });
            resolve(graph);
        });
    });
}
exports.getRDFGraphBySparqlQuery = getRDFGraphBySparqlQuery;
function prepareImages(elementsInfo, imageQuery) {
    var images = {}, params = [], ids = Object.keys(elementsInfo);
    ids.forEach(function (id) {
        params.push({
            'element': rdf_1.Rdf.iri(id),
        });
    });
    return new Promise(function (resolve, reject) {
        sparql_1.SparqlClient.prepareQuery(imageQuery, params).onValue(function (query) {
            sparql_1.SparqlClient.select(query).onValue(function (response) {
                var elements = response.results.bindings;
                elements.forEach(function (elem) {
                    images[elem['element'].value] = elem['image'].value;
                });
                resolve(images);
            });
        });
    });
}
exports.prepareImages = prepareImages;
function createDiagramTriples(name, layout) {
    var subject = rdf_1.Rdf.iri('');
    var layoutJson = JSON.stringify(layout);
    return [
        rdf_1.Rdf.triple(subject, vocabularies_1.rdf.type, ontodia_ns_1.default.diagram),
        rdf_1.Rdf.triple(subject, vocabularies_1.rdfs.label, rdf_1.Rdf.literal(name)),
        rdf_1.Rdf.triple(subject, ontodia_ns_1.default.diagramLayoutString, rdf_1.Rdf.literal(layoutJson)),
    ];
}
function createResource(name, layout, metadata, context) {
    var graph = rdf_1.Rdf.graph(metadata.concat(createDiagramTriples(name, layout)));
    return new ldp_1.LdpService(vocabularies_1.VocabPlatform.OntodiaDiagramContainer.value, context)
        .addResource(graph, maybe.Just(name));
}
exports.createResource = createResource;
function createContainer(context) {
    return new ldp_1.LdpService(vocabularies_1.VocabPlatform.RootContainer.value, context).addResource(rdf_1.Rdf.graph([
        rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), vocabularies_1.rdf.type, vocabularies_1.ldp.Container),
        rdf_1.Rdf.triple(rdf_1.Rdf.iri(''), vocabularies_1.rdfs.label, rdf_1.Rdf.literal('LDP Container for resources of type ' +
            vocabularies_1.VocabPlatform.OntodiaDiagramContainer)),
    ]), maybe.Just(vocabularies_1.VocabPlatform.OntodiaDiagramContainer.value));
}
exports.createContainer = createContainer;
function saveDiagram(name, layout, metadata, context) {
    return new ldp_1.LdpService(vocabularies_1.VocabPlatform.RootContainer.value).options(vocabularies_1.VocabPlatform.OntodiaDiagramContainer).flatMap(function (v) { return createResource(name, layout, metadata, context); }).flatMapErrors(function (e) { return createContainer(context).flatMap(function (containerIri) {
        return createResource(name, layout, metadata, context);
    }); }).toProperty();
}
exports.saveDiagram = saveDiagram;
function updateDiagram(diagram, layout, label, metadata, context) {
    var data = rdf_1.Rdf.graph(metadata.concat(createDiagramTriples(label, layout)));
    return new ldp_1.LdpService(vocabularies_1.VocabPlatform.OntodiaDiagramContainer.value, context)
        .update(rdf_1.Rdf.iri(diagram), data)
        .map(function () { });
}
exports.updateDiagram = updateDiagram;
