Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_lambda_1 = require("core.lambda");
var react_1 = require("react");
var assign = require("object-assign");
var lodash_1 = require("lodash");
var async_1 = require("platform/api/async");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var navigation_1 = require("platform/api/navigation");
var template_1 = require("platform/components/ui/template");
var Graph_1 = require("./Graph");
var GraphInternals = require("./GraphInternals");
require("./SemanticGraph.scss");
var SemanticGraph = (function (_super) {
    tslib_1.__extends(SemanticGraph, _super);
    function SemanticGraph(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.fetching = _this.cancellation.derive();
        _this.state = {
            elements: [],
            noResults: false,
        };
        return _this;
    }
    SemanticGraph.prototype.componentDidMount = function () {
        this.fetchAndSetData(this.props);
    };
    SemanticGraph.prototype.componentWillReceiveProps = function (nextProps) {
        if (!lodash_1.isEqual(nextProps.query, this.props.query)) {
            this.fetchAndSetData(nextProps);
        }
    };
    SemanticGraph.prototype.fetchAndSetData = function (props) {
        var _this = this;
        var config = assign({}, {
            hidePredicates: SemanticGraph.DEFAULT_HIDE_PREDICATES,
        }, props);
        this.fetching = this.cancellation.deriveAndCancel(this.fetching);
        var context = this.context.semanticContext;
        var graphDataWithLabels = this.fetching.map(GraphInternals.getGraphDataWithLabels(config, { context: context }));
        graphDataWithLabels.onValue(function (elements) {
            return _this.setState({
                elements: elements,
                noResults: !elements.length,
            });
        });
        if (this.props.id) {
            this.context.GLOBAL_EVENTS.trigger({
                eventType: events_1.BuiltInEvents.ComponentLoading,
                source: this.props.id,
                data: graphDataWithLabels,
            });
        }
    };
    SemanticGraph.prototype.render = function () {
        if (this.state.noResults) {
            return react_1.createElement(template_1.TemplateItem, { template: { source: this.props.noResultTemplate } });
        }
        var parsedConfig = GraphInternals.parseComponentConfig(SemanticGraph.DEFAULT_STYLE, this.props);
        var config = assign({}, {
            elements: this.state.elements,
            onClick: this.navigate,
        }, SemanticGraph.getDefaultProps, parsedConfig);
        return react_1.createElement(Graph_1.Graph, config, this.props.children);
    };
    SemanticGraph.prototype.navigate = function (event) {
        var node = event.cyTarget;
        var isNotCompound = !(node.isParent() || node.data('expanded-collapsed') === 'collapsed');
        var isIri = node.data('isIri');
        if (isIri && isNotCompound) {
            navigation_1.navigateToResource(event.cyTarget.data('node')).onValue(core_lambda_1.identity);
        }
    };
    return SemanticGraph;
}(components_1.Component));
SemanticGraph.DEFAULT_STYLE = [
    {
        selector: 'edge',
        style: {
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#bbb',
            'content': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-outline-width': 2,
            'width': 1,
            'text-outline-color': 'white',
            'font-size': '8px',
            'curve-style': 'bezier',
            'text-rotation': 'autorotate',
        },
    },
    {
        selector: 'node',
        style: {
            'background-fit': 'contain',
            'background-color': 'white',
            'background-image': 'data(thumbnail)',
            'content': 'data(label)',
            'shape': 'ellipse',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-outline-width': 2,
            'text-outline-color': 'white',
            'font-size': '10px',
            'border-color': '#bbb',
            'border-width': 1,
            'width': 40,
            'height': 40,
        },
    },
    {
        selector: 'node[?isLiteral]',
        style: {
            'background-fit': 'contain',
            'background-color': '#ddd',
            'border-color': '#bbb',
            'border-width': 1,
            'content': 'data(label)',
            'shape': 'rectangle',
            'text-valign': 'center',
            'text-halign': 'center',
            'padding-right': 2,
            'padding-left': 2,
            'padding-top': 2,
            'padding-bottom': 2,
            'width': 'label',
            'height': 'label',
            'text-outline-color': '#ddd',
            'font-size': '10px',
        },
    },
    {
        selector: 'edge.meta',
        style: {
            'content': '',
            'width': 1,
            'line-color': 'light-grey',
            'line-style': 'dotted',
            'target-arrow-shape': 'none',
            'curve-style': 'unbundled-bezier',
            'control-point-distances': '0 0 0',
        },
    },
    {
        selector: "[expanded-collapsed = 'collapsed']",
        style: {
            'shape': 'rectangle',
        },
    },
    {
        selector: "[expanded-collapsed = 'expanded']",
        style: {
            'text-valign': 'top',
            'border-opacity': 0.1,
        },
    },
];
SemanticGraph.getDefaultProps = {
    mouseZoom: true,
    height: 400,
};
SemanticGraph.DEFAULT_HIDE_PREDICATES = [
    '<http://schema.org/thumbnail>',
    '<http://www.w3.org/2000/01/rdf-schema#label>',
];
exports.SemanticGraph = SemanticGraph;
exports.default = SemanticGraph;
