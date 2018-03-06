Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var _ = require("lodash");
var ReactTreeView = require("react-treeview");
var classnames = require("classnames");
var template_1 = require("platform/components/ui/template");
require("react-treeview/react-treeview.css");
var styles = require("./Tree.scss");
var Tree = (function (_super) {
    tslib_1.__extends(Tree, _super);
    function Tree() {
        var _this = _super.call(this) || this;
        _this.collectOpenKeys = function (nodes) {
            return _.reduce(nodes, function (collectedKeys, node) {
                if (_this.nodeHasChildren(node) && _this.hasNestedOpenedKey(node)) {
                    return collectedKeys.concat(_this.collectOpenKeys(node['children']).concat([_this.getNodeKey(node)]));
                }
                return collectedKeys;
            }, []);
        };
        _this.getNodeKey = function (node) {
            return node[_this.props.nodeKey];
        };
        _this.getAllKeys = function (node) {
            if (!node['children']) {
                return [_this.getNodeKey(node)];
            }
            return _.reduce(node['children'], function (all, current) { return all.concat(_this.getAllKeys(current)); }, [node[_this.props.nodeKey]]);
        };
        _this.handleClick = function (node, e) {
            if (_this.props.onNodeClick) {
                _this.props.onNodeClick(node);
            }
            _this.setState({
                activeNode: node,
            });
        };
        _this.handleCollapsibleClick = function (i) {
            _this.setState(function (state) {
                var collapsedBookkeeping = _this.state.collapsedBookkeeping;
                collapsedBookkeeping[i] = !collapsedBookkeeping[i];
                return { collapsedBookkeeping: collapsedBookkeeping };
            });
        };
        _this.getTrees = function (data) {
            return data.map(function (node, i) {
                return _this.renderNode(node, i);
            });
        };
        _this.renderNode = function (node, i) {
            var nodeLabelTemplate = react_1.createElement(template_1.TemplateItem, {
                template: {
                    source: _this.props.tupleTemplate,
                    options: node,
                },
            });
            var hasChildren = _this.nodeHasChildren(node);
            var nodeKey = _.isUndefined(_this.props.nodeKey) ? i : node[_this.props.nodeKey];
            var children = (hasChildren && !_this.isCollapsed(nodeKey, node))
                ? _this.getTrees(node['children'])
                : null;
            var isCollapsed = _this.isCollapsed(nodeKey, node);
            var renderedNode = react_1.DOM.span({
                key: _this.key + nodeKey + i,
                className: _this.getCssClassesForNode(children, (_this.state.activeNode === node)),
                onClick: _this.handleClick.bind(null, node),
            }, nodeLabelTemplate);
            return hasChildren
                ? react_1.createElement(ReactTreeView, {
                    key: nodeKey + isCollapsed,
                    nodeLabel: renderedNode,
                    collapsed: isCollapsed,
                    onClick: _this.handleCollapsibleClick.bind(null, nodeKey),
                }, children)
                : renderedNode;
        };
        _this.nodeHasChildren = function (node) {
            return !_.isUndefined(node['children']) && !_.isEmpty(node['children']);
        };
        _this.getCssClassesForNode = function (hasChildren, isActive) {
            var base = hasChildren ? styles.treeNode : styles.leafNode;
            return isActive ? classnames([base, styles.activeNode]) : base;
        };
        _this.isCollapsed = function (i, node) {
            return _this.state.collapsedBookkeeping[i];
        };
        _this.hasNestedOpenedKey = function (node) {
            if (_.includes(_this.props.keysOpened, _this.getNodeKey(node))) {
                return true;
            }
            if (_.isUndefined(node['children'])) {
                return false;
            }
            for (var n in node['children']) {
                if (_this.hasNestedOpenedKey(node['children'][n])) {
                    return true;
                }
            }
            return false;
        };
        _this.key = Math.random().toString(36).slice(2);
        _this.state = {
            collapsedBookkeeping: {},
        };
        return _this;
    }
    Tree.prototype.render = function () {
        return react_1.DOM.div({ className: styles.tree }, this.getTrees(this.props.nodeData));
    };
    Tree.prototype.componentWillMount = function () {
        var _this = this;
        var bookkeeping = {};
        var keys = _.reduce(this.props.nodeData, function (all, current) { return all.concat(_this.getAllKeys(current)); }, []);
        _.forEach(keys, function (k) { bookkeeping[k] = _this.props.collapsed; });
        if (this.props.collapsed) {
            _.forEach(this.collectOpenKeys(this.props.nodeData), function (k) { bookkeeping[k] = false; });
        }
        this.setState({ collapsedBookkeeping: bookkeeping });
    };
    return Tree;
}(react_1.Component));
exports.Tree = Tree;
exports.default = Tree;
