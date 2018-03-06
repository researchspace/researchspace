Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var immutable_1 = require("immutable");
var Kefir = require("kefir");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var resource_label_1 = require("platform/api/services/resource-label");
var resource_thumbnail_1 = require("platform/api/services/resource-thumbnail");
var Config_1 = require("./Config");
var DEFAULT_THUMBNAIL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
var GLOBAL_GROUP = rdf_1.Rdf.iri('GLOBAL_GROUP');
var NO_GROUP_SET = immutable_1.Set.of(GLOBAL_GROUP);
function parseComponentConfig(defaultStyles, config) {
    var parsedConfig = lodash_1.cloneDeep(config);
    if (_.has(config, 'graphStyle')) {
        parsedConfig.graphStyle =
            mergeStyles(defaultStyles, config.graphStyle);
    }
    else {
        parsedConfig.graphStyle = defaultStyles;
    }
    return parsedConfig;
}
exports.parseComponentConfig = parseComponentConfig;
function mergeStyles(defaultStyles, overrideStyles) {
    var stylesFromAToKeep = lodash_1.filter(defaultStyles, function (d) { return !_.some(overrideStyles, function (o) { return d.selector === o.selector; }); });
    return stylesFromAToKeep.concat(overrideStyles);
}
function getGraphDataWithLabels(config, options) {
    var graphData = getGraphData(config, options);
    var labels = graphData.flatMap(fetchLabels(options));
    var thumbnails = graphData.flatMap(fetchThumbnails(options));
    return Kefir.combine([graphData, labels, thumbnails], addLabelsToGraphData).toProperty();
}
exports.getGraphDataWithLabels = getGraphDataWithLabels;
function addLabelsToGraphData(elements, labels, thumbnails) {
    return lodash_1.map(elements, function (element) {
        element.data.label = labels.get(element.data.node);
        element.data.thumbnail = thumbnails.get(element.data.node) || DEFAULT_THUMBNAIL;
        return element;
    });
}
exports.addLabelsToGraphData = addLabelsToGraphData;
function fetchLabels(options) {
    return function (elements) {
        return fetchLabelsForResources(elements, options).map(function (labels) { return getLabelsForLiterals(elements).merge(labels); });
    };
}
function getLabelsForLiterals(elements) {
    var elementsWithLiterals = lodash_1.filter(elements, function (e) { return e.data.node.isLiteral; });
    return immutable_1.Map(lodash_1.map(elementsWithLiterals, function (e) { return [e.data.node, e.data.node.value]; }));
}
function fetchLabelsForResources(elements, options) {
    var elementsWithIri = lodash_1.filter(elements, function (e) { return e.data.node.isIri(); });
    var iris = lodash_1.map(elementsWithIri, function (e) { return e.data.node; });
    return resource_label_1.getLabels(iris, { semanticContext: options });
}
function fetchThumbnails(options) {
    return function (elements) {
        var elementsWithIri = lodash_1.filter(elements, function (e) { return e.group === 'nodes' && e.data.node.isIri(); });
        var iris = lodash_1.map(elementsWithIri, function (e) { return e.data.node; });
        return resource_thumbnail_1.getThumbnails(iris, { semanticContext: options });
    };
}
function getGraphData(config, options) {
    return sparql_1.SparqlClient.construct(config.query, options).map(prepareGraphData(config));
}
exports.getGraphData = getGraphData;
function prepareGraphData(config) {
    return function (triples) {
        var triplesToShow = lodash_1.filter(triples, getTriplesFilterFunction(config));
        var groups = getGroups(config, triples);
        var nodes = buildNodes(triplesToShow, triples, groups);
        var edges = buildEgdes(triplesToShow, triples, groups);
        return edges.concat(nodes);
    };
}
exports.prepareGraphData = prepareGraphData;
function getGroups(config, triples) {
    if (config.groupBy) {
        return constructGroups(triples, rdf_1.Rdf.fullIri(config.groupBy));
    }
    else {
        return immutable_1.Map();
    }
}
function constructGroups(triples, groupByPredicate) {
    var groupByStatements = lodash_1.filter(triples, function (triple) { return triple.p.equals(groupByPredicate); });
    return lodash_1.reduce(groupByStatements, function (map, triple) {
        var groups = map.has(triple.s) ? map.get(triple.s) : immutable_1.Set();
        return map.set(triple.s, groups.add(triple.o));
    }, immutable_1.Map().asMutable()).asImmutable();
}
function getTriplesFilterFunction(config) {
    if (Config_1.configWithShowPredicates(config)) {
        var showPredicates_1 = lodash_1.map(config.showPredicates, rdf_1.Rdf.fullIri);
        return function (triple) {
            return lodash_1.some(showPredicates_1, function (predicate) { return predicate.equals(triple.p); });
        };
    }
    else if (Config_1.configWithHidePredicates(config)) {
        var hidePredicates_1 = lodash_1.map(config.hidePredicates, rdf_1.Rdf.fullIri);
        return function (triple) {
            return lodash_1.every(hidePredicates_1, function (predicate) { return predicate.equals(triple.p) === false; });
        };
    }
    else {
        return function () { return true; };
    }
}
function buildNodes(triplesToShow, allTriples, groupsMap) {
    var addNode = function (acc, triple) { return acc.add(triple.s).add(triple.o); };
    var resources = lodash_1.reduce(triplesToShow, addNode, immutable_1.Set());
    var groups = groupsMap.reduce(function (acc, groupNodes) { return acc.union(groupNodes); }, immutable_1.Set());
    return groups.union(resources).map(function (r) { return createGraphResourceNodes(r, allTriples, groupsMap.get(r), groupsMap); }).flatten().toArray();
}
function buildEgdes(triplesToShow, allTriples, groupsMap) {
    return immutable_1.Set(triplesToShow).flatMap(function (triple) { return createGraphResourceEdges(triple, allTriples, groupsMap); }).toArray();
}
function createGraphResourceNodes(node, triples, nodeGroups, groupsMap) {
    return nodeGroups ? nodeGroups.map(function (group) { return createGraphNode(node, triples, groupsMap, group); }) : immutable_1.Set.of(createGraphNode(node, triples, groupsMap));
}
function createGraphNode(node, triples, groupsMap, nodeGroup) {
    if (nodeGroup === void 0) { nodeGroup = undefined; }
    var nodeGroupGroup = groupsMap.has(nodeGroup) ? groupsMap.get(nodeGroup).first() : undefined;
    var cytoscapeNode = {
        group: 'nodes',
        data: {
            id: createNodeId(node, nodeGroup),
            parent: nodeGroup ? createNodeId(nodeGroup, nodeGroupGroup) : undefined,
            node: node,
            resource: node.toString(),
            isIri: node.isIri(),
            isLiteral: node.isLiteral(),
            isBnode: node.isBnode(),
        },
    };
    return addPropertiesToTheElementData(triples, cytoscapeNode);
}
function createNodeId(node, nodeGroup) {
    if (nodeGroup === void 0) { nodeGroup = undefined; }
    return nodeGroup && !nodeGroup.equals(GLOBAL_GROUP) ?
        nodeGroup.toString() + node.toString() : node.toString();
}
function createGraphResourceEdges(triple, triples, groupsMap) {
    if (groupsMap.isEmpty()) {
        return immutable_1.Set.of(createGraphEdge(triple.s.toString(), triple.o.toString(), triple.p, triples));
    }
    else {
        return createEdgesWithGroups(triple, triples, groupsMap);
    }
}
function createEdgesWithGroups(triple, triples, groupsMap) {
    var subjectGroups = groupsMap.has(triple.s) ? groupsMap.get(triple.s) : NO_GROUP_SET;
    var objectGroups = groupsMap.has(triple.o) ? groupsMap.get(triple.o) : NO_GROUP_SET;
    var shareTheGroup = !subjectGroups.intersect(objectGroups).isEmpty();
    return subjectGroups.flatMap(function (subjectGroup) {
        return objectGroups.filterNot(function (objectGroup) { return !objectGroup.equals(subjectGroup) && shareTheGroup; }).map(function (objectGroup) {
            return createGraphEdge(createNodeId(triple.s, subjectGroup), createNodeId(triple.o, objectGroup), triple.p, triples);
        });
    });
}
function createGraphEdge(subjectNodeId, objectNodeId, predicate, triples) {
    var cytoscapeEdge = {
        group: 'edges',
        data: {
            id: subjectNodeId + predicate.toString() + objectNodeId,
            node: predicate,
            resource: predicate.toString(),
            source: subjectNodeId,
            target: objectNodeId,
        },
    };
    return addPropertiesToTheElementData(triples, cytoscapeEdge);
}
function addPropertiesToTheElementData(triples, cytoscapeElement) {
    return lodash_1.reduce(triples, function (resultingNode, triple) {
        if (triple.s.equals(resultingNode.data.node)) {
            return updateElementPropertyValue(resultingNode, triple);
        }
        else {
            return resultingNode;
        }
    }, cytoscapeElement);
}
function updateElementPropertyValue(node, triple) {
    var propertyValues = node.data[triple.p.toString()] || [];
    propertyValues.push(triple.o);
    node.data[triple.p.toString()] = propertyValues;
    node.data['->' + triple.p.toString()] = propertyValues.join(' ');
    return node;
}
