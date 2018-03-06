Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var lodash_1 = require("lodash");
var immutable_1 = require("immutable");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var KeyedForest_1 = require("./KeyedForest");
var LazyTreeSelector_1 = require("./LazyTreeSelector");
var GraphAlgorithms_1 = require("./GraphAlgorithms");
var Node;
(function (Node) {
    function set(node, props) {
        return lodash_1.assign({}, node, props);
    }
    Node.set = set;
})(Node = exports.Node || (exports.Node = {}));
exports.NodeTreeSelector = LazyTreeSelector_1.LazyTreeSelector;
var ROOT_IRI = rdf_1.Rdf.iri('tree:root');
exports.EmptyForest = KeyedForest_1.KeyedForest.create(function (node) { return (node.iri || ROOT_IRI).value; });
function queryMoreChildren(forest, path, rootsQuery, childrenQuery, limit, options) {
    var node = forest.fromOffsetPath(path);
    if (node.loading || node.error) {
        return [forest, Kefir.constant(function (r) { return r; })];
    }
    var newForest = forest.updateNode(path, function (target) { return Node.set(target, { loading: true }); });
    var parametrized = forest.isRoot(node)
        ? rootsQuery : sparql_1.SparqlClient.setBindings(childrenQuery, { 'parent': node.iri });
    parametrized.limit = limit;
    parametrized.offset = node.children ? node.children.size : 0;
    parametrized.variables = ['?item', '?label', '?hasChildren'];
    var change = sparql_1.SparqlClient.select(parametrized, options)
        .map(function (queryResult) { return ({ nodes: nodesFromQueryResult(queryResult) }); })
        .flatMapErrors(function (error) { return Kefir.constant({ error: error }); })
        .map(function (_a) {
        var nodes = _a.nodes, error = _a.error;
        return function (currentForest) { return currentForest.updateNode(path, function (target) {
            if (error) {
                console.error(error);
                return Node.set(target, { loading: false, error: error });
            }
            else {
                var initialChildren = target.children ? target.children : immutable_1.List();
                var children = mergeRemovingDuplicates(initialChildren, nodes);
                return Node.set(target, {
                    loading: false, error: undefined, children: children,
                    hasMoreItems: children.size !== initialChildren.size && nodes.size === limit,
                });
            }
        }); };
    })
        .toProperty();
    return [newForest, change];
}
exports.queryMoreChildren = queryMoreChildren;
function mergeRemovingDuplicates(oldNodes, newNodes) {
    var existingKeys = {};
    oldNodes.forEach(function (node) { existingKeys[node.iri.value] = node; });
    return oldNodes.withMutations(function (nodes) {
        newNodes.forEach(function (node) {
            if (!existingKeys[node.iri.value]) {
                existingKeys[node.iri.value] = node;
                nodes.push(node);
            }
        });
    });
}
exports.mergeRemovingDuplicates = mergeRemovingDuplicates;
function nodesFromQueryResult(result) {
    return immutable_1.List(result.results.bindings.map(function (binding) {
        var item = binding.item, label = binding.label, hasChildren = binding.hasChildren;
        if (!(item && item.isIri())) {
            return undefined;
        }
        var nodeLabel = (label && label.isLiteral()) ? label : undefined;
        if (hasChildren && hasChildren.value === 'false') {
            return { iri: item, label: nodeLabel, children: immutable_1.List(), hasMoreItems: false };
        }
        else {
            return { iri: item, label: nodeLabel, hasMoreItems: true };
        }
    }).filter(function (node) { return node !== undefined; }));
}
exports.nodesFromQueryResult = nodesFromQueryResult;
function restoreForestFromLeafs(leafs, parentsQuery, cancellation, options) {
    var initialOrphans = leafs
        .groupBy(function (node) { return node.iri.value; })
        .map(function (group) { return group.first(); })
        .map(function (_a) {
        var iri = _a.iri, label = _a.label, score = _a.score, hasMoreItems = _a.hasMoreItems;
        return ({
            iri: iri, label: label, score: score, hasMoreItems: hasMoreItems,
            children: new Set(),
        });
    })
        .toArray();
    if (initialOrphans.length === 0) {
        return Kefir.constant(immutable_1.List());
    }
    return restoreGraphFromLeafs(initialOrphans, parentsQuery, cancellation, options)
        .map(function (nodes) {
        var graph = Array.from(nodes.values());
        GraphAlgorithms_1.breakGraphCycles(graph);
        GraphAlgorithms_1.transitiveReduction(graph);
        var roots = GraphAlgorithms_1.findRoots(graph);
        return asImmutableForest(roots);
    });
}
exports.restoreForestFromLeafs = restoreForestFromLeafs;
function restoreGraphFromLeafs(leafs, parentsQuery, cancellation, options) {
    return Kefir.stream(function (emitter) {
        var nodes = new Map(leafs.map(function (node) { return [node.iri.value, node]; }));
        var unresolvedOrphans = new Set(nodes.keys());
        var disposed = false;
        cancellation.onCancel(function () { disposed = true; });
        var onError = function (error) {
            disposed = true;
            emitter.error(error);
            emitter.end();
        };
        var onResult;
        var request = function (orphanKeys) {
            var parametrized = sparql_1.SparqlClient.prepareParsedQuery(orphanKeys.map(function (key) { return ({ 'item': rdf_1.Rdf.iri(key) }); }))(parentsQuery);
            sparql_1.SparqlClient.select(parametrized, options)
                .map(function (result) { return ({ result: result, requested: orphanKeys }); })
                .onValue(onResult)
                .onError(onError);
        };
        onResult = function (_a) {
            var result = _a.result, requested = _a.requested;
            if (disposed) {
                return;
            }
            for (var _i = 0, _b = result.results.bindings; _i < _b.length; _i++) {
                var _c = _b[_i], item = _c.item, parent_1 = _c.parent, parentLabel = _c.parentLabel;
                if (!(item.isIri() && parent_1.isIri())) {
                    continue;
                }
                unresolvedOrphans.delete(item.value);
                var node = nodes.get(item.value);
                var existingNode = nodes.get(parent_1.value);
                if (existingNode) {
                    existingNode.children.add(node);
                }
                else {
                    var parentOrphan = {
                        iri: parent_1,
                        label: (parentLabel && parentLabel.isLiteral()) ? parentLabel : undefined,
                        hasMoreItems: false,
                        children: new Set([nodes.get(item.value)]),
                    };
                    nodes.set(parentOrphan.iri.value, parentOrphan);
                    unresolvedOrphans = unresolvedOrphans.add(parentOrphan.iri.value);
                }
            }
            for (var _d = 0, requested_1 = requested; _d < requested_1.length; _d++) {
                var requestedKey = requested_1[_d];
                unresolvedOrphans.delete(requestedKey);
            }
            if (unresolvedOrphans.size === 0) {
                emitter.emit(nodes);
                emitter.end();
            }
            else {
                request(Array.from(unresolvedOrphans.values()));
            }
        };
        request(leafs.map(function (orphan) { return orphan.iri.value; }));
        return function () { disposed = true; };
    }).toProperty();
}
function asImmutableForest(roots) {
    return immutable_1.List(Array.from(roots).map(function (root) {
        var children = asImmutableForest(root.children).sortBy(function (node) { return -node.score; }).toList();
        var total = children.reduce(function (sum, _a) {
            var score = _a.score;
            return sum + score;
        }, 0);
        var hasMoreItems = root.hasMoreItems && root.children.size === 0;
        return {
            iri: root.iri,
            label: root.label,
            children: children,
            expanded: !hasMoreItems,
            hasMoreItems: hasMoreItems,
            score: total + (root.score === undefined ? 0 : root.score),
        };
    }));
}
