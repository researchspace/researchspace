Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
var react_1 = require("react");
var maybe = require("data.maybe");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var Tree_1 = require("./Tree");
var SemanticTree = (function (_super) {
    tslib_1.__extends(SemanticTree, _super);
    function SemanticTree(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.getTreeComponent = function (data) {
            return _.isEmpty(data) ?
                react_1.createElement(template_1.TemplateItem, { template: { source: _this.props.noResultTemplate } }) : react_1.DOM.div({}, react_1.createElement(Tree_1.Tree, {
                tupleTemplate: _this.handleDeprecatedLayout(),
                onNodeClick: _this.onNodeClick,
                nodeData: data,
                nodeKey: 'key',
                collapsed: _this.props.collapsed,
                keysOpened: _this.props.keysOpened,
            }));
        };
        _this.processSparqlResult = function (res) {
            if (sparql_1.SparqlUtil.isSelectResultEmpty(res)) {
                _this.setState({ data: [], isLoading: false });
                return;
            }
            var map = _this.transformBindingsToMap(res.results.bindings);
            var rootNodes = _.isEmpty(_this.props.roots) ? _this.roots : _this.props.roots;
            var data = _.reduce(rootNodes, function (total, currentRoot) {
                if (!map[currentRoot]) {
                    _this.setState({
                        errorMessage: maybe.Just("Root node " + currentRoot + " does not exist."),
                    });
                    return total;
                }
                return total.concat(_this.getChildren(map, currentRoot, map[currentRoot].data));
            }, []);
            _this.setState({ data: data, isLoading: false });
        };
        _this.onNodeClick = function (node) {
        };
        _this.transformBindingsToMap = function (bindings) {
            var _a = _this.props, nodeBindingName = _a.nodeBindingName, parentBindingName = _a.parentBindingName;
            return _.reduce(bindings, function (total, b) {
                if (!total[b[nodeBindingName].value]) {
                    total[b[nodeBindingName].value] = {
                        key: b[nodeBindingName].value,
                        data: b, children: [],
                    };
                }
                else if (_.isEmpty(total[b[nodeBindingName].value].data)) {
                    total[b[nodeBindingName].value].data = b;
                }
                if (b[parentBindingName] && !total[b[parentBindingName].value]) {
                    total[b[parentBindingName].value] = {
                        key: b[parentBindingName].value, data: {},
                        children: [b[nodeBindingName].value],
                    };
                }
                else if (b[parentBindingName]) {
                    total[b[parentBindingName].value].children.push(b[nodeBindingName].value);
                }
                else {
                    if (!_.includes(_this.roots, b[nodeBindingName].value)) {
                        _this.roots.push(b[nodeBindingName].value);
                    }
                }
                return total;
            }, {});
        };
        _this.getChildren = function (m, nodeKey, nodeData) {
            if (m[nodeKey].children.length <= 0) {
                return { key: nodeKey, data: nodeData };
            }
            var node = m[nodeKey];
            var children = _.reduce(node.children, function (total, child) {
                total.push(_this.getChildren(m, child, m[child].data));
                return total;
            }, []);
            return {
                key: nodeKey,
                data: nodeData,
                children: children,
            };
        };
        _this.state = {
            isLoading: true,
            errorMessage: maybe.Nothing(),
        };
        _this.roots = [];
        return _this;
    }
    SemanticTree.prototype.componentDidMount = function () {
        sparql_1.SparqlClient.select(this.props.query, this.context.semanticContext).onValue(this.processSparqlResult);
    };
    SemanticTree.prototype.render = function () {
        if (this.state.errorMessage.isJust) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.errorMessage.get() });
        }
        return this.state.isLoading ? react_1.createElement(spinner_1.Spinner) : this.getTreeComponent(this.state.data);
    };
    SemanticTree.prototype.handleDeprecatedLayout = function () {
        if (_.has(this.props, 'layout')) {
            console.warn('layout property in semantic-tree is deprecated, please use flat properties instead');
            return this.props['layout']['tupleTemplate'];
        }
        return this.props.tupleTemplate;
    };
    return SemanticTree;
}(components_1.Component));
SemanticTree.defaultProps = {
    parentBindingName: 'parent',
    nodeBindingName: 'node',
    roots: [],
    keysOpened: [],
    tupleTemplate: '<semantic-link uri="{{data.node.value}}"></semantic-link>',
};
exports.SemanticTree = SemanticTree;
exports.default = SemanticTree;
