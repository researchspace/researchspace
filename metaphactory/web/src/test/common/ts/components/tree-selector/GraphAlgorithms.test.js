Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var lazy_tree_1 = require("platform/components/semantic/lazy-tree");
function graphFromUnorderedJSON(graph) {
    var allNodes = new Map();
    function getNode(key) {
        if (allNodes.has(key)) {
            return allNodes.get(key);
        }
        else {
            var node = { key: key, children: new Set() };
            allNodes.set(key, node);
            return node;
        }
    }
    function readJSON(root, parentKey) {
        for (var key in root) {
            if (root.hasOwnProperty(key)) {
                var node = getNode(key);
                readJSON(root[key], key);
                if (parentKey) {
                    getNode(parentKey).children.add(node);
                }
            }
        }
    }
    readJSON(graph);
    return Array.from(allNodes.values());
}
function graphToUnorderedEdges(nodes) {
    if (nodes.length === 0) {
        return null;
    }
    var root = {};
    var _loop_1 = function (source) {
        var children = {};
        source.children.forEach(function (target) {
            children[target.key] = null;
        });
        root[source.key] = children;
    };
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var source = nodes_1[_i];
        _loop_1(source);
    }
    return root;
}
describe('GraphAlgorithms', function () {
    describe('transitive reduction', function () {
        it('reducts single transitive relation', function () {
            var graph = graphFromUnorderedJSON({
                A: {
                    B: {
                        C: { D: null },
                        D: null,
                    },
                    C: null,
                    D: null,
                },
            });
            lazy_tree_1.transitiveReduction(graph);
            chai_1.expect(graphToUnorderedEdges(graph)).to.be.deep.equal({
                A: { B: null },
                B: { C: null },
                C: { D: null },
                D: {},
            });
        });
        it('reducts multiple transitive relations', function () {
            var graph = graphFromUnorderedJSON({
                A: {
                    B: {
                        C: {
                            D: null,
                            E: {
                                F: {
                                    G: { H: null },
                                    H: null,
                                },
                                G: null,
                                H: null,
                            },
                        },
                        D: null,
                    },
                    C: null,
                    D: null,
                },
            });
            lazy_tree_1.transitiveReduction(graph);
            chai_1.expect(graphToUnorderedEdges(graph)).to.be.deep.equal({
                A: { B: null },
                B: { C: null },
                C: { D: null, E: null },
                D: {},
                E: { F: null },
                F: { G: null },
                G: { H: null },
                H: {},
            });
        });
        it('reducts non-tree transitive relations', function () {
            var graph = graphFromUnorderedJSON({
                A: {
                    B: {
                        C: { D: null },
                        F: null,
                        D: null,
                    },
                    E: {
                        F: { D: null },
                        C: null,
                        D: null,
                    },
                },
            });
            lazy_tree_1.transitiveReduction(graph);
            chai_1.expect(graphToUnorderedEdges(graph)).to.be.deep.equal({
                A: { B: null, E: null },
                B: { C: null, F: null },
                C: { D: null },
                D: {},
                E: { C: null, F: null },
                F: { D: null },
            });
        });
    });
    it('finds roots in DAG', function () {
        var graph = graphFromUnorderedJSON({
            B: {
                C: { D: null },
                F: null,
                D: null,
            },
            E: {
                F: { D: null },
                C: null,
                D: null,
            },
        });
        var rootKeys = Array.from(lazy_tree_1.findRoots(graph).values()).map(function (root) { return root.key; });
        rootKeys.sort();
        chai_1.expect(rootKeys).to.be.deep.equal(['B', 'E']);
    });
});
