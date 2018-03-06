Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var immutable_1 = require("immutable");
var KeyedForest_1 = require("./KeyedForest");
var TreeSelection;
(function (TreeSelection) {
    function empty(keyOf) {
        return KeyedForest_1.KeyedForest.create(keyOf);
    }
    TreeSelection.empty = empty;
    function isTerminal(node) {
        return !node.children;
    }
    TreeSelection.isTerminal = isTerminal;
    function isLeaf(node) {
        return isTerminal(node) || node.children.size === 0;
    }
    TreeSelection.isLeaf = isLeaf;
    function leafs(selection) {
        return selection.nodes
            .map(function (nodes) { return nodes.find(isLeaf); })
            .filter(function (node) { return !(node === undefined || selection.isRoot(node)); })
            .toList();
    }
    TreeSelection.leafs = leafs;
    function nodesFromKey(selection, key) {
        if (!selection) {
            return immutable_1.Set();
        }
        return selection.nodes.get(key, immutable_1.Set());
    }
    TreeSelection.nodesFromKey = nodesFromKey;
    function select(selection, path) {
        var parent = undefined;
        var addedPath = path.slice();
        while (addedPath.length > 0) {
            var node = addedPath[0];
            var key = selection.keyOf(node);
            var candidates = selection.nodes.get(key, immutable_1.Set());
            var selectedBranch = candidates.find(function (candidate) { return selection.getParent(candidate) === parent; });
            if (!selectedBranch) {
                break;
            }
            parent = selectedBranch;
            if (TreeSelection.isTerminal(parent)) {
                return selection;
            }
            addedPath.shift();
        }
        if (addedPath.length === 0) {
            return selection;
        }
        var addedNode = addedPath.reduceRight(function (previous, node) {
            return (tslib_1.__assign({}, node, { children: immutable_1.List(previous ? [previous] : []) }));
        }, undefined);
        return selection.updateChildren(selection.getOffsetPath(parent), function (children) { return addedNode ? children.push(addedNode) : undefined; });
    }
    TreeSelection.select = select;
    function makeTerminal(selection, key) {
        var removeChildren = function () { return undefined; };
        return selection.nodes.get(key, immutable_1.Set()).reduce(function (acc, node) { return acc.updateChildren(acc.getOffsetPath(node), removeChildren); }, selection);
    }
    TreeSelection.makeTerminal = makeTerminal;
    function selectTerminal(selection, path) {
        var lastNode = path[path.length - 1];
        return makeTerminal(select(selection, path), selection.keyOf(lastNode));
    }
    TreeSelection.selectTerminal = selectTerminal;
    function unselect(selection, key) {
        var current = selection;
        while (true) {
            var nodes = current.nodes.get(key);
            if (!nodes || nodes.size === 0) {
                return current;
            }
            var unselectedNode = nodes.first();
            if (current.isRoot(unselectedNode)) {
                return isTerminal(current.root)
                    ? current.setRoot(tslib_1.__assign({}, current.root, { children: immutable_1.List() }))
                    : current;
            }
            var pathToRemove = current.getNodePath(unselectedNode).slice();
            var removedNode = pathToRemove.pop();
            for (var _i = 0, _a = pathToRemove.reverse(); _i < _a.length; _i++) {
                var node = _a[_i];
                if (current.isRoot(node)) {
                    break;
                }
                if (node.children && node.children.size > 1) {
                    break;
                }
                removedNode = node;
            }
            current = excludeNode(current, removedNode);
        }
    }
    TreeSelection.unselect = unselect;
    function excludeNode(selection, node) {
        var filterNode = function (children) { return children
            .filter(function (child) { return child !== node; }).toList(); };
        var parent = selection.getParent(node);
        return selection.updateChildren(selection.getOffsetPath(parent), filterNode);
    }
    function selectAndCollapseToTerminal(selection, forest, subtree) {
        var withSubtree = selectTerminal(selection, forest.getNodePath(subtree));
        var parent = forest.getParent(subtree);
        if (forest.isRoot(parent)) {
            return withSubtree;
        }
        var allChildrenSelected = parent.children.every(function (node) { return withSubtree.nodes.has(forest.keyOf(node)); });
        return allChildrenSelected
            ? selectAndCollapseToTerminal(withSubtree, forest, parent)
            : withSubtree;
    }
    TreeSelection.selectAndCollapseToTerminal = selectAndCollapseToTerminal;
    function excludeFromTerminal(selection, forest, defaultSelectedSubtree, options) {
        if (options === void 0) { options = {}; }
        var parent = forest.getParent(defaultSelectedSubtree);
        var parentKey = forest.keyOf(parent);
        var withoutParent = selection.nodes.has(parentKey)
            ? unselect(selection, parentKey)
            : excludeFromTerminal(selection, forest, parent, options);
        var optionallyWithJustParent = options.leaveParentSelected
            ? select(withoutParent, forest.getNodePath(parent))
            : withoutParent;
        return parent.children
            .filter(function (child) { return child !== defaultSelectedSubtree; })
            .reduce(function (acc, child) { return selectTerminal(acc, forest.getNodePath(child)); }, optionallyWithJustParent);
    }
    TreeSelection.excludeFromTerminal = excludeFromTerminal;
    function childOfParent(forest, child, parentKey) {
        if (!parent) {
            return false;
        }
        var currentParent = forest.getParent(child);
        while (currentParent) {
            if (forest.keyOf(currentParent) === parentKey) {
                return true;
            }
            currentParent = forest.getParent(currentParent);
        }
        return false;
    }
    TreeSelection.childOfParent = childOfParent;
})(TreeSelection = exports.TreeSelection || (exports.TreeSelection = {}));
