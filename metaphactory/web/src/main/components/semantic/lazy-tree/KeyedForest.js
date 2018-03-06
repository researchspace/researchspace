Object.defineProperty(exports, "__esModule", { value: true });
var immutable_1 = require("immutable");
var lodash_1 = require("lodash");
var EMPTY_ROOT = { children: immutable_1.List() };
var KeyedForest = (function () {
    function KeyedForest(keyOf, root) {
        if (root === void 0) { root = KeyedForest.root(); }
        this.keyOf = keyOf;
        this.root = root;
        var mutableNodes = immutable_1.Map([
            [keyOf(root), immutable_1.Set([root])],
        ]).asMutable();
        var mutableParents = immutable_1.Map([
            [root, { parent: undefined, index: 0 }],
        ]).asMutable();
        computeMappingAndPaths(this.keyOf, mutableNodes, mutableParents, root);
        this.nodes = mutableNodes.asImmutable();
        this.parents = mutableParents.asImmutable();
    }
    KeyedForest.create = function (keyOf, root) {
        if (root === void 0) { root = KeyedForest.root(); }
        return new KeyedForest(keyOf, root);
    };
    KeyedForest.root = function () {
        return EMPTY_ROOT;
    };
    KeyedForest.prototype.isRoot = function (node) {
        return node === this.root;
    };
    KeyedForest.prototype.getFirst = function (key) {
        var nodes = this.nodes.get(key);
        return nodes ? nodes.first() : undefined;
    };
    KeyedForest.prototype.getParent = function (node) {
        var reference = this.parents.get(node);
        return reference ? reference.parent : undefined;
    };
    KeyedForest.prototype.getOffsetPath = function (node) {
        var path = [];
        var current = node;
        while (current) {
            var _a = this.parents.get(current), parent_1 = _a.parent, index = _a.index;
            path.unshift(index);
            current = parent_1;
        }
        return path;
    };
    KeyedForest.prototype.fromOffsetPath = function (path) {
        var current = this.root;
        for (var i = 1; i < path.length; i++) {
            current = current.children.get(path[i]);
        }
        return current;
    };
    KeyedForest.prototype.getNodePath = function (node) {
        var path = [];
        var current = node;
        do {
            path.unshift(current);
            var parent_2 = this.parents.get(current).parent;
            current = parent_2;
        } while (current);
        return path;
    };
    KeyedForest.prototype.setRoot = function (root) {
        return new KeyedForest(this.keyOf, root);
    };
    KeyedForest.prototype.updateNode = function (path, update) {
        if (path.length === 0) {
            throw new Error('OffsetPath cannot be empty');
        }
        var root = this.updateNodeAt(this.root, path, 1, update);
        return this.setRoot(root);
    };
    KeyedForest.prototype.updateNodeAt = function (node, path, pathIndex, update) {
        var _this = this;
        if (pathIndex === path.length) {
            return update(node);
        }
        else {
            var index = path[pathIndex];
            var children = node.children.update(index, function (child) { return _this.updateNodeAt(child, path, pathIndex + 1, update); });
            return lodash_1.assign({}, node, { children: children });
        }
    };
    KeyedForest.prototype.updateChildren = function (path, update) {
        if (path.length === 0) {
            throw new Error('OffsetPath cannot be empty');
        }
        return this.updateNode(path, function (node) {
            return lodash_1.assign({}, node, { children: update(node.children) });
        });
    };
    return KeyedForest;
}());
exports.KeyedForest = KeyedForest;
function computeMappingAndPaths(keyOf, mutableMapping, mutableParents, parent) {
    if (!parent.children) {
        return;
    }
    parent.children.forEach(function (node, index) {
        mutableParents.set(node, { parent: parent, index: index });
        mutableMapping.update(keyOf(node), immutable_1.Set(), function (items) { return items.add(node); });
        computeMappingAndPaths(keyOf, mutableMapping, mutableParents, node);
    });
}
