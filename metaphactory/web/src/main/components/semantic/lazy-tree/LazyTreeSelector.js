Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var immutable_1 = require("immutable");
var classnames = require("classnames");
var Spinner_1 = require("../../ui/spinner/Spinner");
var TreeSelection_1 = require("./TreeSelection");
var SelectionMode_1 = require("./SelectionMode");
var styles = require("./LazyTreeSelector.scss");
var LazyTreeSelector = (function (_super) {
    tslib_1.__extends(LazyTreeSelector, _super);
    function LazyTreeSelector(props) {
        var _this = _super.call(this, props) || this;
        _this.checkAnchorsVisibility = function () {
            if (!_this.container) {
                return;
            }
            _this.loadMoreAnchors.forEach(function (path, anchor) {
                if (isVerticallyScrolledIntoView(anchor, _this.container)) {
                    _this.props.requestMore(path);
                }
            });
        };
        _this.state = {
            expandedItems: immutable_1.Map(),
        };
        return _this;
    }
    LazyTreeSelector.prototype.render = function () {
        var _this = this;
        this.loadMoreAnchors = immutable_1.Map();
        return react_1.DOM.div({
            ref: function (container) { _this.container = container; },
        }, this.renderChildren(this.props.forest.root));
    };
    LazyTreeSelector.prototype.componentDidMount = function () {
        document.addEventListener('scroll', this.checkAnchorsVisibility, true);
        this.checkAnchorsVisibility();
    };
    LazyTreeSelector.prototype.componentWillUnmount = function () {
        document.removeEventListener('scroll', this.checkAnchorsVisibility, true);
    };
    LazyTreeSelector.prototype.componentDidUpdate = function () {
        this.checkAnchorsVisibility();
    };
    LazyTreeSelector.prototype.registerAnchor = function (anchor, item) {
        if (anchor) {
            this.loadMoreAnchors = this.loadMoreAnchors.set(anchor, item);
            this.checkAnchorsVisibility();
        }
        else {
            this.loadMoreAnchors = this.loadMoreAnchors.remove(anchor);
        }
    };
    LazyTreeSelector.prototype.isItemExpanded = function (item) {
        var expanded = undefined;
        if (this.props.isExpanded) {
            expanded = this.props.isExpanded(item);
        }
        if (expanded === undefined && !this.props.onExpandedOrCollapsed) {
            expanded = this.state.expandedItems.get(this.props.forest.keyOf(item));
        }
        if (expanded === undefined) {
            expanded = this.props.expandedByDefault;
        }
        return expanded === undefined ? false : expanded;
    };
    LazyTreeSelector.prototype.renderChildren = function (item, defaultSelected) {
        var _this = this;
        if (defaultSelected === void 0) { defaultSelected = false; }
        var childItems = [];
        var _a = this.props.childrenOf(item), children = _a.children, loading = _a.loading, hasMoreItems = _a.hasMoreItems;
        if (children) {
            var items = children.map(function (child, index) { return _this.renderItem(child, defaultSelected); }).toArray();
            childItems.push.apply(childItems, items);
        }
        if (loading) {
            childItems.push(Spinner_1.default({ key: 'spinner', className: styles.spinner }));
        }
        else if (hasMoreItems) {
            childItems.push(react_1.DOM.button({
                type: 'button',
                key: 'anchor',
                onClick: function () { return _this.props.requestMore(item); },
                ref: function (anchor) { return _this.registerAnchor(anchor, item); },
            }, 'Load'));
        }
        return childItems;
    };
    LazyTreeSelector.prototype.renderItem = function (item, defaultSelected) {
        var _this = this;
        var selected = TreeSelection_1.TreeSelection.nodesFromKey(this.props.selection, this.props.forest.keyOf(item));
        var expanded = this.isItemExpanded(item);
        var childItems = undefined;
        if (expanded) {
            childItems = this.renderChildren(item, defaultSelected || selected.some(TreeSelection_1.TreeSelection.isTerminal));
        }
        var isLeaf = this.props.isLeaf(item) === true;
        var checkState = this.props.selectionMode.renderSelected(this.props.forest, this.props.selection, item, defaultSelected);
        return react_1.DOM.div({
            className: classnames((_a = {},
                _a[styles.itemExpanded] = expanded,
                _a[styles.itemCollapsed] = !expanded,
                _a)),
            key: this.props.forest.keyOf(item),
        }, react_1.DOM.span({
            className: styles.expandToggle,
            style: { visibility: isLeaf ? 'collapse' : undefined },
            onClick: function () { return _this.toggleExpanded(item, expanded); },
        }), this.props.hideCheckboxes ? null : react_1.DOM.input({
            type: 'checkbox',
            checked: checkState !== SelectionMode_1.CheckState.None,
            disabled: checkState === SelectionMode_1.CheckState.FullGreyedOut,
            onChange: function (e) { return _this.onItemCheckedChange(item, defaultSelected, e); },
            ref: function (input) {
                if (input) {
                    input.indeterminate = checkState === SelectionMode_1.CheckState.Partial;
                }
            },
        }), react_1.DOM.div({
            style: { display: 'inline-block' },
            onClick: function () { return _this.toggleExpanded(item, expanded); },
        }, this.props.renderItem(item)), react_1.DOM.div({
            className: styles.children,
            style: { display: isLeaf ? 'none' : undefined },
        }, childItems));
        var _a;
    };
    LazyTreeSelector.prototype.toggleExpanded = function (item, previouslyExpanded) {
        if (this.props.onExpandedOrCollapsed) {
            this.props.onExpandedOrCollapsed(item, !previouslyExpanded);
        }
        else {
            var newExpandedItems = this.state.expandedItems.set(this.props.forest.keyOf(item), !previouslyExpanded);
            this.setState({ expandedItems: newExpandedItems });
        }
        if (!previouslyExpanded && !this.props.childrenOf(item).children) {
            this.props.requestMore(item);
        }
    };
    LazyTreeSelector.prototype.onItemCheckedChange = function (item, defaultSelected, event) {
        if (!this.props.onSelectionChanged) {
            return;
        }
        var _a = this.props, forest = _a.forest, selectionMode = _a.selectionMode;
        var previous = this.props.selection || TreeSelection_1.TreeSelection.empty(forest.keyOf);
        var next = selectionMode.change(forest, previous, item, defaultSelected);
        if (!next) {
            return;
        }
        this.props.onSelectionChanged(next);
    };
    return LazyTreeSelector;
}(react_1.Component));
exports.LazyTreeSelector = LazyTreeSelector;
function isVerticallyScrolledIntoView(element, searchUpTo) {
    if (searchUpTo === void 0) { searchUpTo = document.body; }
    var _a = element.getBoundingClientRect(), top = _a.top, height = _a.height;
    var parent = element.parentElement;
    do {
        var _b = parent.getBoundingClientRect(), parentTop = _b.top, parentBottom = _b.bottom;
        if (top > parentBottom) {
            return false;
        }
        if ((top + height) <= parentTop) {
            return false;
        }
        if (parent === searchUpTo) {
            break;
        }
        parent = parent.parentElement;
    } while (parent);
    return top >= 0 && top <= document.documentElement.clientHeight;
}
