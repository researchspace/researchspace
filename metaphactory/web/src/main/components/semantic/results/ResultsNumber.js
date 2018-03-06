Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Maybe = require("data.maybe");
var _ = require("lodash");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var sparql_1 = require("platform/api/sparql");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var ResultsNumberComponent = (function (_super) {
    tslib_1.__extends(ResultsNumberComponent, _super);
    function ResultsNumberComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.calcResultsNumber = function (query) {
            _this.setState({
                isLoading: true,
            });
            var countQuery = _this.prepareCountQuery(sparql_1.SparqlUtil.parseQuerySync(query));
            var loading = sparql_1.SparqlClient.select(countQuery)
                .map(function (res) { return parseInt(res.results.bindings[0]['count'].value); })
                .onValue(_this.updateCounts)
                .onError(_this.onError);
            if (_this.props.id) {
                _this.context.GLOBAL_EVENTS.trigger({
                    eventType: events_1.BuiltInEvents.ComponentLoading,
                    source: _this.props.id,
                    data: loading,
                });
            }
        };
        _this.prepareCountQuery = function (query) {
            var visitor = new ((function (_super) {
                tslib_1.__extends(class_1, _super);
                function class_1() {
                    var _this = _super !== null && _super.apply(this, arguments) || this;
                    _this.limits = [];
                    return _this;
                }
                class_1.prototype.select = function (select) {
                    if (select.limit) {
                        this.limits.push(select.limit);
                        delete select.limit;
                    }
                    return _super.prototype.select.call(this, select);
                };
                return class_1;
            }(sparql_1.QueryVisitor)));
            visitor.sparqlQuery(query);
            _this.limit = visitor.limits.length ? Math.min.apply(Math, visitor.limits) : undefined;
            query.prefixes = {};
            return "SELECT (COUNT(*) AS ?count) WHERE {{" + sparql_1.SparqlUtil.serializeQuery(query) + "}}";
        };
        _this.updateCounts = function (number) {
            _this.setState({
                number: Maybe.Just(_this.limit <= number ? _this.limit : number),
                totalNumber: _this.limit && _this.limit < number ? Maybe.Just(number) : Maybe.Nothing(),
                isLoading: false,
            });
        };
        _this.onError = function (error) {
            throw error;
        };
        _this.state = {
            number: Maybe.Nothing(),
            totalNumber: Maybe.Nothing(),
            isLoading: false,
        };
        return _this;
    }
    ResultsNumberComponent.prototype.componentDidMount = function () {
        this.calcResultsNumber(this.props.query);
    };
    ResultsNumberComponent.prototype.componentWillReceiveProps = function (nextProps) {
        if (!_.isEqual(nextProps.query, this.props.query)) {
            this.calcResultsNumber(nextProps.query);
        }
    };
    ResultsNumberComponent.prototype.render = function () {
        if (this.state.number.isJust && !this.state.isLoading) {
            return react_1.createElement(template_1.TemplateItem, {
                componentProps: this.props,
                template: {
                    source: this.props.template,
                    options: {
                        'numberOfResults': this.state.number.get(),
                        'totalNumberOfResults': this.state.totalNumber.getOrElse(undefined),
                        'hasLimit': this.state.totalNumber.isJust,
                    },
                },
            });
        }
        else if (this.state.isLoading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        else {
            return null;
        }
    };
    return ResultsNumberComponent;
}(components_1.Component));
ResultsNumberComponent.defaultProps = {
    template: "\n        showing {{numberOfResults}} {{#if hasLimit}} of {{totalNumberOfResults}} {{/if}}\n    ",
};
exports.ResultsNumberComponent = ResultsNumberComponent;
exports.default = ResultsNumberComponent;
