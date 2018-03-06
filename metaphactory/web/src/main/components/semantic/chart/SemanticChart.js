Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var _ = require("lodash");
var async_1 = require("platform/api/async");
var components_1 = require("platform/api/components");
var events_1 = require("platform/api/events");
var rdf_1 = require("platform/api/rdf");
var sparql_1 = require("platform/api/sparql");
var resource_label_1 = require("platform/api/services/resource-label");
var utils_1 = require("platform/components/utils");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var ChartingCommons_1 = require("./ChartingCommons");
var ChartJsRenderer_1 = require("./ChartJsRenderer");
var HighchartsRenderer_1 = require("./HighchartsRenderer");
require("./SemanticChart.scss");
var CLASS_NAME = 'semantic-chart';
var SemanticChart = (function (_super) {
    tslib_1.__extends(SemanticChart, _super);
    function SemanticChart(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.query = utils_1.Action();
        _this.loadQueryData = function (config) {
            var context = _this.context.semanticContext;
            var querying = sparql_1.SparqlClient.select(config.query, { context: context });
            querying.onValue(function (queryResult) {
                _this.setState({
                    queryResult: queryResult,
                    isLoading: false,
                });
                _this.buildRendererProps(config, queryResult);
            });
            querying.onError(function (errorMessage) {
                _this.setState({
                    errorMessage: errorMessage,
                    isLoading: false,
                });
            });
            if (_this.props.id) {
                _this.context.GLOBAL_EVENTS.trigger({
                    eventType: events_1.BuiltInEvents.ComponentLoading,
                    source: _this.props.id,
                    data: querying,
                });
            }
            return querying;
        };
        _this.state = {
            isLoading: true,
        };
        _this.cancellation.map(_this.query.$property.debounce(300)).flatMap(_this.loadQueryData).onValue(function () { });
        return _this;
    }
    SemanticChart.prototype.componentDidMount = function () {
        this.query(this.props);
    };
    SemanticChart.prototype.componentWillReceiveProps = function (nextProps) {
        if (nextProps.query !== this.props.query) {
            this.setState({ isLoading: true });
            this.query(nextProps);
        }
        else if (nextProps.type !== this.props.type) {
            if (this.state.queryResult) {
                this.buildRendererProps(nextProps, this.state.queryResult);
            }
            else {
                this.query(nextProps);
            }
        }
    };
    SemanticChart.prototype.componentWillUnmount = function () {
        this.cancellation.cancelAll();
    };
    SemanticChart.prototype.buildRendererProps = function (config, queryResult) {
        var _this = this;
        var data = buildData(config, queryResult);
        fetchLabels(data).onValue(function (labels) {
            _this.setState({
                queryResult: queryResult,
                rendererProps: { config: config, data: data, labels: labels },
                errorMessage: undefined,
                isLoading: false,
            });
        }).onError(function (errorMessage) {
            _this.setState({
                queryResult: queryResult,
                rendererProps: undefined,
                errorMessage: errorMessage,
                isLoading: false,
            });
        });
    };
    SemanticChart.prototype.getRenderer = function (config) {
        var provider = config.provider;
        if (provider === 'chartjs') {
            return ChartJsRenderer_1.default;
        }
        else if (provider === 'highcharts') {
            return HighchartsRenderer_1.default;
        }
        else {
            return ChartJsRenderer_1.default;
        }
    };
    SemanticChart.prototype.componentWillUpdate = function () {
        if (this.root) {
            this.root.style.width = this.root.clientWidth + 'px';
            this.root.style.height = this.root.clientHeight + 'px';
        }
    };
    SemanticChart.prototype.componentDidUpdate = function () {
        if (this.root) {
            this.root.style.width = null;
            this.root.style.height = null;
        }
    };
    SemanticChart.prototype.render = function () {
        var _this = this;
        if (this.state.isLoading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        else if (this.state.errorMessage) {
            return react_1.DOM.div({}, react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.errorMessage }));
        }
        else if (this.state.rendererProps) {
            if (sparql_1.SparqlUtil.isSelectResultEmpty(this.state.queryResult)) {
                return react_1.createElement(template_1.TemplateItem, { template: { source: this.props.noResultTemplate } });
            }
            var config = this.state.rendererProps.config;
            var renderer = this.getRenderer(config);
            var rootProps = {
                className: CLASS_NAME,
                'data-type': this.state.selectedType,
                ref: function (root) { _this.root = root; },
            };
            return react_1.DOM.div(rootProps, this.props.children, react_1.createElement(renderer, {
                className: CLASS_NAME + "__renderer",
                config: config,
                builtData: this.state.rendererProps.data,
                labels: this.state.rendererProps.labels,
            }));
        }
        else {
            return react_1.DOM.div({ className: CLASS_NAME }, this.props.children);
        }
    };
    return SemanticChart;
}(components_1.Component));
exports.SemanticChart = SemanticChart;
function buildData(config, queryResult) {
    var dataPoints = queryResult.results.bindings;
    var dataSets = config.multiDataSet
        ? _(dataPoints).map(function (point) {
            var node = point[config.multiDataSet.dataSetVariable];
            return {
                id: node.value,
                iri: node.isIri() ? node : null,
                name: node.isLiteral() ? node.value : null,
                mapping: config.multiDataSet,
            };
        }).uniqBy(function (set) { return set.id; }).sortBy(function (set) { return set.id; }).value()
        : config.sets.map(function (set) {
            return {
                mapping: set,
                iri: typeof set.dataSetIRI === 'string' ? rdf_1.Rdf.iri(set.dataSetIRI) : set.dataSetIRI,
                name: set.dataSetName,
            };
        });
    var isNumericXScale = (config.type === 'line' || config.type === 'bubble')
        && !dataSets.some(function (set) { return Boolean(set.mapping.category); });
    var isPieLikeChart = config.type === 'pie' || config.type === 'donut';
    if (isNumericXScale || isPieLikeChart) {
        var _loop_1 = function (set) {
            set.points = dataPoints.filter(function (point) {
                return ChartingCommons_1.isSetContainsPoint(set, point) && ChartingCommons_1.valueExists(set, point);
            });
        };
        for (var _i = 0, dataSets_1 = dataSets; _i < dataSets_1.length; _i++) {
            var set = dataSets_1[_i];
            _loop_1(set);
        }
        return { sets: dataSets };
    }
    else {
        return buildCategorialDataInPlace(dataPoints, dataSets);
    }
}
exports.buildData = buildData;
function buildCategorialDataInPlace(dataPoints, dataSets) {
    var categories = [];
    var groupedByKey = {};
    for (var _i = 0, dataSets_2 = dataSets; _i < dataSets_2.length; _i++) {
        var set = dataSets_2[_i];
        for (var _a = 0, dataPoints_1 = dataPoints; _a < dataPoints_1.length; _a++) {
            var point = dataPoints_1[_a];
            var category = ChartingCommons_1.extractKey(set, point);
            if (!category) {
                continue;
            }
            var categoryString = category.toString();
            var groupedPoints = groupedByKey[categoryString];
            if (!groupedPoints) {
                groupedPoints = groupedByKey[categoryString] = [];
                categories.push(category);
            }
            if (ChartingCommons_1.isSetContainsPoint(set, point) && ChartingCommons_1.valueExists(set, point)) {
                groupedPoints.push(point);
            }
        }
    }
    for (var _b = 0, dataSets_3 = dataSets; _b < dataSets_3.length; _b++) {
        var set = dataSets_3[_b];
        set.points = [];
    }
    for (var _c = 0, categories_1 = categories; _c < categories_1.length; _c++) {
        var category = categories_1[_c];
        var pointsAtKey = groupedByKey[category.toString()];
        var _loop_2 = function (set) {
            var point = lodash_1.find(pointsAtKey, function (point) {
                return ChartingCommons_1.isSetContainsPoint(set, point) && ChartingCommons_1.valueExists(set, point);
            });
            set.points.push(point ? point : null);
        };
        for (var _d = 0, dataSets_4 = dataSets; _d < dataSets_4.length; _d++) {
            var set = dataSets_4[_d];
            _loop_2(set);
        }
    }
    return { sets: dataSets, categories: categories };
}
function fetchLabels(data) {
    var iris = [];
    for (var _i = 0, _a = data.sets; _i < _a.length; _i++) {
        var set = _a[_i];
        if (set.iri) {
            iris.push(set.iri);
        }
        for (var _b = 0, _c = set.points; _b < _c.length; _b++) {
            var point = _c[_b];
            if (point) {
                var key = ChartingCommons_1.extractKey(set, point);
                if (key && key.isIri()) {
                    iris.push(key);
                }
            }
        }
    }
    if (data.categories) {
        for (var _d = 0, _e = data.categories; _d < _e.length; _d++) {
            var category = _e[_d];
            if (category.isIri()) {
                iris.push(category);
            }
        }
    }
    return resource_label_1.getLabels(iris).map(function (labels) { return labels.mapKeys(function (k) { return k.value; }).toObject(); });
}
exports.default = SemanticChart;
