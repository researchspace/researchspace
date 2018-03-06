Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_lambda_1 = require("core.lambda");
var react_1 = require("react");
var assign = require("object-assign");
var jquery = require("jquery");
var cytoscape = require("cytoscape");
var regCose = require("cytoscape-cose-bilkent");
var maybe = require("data.maybe");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var template_1 = require("platform/api/services/template");
var Api_1 = require("./api/Api");
cytoscape.registerJquery(jquery);
var Graph = (function (_super) {
    tslib_1.__extends(Graph, _super);
    function Graph(props) {
        var _this = _super.call(this, props) || this;
        _this.HANDLEBARS_REGEX = /{{{?([^{}]+)}}}?/;
        _this.setLayout = function (layout) {
            _this.setState({ layout: layout });
        };
        _this.runLayout = function () {
            _this.state.cytoscape.map(function (cy) { return _this.getElementsToLayout(cy).makeLayout(_this.state.layout).run(); });
        };
        regCose(cytoscape);
        _this.state = {
            cytoscape: maybe.Nothing(),
            layout: {
                name: 'cose-bilkent',
                idealEdgeLength: 100,
            },
        };
        return _this;
    }
    Graph.prototype.getChildContext = function () {
        return {
            cytoscapeApi: {
                cytoscape: cytoscape,
                jQuery: jquery,
                instance: this.state.cytoscape,
                actions: {
                    setLayout: this.setLayout,
                    runLayout: this.runLayout,
                },
            },
        };
    };
    Graph.prototype.componentDidMount = function () {
        var cy = this.createCytoscapeInstance(this.props);
        this.replaceCytoscapeData(cy, this.props.elements);
        this.setState({
            cytoscape: maybe.Just(cy),
        });
    };
    Graph.prototype.componentWillReceiveProps = function (props) {
        var _this = this;
        if (!_.isEqual(props.elements, this.props.elements)) {
            this.state.cytoscape.map(function (cy) { return _this.replaceCytoscapeData(cy, props.elements); });
        }
    };
    Graph.prototype.componentWillUnmount = function () {
        this.state.cytoscape.map(function (cy) { return cy.destroy(); });
    };
    Graph.prototype.render = function () {
        var _this = this;
        this.redraw();
        return react_1.DOM.div({}, react_1.DOM.div({
            ref: Graph.CYTOSCAPE_CONTAINER_REF,
            style: {
                height: this.props.height,
                width: '100%',
                position: 'relative',
            },
        }), this.state.cytoscape.map(function (_) { return _this.props.children; }).getOrElse(null));
    };
    Graph.prototype.redraw = function () {
        this.state.cytoscape.map(function (cy) {
            cy.resize();
            cy.fit();
        });
    };
    Graph.prototype.getElementsToLayout = function (cy) {
        return cy.filter(function (i, e) {
            if (e.isNode()) {
                return true;
            }
            else {
                return !(e.source().parent().id() === e.target().id() ||
                    e.target().parent().id() === e.source().id());
            }
        });
    };
    Graph.prototype.replaceCytoscapeData = function (cytoscape, elements) {
        cytoscape.remove('*');
        cytoscape.add(elements);
        if (elements.length !== 0) {
            this.runLayout();
            cytoscape.one('layoutstop', function () { return cytoscape.trigger(Api_1.DATA_LOADED_EVENT); });
        }
    };
    Graph.prototype.createCytoscapeInstance = function (props) {
        var cy = cytoscape(this.composeCytoscapeConfig(props));
        var onClick = props.onClick ? props.onClick : core_lambda_1.identity;
        cy.on('tap', 'node', onClick);
        cy.on('tap', 'edge', onClick);
        return cy;
    };
    Graph.prototype.composeCytoscapeConfig = function (props) {
        var opts = {
            container: this.refs.cytoscape,
            userZoomingEnabled: false,
        };
        var style = {
            style: this.compileStyles(props.graphStyle),
        };
        return assign(opts, this.props, style);
    };
    Graph.prototype.compileStyles = function (styles) {
        var _this = this;
        return _.map(styles, function (stylesheet) {
            var style = _this.isCssStylesheet(stylesheet) ? stylesheet.css : stylesheet.style;
            return {
                selector: _this.compileStyleSelector(stylesheet.selector),
                style: _this.compileHandlebarsForStyleValues(style),
            };
        });
    };
    Graph.prototype.compileStyleSelector = function (selector) {
        var _this = this;
        var cytoscapeSelector = selector
            .replace(/property\(<(.*?)>\)/g, function (_, iri) { return _this.escapeJsRegexChars("-><" + iri + ">"); })
            .replace(/literal\((.*?),\s*iri\(<(.*?)>\)\)/g, function (_, literal, iri) { return "'\"" + literal + "\"^^<" + iri + ">'"; })
            .replace(/iri\(<(.*?)>\)/g, function (_, iri) { return "'<" + iri + ">'"; })
            .replace(/literal\((.*?)\)/g, function (_, literal) { return "'\"" + literal + "\"^^" + rdf_1.vocabularies.xsd._string + "'"; });
        return cytoscapeSelector;
    };
    Graph.prototype.compileHandlebarsForStyleValues = function (style) {
        var _this = this;
        return _.mapValues(style, function (value) {
            if (_this.HANDLEBARS_REGEX.test(value)) {
                return Graph.styleTemplateFunction(template_1.TemplateScope.default.compileWithoutRemote(value), value);
            }
            else {
                return value;
            }
        });
    };
    Graph.prototype.isCssStylesheet = function (stylesheet) {
        return _.has(stylesheet, 'css');
    };
    Graph.prototype.escapeJsRegexChars = function (str) {
        return str.replace(Graph.STYLE_METACHARS_REGEX, '\\$&');
    };
    return Graph;
}(react_1.Component));
Graph.CYTOSCAPE_CONTAINER_REF = 'cytoscape';
Graph.childContextTypes = Api_1.CytoscapeContextTypes;
Graph.styleTemplateFunction = function (template, x) {
    return function (obj) {
        return template(obj.data());
    };
};
Graph.STYLE_METACHARS = '[\\!\\"\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\,\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\]\\^\\`\\{\\|\\}\\~]';
Graph.STYLE_METACHARS_REGEX = new RegExp('(' + Graph.STYLE_METACHARS + ')', 'g');
exports.Graph = Graph;
exports.component = Graph;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
