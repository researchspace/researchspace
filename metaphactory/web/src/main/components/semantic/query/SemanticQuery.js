Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var maybe = require("data.maybe");
var _ = require("lodash");
var sparql_1 = require("platform/api/sparql");
var components_1 = require("platform/api/components");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var SemanticQuery = (function (_super) {
    tslib_1.__extends(SemanticQuery, _super);
    function SemanticQuery(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.renderResult = function (templateString) { return function (res) {
            if (sparql_1.SparqlUtil.isSelectResultEmpty(res)) {
                return react_1.createElement(template_1.TemplateItem, { template: { source: _this.props.noResultTemplate } });
            }
            var firstBindingVar = res.head.vars[0];
            return react_1.createElement(template_1.TemplateItem, {
                template: {
                    source: _this.getTemplateString(templateString, firstBindingVar),
                    options: res.results,
                },
                componentProps: {
                    style: _this.props.style,
                    className: _this.props.className,
                },
            });
        }; };
        _this.getTemplateString = function (template, bindingVar) {
            if (template) {
                return template;
            }
            return '<div>{{#each bindings}}' +
                '{{#if (isIri ' + bindingVar + ')}}' +
                '<semantic-link uri=\"{{' + bindingVar + '.value}}\"></semantic-link>' +
                '{{else}}' +
                '{{' + bindingVar + '.value}}' +
                '{{/if}}' +
                '{{#if @last}}{{else}},&nbsp;{{/if}}' +
                '{{/each}}</div>';
        };
        _this.executeQuery = function (props, ctx) {
            _this.setState({ isLoading: true });
            var context = ctx.semanticContext;
            sparql_1.SparqlClient.select(props.query, { context: context }).onValue(function (result) { return _this.setState({
                result: maybe.Just(result),
                isLoading: false,
            }); }).onError(function (err) {
                throw err;
            });
        };
        _this.state = {
            result: maybe.Nothing(),
            isLoading: true,
        };
        return _this;
    }
    SemanticQuery.prototype.componentDidMount = function () {
        this.executeQuery(this.props, this.context);
    };
    SemanticQuery.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return nextState.isLoading !== this.state.isLoading || !_.isEqual(nextProps, this.props);
    };
    SemanticQuery.prototype.componentWillReceiveProps = function (nextProps, context) {
        if (nextProps.query !== this.props.query) {
            this.executeQuery(nextProps, context);
        }
    };
    SemanticQuery.prototype.render = function () {
        return this.state.isLoading
            ? react_1.createElement(spinner_1.Spinner)
            : this.state.result.map(this.renderResult(this.props.template)).getOrElse(null);
    };
    return SemanticQuery;
}(components_1.Component));
exports.SemanticQuery = SemanticQuery;
exports.default = SemanticQuery;
