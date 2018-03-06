Object.defineProperty(exports, "__esModule", { value: true });
function breakGraphCycles(graph) {
    var visiting = new Set();
    var visited = new Set();
    var edgesToRemove = [];
    var toVisit = graph.slice();
    var _loop_1 = function () {
        var node = toVisit.pop();
        if (visited.has(node)) {
            return "continue";
        }
        if (visiting.has(node)) {
            visiting.delete(node);
            visited.add(node);
        }
        else {
            visiting.add(node);
            toVisit.push(node);
            node.children.forEach(function (child) {
                if (visiting.has(child)) {
                    edgesToRemove.push([node, child]);
                }
                else if (!visited.has(child)) {
                    toVisit.push(child);
                }
            });
        }
    };
    while (toVisit.length > 0) {
        _loop_1();
    }
    for (var _i = 0, edgesToRemove_1 = edgesToRemove; _i < edgesToRemove_1.length; _i++) {
        var _a = edgesToRemove_1[_i], parent_1 = _a[0], child = _a[1];
        parent_1.children.delete(child);
    }
}
exports.breakGraphCycles = breakGraphCycles;
function transitiveReduction(graph) {
    var edgesToRemove = [];
    var visited = new Set();
    function searchForRedundantEdges(parent, currentChild) {
        visited.add(currentChild);
        currentChild.children.forEach(function (grandChild) {
            if (visited.has(grandChild)) {
                return;
            }
            if (parent.children.has(grandChild)) {
                edgesToRemove.push([parent, grandChild]);
            }
            searchForRedundantEdges(parent, grandChild);
        });
    }
    var _loop_2 = function (node) {
        node.children.forEach(function (child) {
            visited.clear();
            searchForRedundantEdges(node, child);
        });
    };
    for (var _i = 0, graph_1 = graph; _i < graph_1.length; _i++) {
        var node = graph_1[_i];
        _loop_2(node);
    }
    for (var _a = 0, edgesToRemove_2 = edgesToRemove; _a < edgesToRemove_2.length; _a++) {
        var _b = edgesToRemove_2[_a], parent_2 = _b[0], child = _b[1];
        parent_2.children.delete(child);
    }
}
exports.transitiveReduction = transitiveReduction;
function findRoots(graph) {
    var roots = new Set(graph);
    graph.forEach(function (node) {
        node.children.forEach(function (child) { return roots.delete(child); });
    });
    return roots;
}
exports.findRoots = findRoots;
