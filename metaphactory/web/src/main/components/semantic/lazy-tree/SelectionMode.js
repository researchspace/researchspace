Object.defineProperty(exports, "__esModule", { value: true });
var TreeSelection_1 = require("./TreeSelection");
var CheckState;
(function (CheckState) {
    CheckState[CheckState["None"] = 0] = "None";
    CheckState[CheckState["Partial"] = 1] = "Partial";
    CheckState[CheckState["Full"] = 2] = "Full";
    CheckState[CheckState["FullGreyedOut"] = 3] = "FullGreyedOut";
})(CheckState = exports.CheckState || (exports.CheckState = {}));
var singleFullSubtree = {
    renderSelected: function (forest, selection, item, defaultSelected) {
        if (defaultSelected) {
            return CheckState.Full;
        }
        if (selection) {
            var selected = selection.nodes.get(forest.keyOf(item));
            if (!selected || selected.size === 0) {
                return CheckState.None;
            }
            return selected.some(TreeSelection_1.TreeSelection.isLeaf)
                ? CheckState.Full : CheckState.Partial;
        }
        else {
            return CheckState.None;
        }
    },
    change: function (forest, previous, item, defaultSelected) {
        var selected = TreeSelection_1.TreeSelection.nodesFromKey(previous, forest.keyOf(item));
        var empty = TreeSelection_1.TreeSelection.empty(forest.keyOf);
        if (renderedAsChecked(selected)) {
            return empty;
        }
        return TreeSelection_1.TreeSelection.selectTerminal(empty, forest.getNodePath(item));
    },
};
function SingleFullSubtree() {
    return singleFullSubtree;
}
exports.SingleFullSubtree = SingleFullSubtree;
var multipleFullSubtrees = {
    renderSelected: function (forest, selection, item, defaultSelected) {
        if (defaultSelected) {
            return CheckState.FullGreyedOut;
        }
        return singleFullSubtree.renderSelected(forest, selection, item, defaultSelected);
    },
    change: function (forest, previous, item, defaultSelected) {
        if (defaultSelected) {
            return undefined;
        }
        var selected = TreeSelection_1.TreeSelection.nodesFromKey(previous, forest.keyOf(item));
        if (renderedAsChecked(selected)) {
            return TreeSelection_1.TreeSelection.unselect(previous, forest.keyOf(item));
        }
        else {
            return TreeSelection_1.TreeSelection.selectTerminal(previous, forest.getNodePath(item));
        }
    },
};
function MultipleFullSubtrees() {
    return multipleFullSubtrees;
}
exports.MultipleFullSubtrees = MultipleFullSubtrees;
var multiplePartialSubtrees = {
    renderSelected: singleFullSubtree.renderSelected,
    change: function (forest, previous, item, defaultSelected) {
        if (defaultSelected) {
            return TreeSelection_1.TreeSelection.excludeFromTerminal(previous, forest, item);
        }
        var itemKey = forest.keyOf(item);
        var selected = TreeSelection_1.TreeSelection.nodesFromKey(previous, itemKey);
        if (renderedAsChecked(selected)) {
            return TreeSelection_1.TreeSelection.unselect(previous, itemKey);
        }
        else {
            return TreeSelection_1.TreeSelection.selectAndCollapseToTerminal(previous, forest, item);
        }
    },
};
function MultiplePartialSubtrees() {
    return multiplePartialSubtrees;
}
exports.MultiplePartialSubtrees = MultiplePartialSubtrees;
var SinglePartialSubtree = (function () {
    function SinglePartialSubtree() {
    }
    Object.defineProperty(SinglePartialSubtree.prototype, "selectedRootKey", {
        get: function () {
            return this._selectedRootKey;
        },
        enumerable: true,
        configurable: true
    });
    SinglePartialSubtree.prototype.renderSelected = function (forest, selection, item, defaultSelected) {
        var state = singleFullSubtree.renderSelected(forest, selection, item, defaultSelected);
        var checkedOutsideSubtree = state &&
            forest.keyOf(item) !== this.selectedRootKey &&
            !TreeSelection_1.TreeSelection.childOfParent(forest, item, this.selectedRootKey);
        return checkedOutsideSubtree ? CheckState.None : state;
    };
    SinglePartialSubtree.prototype.change = function (forest, previous, item, defaultSelected) {
        if (defaultSelected) {
            return TreeSelection_1.TreeSelection.excludeFromTerminal(previous, forest, item, { leaveParentSelected: true });
        }
        var itemKey = forest.keyOf(item);
        var selected = TreeSelection_1.TreeSelection.nodesFromKey(previous, itemKey);
        if (itemKey === this.selectedRootKey) {
            this._selectedRootKey = undefined;
            return TreeSelection_1.TreeSelection.empty(forest.keyOf);
        }
        else if (TreeSelection_1.TreeSelection.childOfParent(forest, item, this.selectedRootKey)) {
            if (renderedAsChecked(selected)) {
                var next = TreeSelection_1.TreeSelection.unselect(previous, itemKey);
                var parent_1 = forest.getParent(item);
                if (!next.nodes.has(forest.keyOf(parent_1))) {
                    next = TreeSelection_1.TreeSelection.select(next, forest.getNodePath(parent_1));
                }
                return next;
            }
            else {
                return TreeSelection_1.TreeSelection.selectAndCollapseToTerminal(previous, forest, item);
            }
        }
        else {
            this._selectedRootKey = forest.keyOf(item);
            var empty = TreeSelection_1.TreeSelection.empty(forest.keyOf);
            return TreeSelection_1.TreeSelection.selectTerminal(empty, forest.getNodePath(item));
        }
    };
    return SinglePartialSubtree;
}());
exports.SinglePartialSubtree = SinglePartialSubtree;
function renderedAsChecked(nodes) {
    return nodes.size > 0 && nodes.some(TreeSelection_1.TreeSelection.isLeaf);
}
