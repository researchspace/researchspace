Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = require("lodash");
var Immutable = require("immutable");
var react_1 = require("react");
var chart_js_1 = require("chart.js");
var react_chartjs_2_1 = require("react-chartjs-2");
var ChartingCommons_1 = require("./ChartingCommons");
var LINE_FILL_OPACITY = 0.2;
var BAR_FILL_OPACITY = 0.6;
var DEFAULT_BUBBLE_RADIUS = 10;
var CHART_TYPE_MAPPING = {
    'line': react_chartjs_2_1.Line,
    'bar': react_chartjs_2_1.Bar,
    'radar': react_chartjs_2_1.Radar,
    'pie': react_chartjs_2_1.Pie,
    'donut': react_chartjs_2_1.Doughnut,
    'bubble': react_chartjs_2_1.Bubble,
};
var DEFAULT_WIDTH = undefined;
var DEFAULT_HEIGHT = 400;
var ChartJsRenderer = (function (_super) {
    tslib_1.__extends(ChartJsRenderer, _super);
    function ChartJsRenderer(props) {
        var _this = _super.call(this, props) || this;
        _this.redrawChart = false;
        _this.state = {
            hiddenCategories: Immutable.Set(),
        };
        return _this;
    }
    ChartJsRenderer.prototype.componentWillReceiveProps = function (nextProps) {
        if (nextProps.builtData !== this.props.builtData) {
            this.redrawChart = true;
        }
    };
    ChartJsRenderer.prototype.mapCircularData = function (data, labels) {
        var _this = this;
        if (data.sets.length === 0) {
            return [{ datasets: [], labels: [] }, {}];
        }
        var firstSet = data.sets[0];
        var categories = firstSet.points.map(function (point) {
            return point[firstSet.mapping.category || firstSet.mapping.x];
        });
        var chartLabels = categories.map(function (category) { return ChartingCommons_1.labeled(category, labels); });
        var datasets = data.sets.map(function (set, setIndex) { return ({
            data: set.points.map(function (point) {
                return ChartingCommons_1.propertyValue(point, set.mapping.value || set.mapping.y)
                    .map(parseFloat).getOrElse(0);
            }),
            backgroundColor: set.points.map(function (point, pointIndex) {
                return ChartingCommons_1.propertyValue(point, set.mapping.color)
                    .getOrElse(getDefaultColor(pointIndex));
            }),
        }); });
        var options = {};
        if (data.sets.length === 1) {
            options = this.legendOptions(function (chart) {
                var meta = chart.getDatasetMeta(0);
                var items = chart_js_1.Chart.defaults.doughnut.legend.labels.generateLabels(chart);
                categories.forEach(function (category, i) {
                    var hidden = _this.state.hiddenCategories.has(category);
                    items[i].category = category;
                    items[i].hidden = hidden;
                    meta.data[i].hidden = hidden;
                });
                return items;
            }, function (event, item, context) {
                chart_js_1.Chart.defaults.doughnut.legend.onClick.call(context, event, item);
            });
        }
        return [{ labels: chartLabels, datasets: datasets }, options];
    };
    ChartJsRenderer.prototype.mapCategorialData = function (data, labels) {
        var _a = data.sets.length === 1
            ? this.mapSingleCategorialSet(data, labels)
            : this.mapMultipleCategorialSets(data, labels), chartData = _a[0], options = _a[1];
        var chartType = this.props.config.type;
        if (chartType === 'line' || chartType === 'bar') {
            lodash_1.merge(options, {
                scales: {
                    xAxes: [{
                            ticks: { autoSkip: false },
                        }],
                    yAxes: [{
                            ticks: { beginAtZero: true },
                        }],
                },
            });
        }
        else if (chartType === 'radar') {
            lodash_1.merge(options, {
                scale: {
                    ticks: { beginAtZero: true },
                },
            });
        }
        return [chartData, options];
    };
    ChartJsRenderer.prototype.mapSingleCategorialSet = function (data, labels) {
        var _this = this;
        var chartType = this.props.config.type;
        var set = data.sets[0];
        var displayedCategories = data.categories
            .map(function (category, index) { return ({ category: category, index: index }); })
            .filter(function (_a) {
            var category = _a.category;
            return !_this.state.hiddenCategories.has(category);
        });
        var displayedIndices = displayedCategories.map(function (_a) {
            var index = _a.index;
            return index;
        });
        var displayedIndicesSet = Immutable.Set(displayedIndices);
        var dataset = {
            label: set.name || ChartingCommons_1.labeled(set.iri, labels),
            data: set.points
                .filter(function (point, index) { return displayedIndicesSet.has(index); })
                .map(function (point) {
                var x = ChartingCommons_1.propertyValue(point, set.mapping.x).chain(ChartingCommons_1.parseNumeric);
                var y = ChartingCommons_1.propertyValue(point, set.mapping.y || set.mapping.value).chain(ChartingCommons_1.parseNumeric);
                var z = ChartingCommons_1.propertyValue(point, set.mapping.z).chain(ChartingCommons_1.parseNumeric);
                if (chartType === 'bubble') {
                    return { x: x.getOrElse(0), y: y.getOrElse(0), r: z.getOrElse(DEFAULT_BUBBLE_RADIUS) };
                }
                else {
                    return y.getOrElse(null);
                }
            }).filter(function (p) { return p !== null; }),
            borderWidth: 1,
        };
        var fillColors = displayedIndices.map(function (i) { return defaultPalette(i, BAR_FILL_OPACITY); });
        var borderColors = displayedIndices.map(function (i) { return defaultPalette(i, 1); });
        if (chartType === 'bar' || chartType === 'bubble') {
            var barDataset = dataset;
            barDataset.backgroundColor = fillColors;
            barDataset.borderColor = borderColors;
        }
        else {
            lodash_1.merge(dataset, singleLinearDatasetStyle());
            dataset.pointBackgroundColor = borderColors;
        }
        var chartData = {
            labels: displayedCategories.map(function (_a) {
                var category = _a.category;
                return ChartingCommons_1.labeled(category, labels);
            }),
            datasets: [dataset],
        };
        return [chartData, this.singleCategorialSetLegendOptions(data, labels)];
    };
    ChartJsRenderer.prototype.singleCategorialSetLegendOptions = function (data, labels) {
        var _this = this;
        var legendItems = data.categories.map(function (category, categoryIndex) {
            return {
                text: ChartingCommons_1.labeled(category, labels),
                fillStyle: defaultPalette(categoryIndex, BAR_FILL_OPACITY),
                hidden: _this.state.hiddenCategories.has(category),
                category: category,
            };
        });
        return this.legendOptions(function (chart) { return legendItems; }, function (event, item) { item.hidden = !item.hidden; });
    };
    ChartJsRenderer.prototype.legendOptions = function (generateLabels, onClick) {
        var _this = this;
        var updateVisibility = function (category, wasHidden) {
            _this.setState({
                hiddenCategories: wasHidden
                    ? _this.state.hiddenCategories.remove(category)
                    : _this.state.hiddenCategories.add(category),
            });
        };
        return {
            legend: {
                labels: { generateLabels: generateLabels },
                onClick: function (event, item) {
                    var wasHidden = item.hidden;
                    onClick(event, item, this);
                    updateVisibility(item.category, wasHidden);
                },
            },
        };
    };
    ChartJsRenderer.prototype.mapMultipleCategorialSets = function (data, labels) {
        var _this = this;
        var chartData = {
            labels: data.categories.map(function (category) { return ChartingCommons_1.labeled(category, labels); }),
            datasets: data.sets.map(function (set, setIndex) {
                var style = getLinearSeriesDefaultStyle(setIndex, _this.props.config.type === 'bar' ? BAR_FILL_OPACITY : LINE_FILL_OPACITY);
                var dataSet = lodash_1.merge({
                    label: set.name || ChartingCommons_1.labeled(set.iri, labels),
                    data: set.points.map(function (point) {
                        return ChartingCommons_1.propertyValue(point, set.mapping.value || set.mapping.y)
                            .map(parseFloat).getOrElse(0);
                    }),
                }, style);
                return dataSet;
            }),
        };
        return [chartData, {}];
    };
    ChartJsRenderer.prototype.mapNumericalData = function (data, labels) {
        var _this = this;
        var datasets = data.sets.map(function (set, setIndex) {
            var dataset = {
                label: set.name || ChartingCommons_1.labeled(set.iri, labels),
                data: set.points.map(function (point) {
                    var x = ChartingCommons_1.propertyValue(point, set.mapping.x || set.mapping.category).chain(ChartingCommons_1.parseNumeric);
                    var y = ChartingCommons_1.propertyValue(point, set.mapping.y || set.mapping.value).chain(ChartingCommons_1.parseNumeric);
                    return (x.isJust && y.isJust) ? {
                        x: x.get(),
                        y: y.get(),
                        r: ChartingCommons_1.propertyValue(point, set.mapping.z)
                            .chain(ChartingCommons_1.parseNumeric).getOrElse(DEFAULT_BUBBLE_RADIUS),
                    } : null;
                }).filter(function (point) { return point !== null; }),
            };
            return lodash_1.merge(dataset, getLinearSeriesDefaultStyle(setIndex, _this.props.config.type === 'bar' ? BAR_FILL_OPACITY : LINE_FILL_OPACITY));
        });
        var options = this.props.config.type === 'line' ? {
            scales: {
                xAxes: [{ type: 'linear', position: 'bottom' }],
            },
        } : {};
        return [{ datasets: datasets }, options];
    };
    ChartJsRenderer.prototype.render = function () {
        var _a = this.props, config = _a.config, builtData = _a.builtData, labels = _a.labels;
        var isXYChart = config.type === 'line' || config.type === 'bubble';
        var isCategorialChart = config.type === 'bar' || config.type === 'radar';
        var isCircularChart = config.type === 'pie' || config.type === 'donut';
        var data, options;
        if (isCircularChart) {
            _b = this.mapCircularData(builtData, labels), data = _b[0], options = _b[1];
        }
        else if (isCategorialChart || (isXYChart && builtData.categories)) {
            _c = this.mapCategorialData(builtData, labels), data = _c[0], options = _c[1];
        }
        else if (isXYChart && !builtData.categories) {
            _d = this.mapNumericalData(builtData, labels), data = _d[0], options = _d[1];
        }
        else {
            throw Error("Unsupported chart type '" + config.type + "'");
        }
        var specificStyle = lodash_1.find(config.styles, function (style) { return style.provider === 'chartjs'; });
        var generatedConfig = {
            data: data,
            options: lodash_1.merge(options, {
                responsive: true,
                maintainAspectRatio: false,
            }),
            width: (!config.dimensions || config.dimensions.width === 0)
                ? DEFAULT_WIDTH : config.dimensions.width,
            height: (!config.dimensions || config.dimensions.height === 0)
                ? DEFAULT_HEIGHT : config.dimensions.height,
        };
        if (specificStyle && specificStyle.style) {
            lodash_1.merge(generatedConfig, specificStyle.style);
        }
        if (this.redrawChart) {
            generatedConfig.redraw = true;
            this.redrawChart = false;
        }
        return react_1.DOM.div({
            className: this.props.className,
            style: {
                width: generatedConfig.width,
                height: generatedConfig.height,
            },
        }, react_1.createElement(CHART_TYPE_MAPPING[config.type], generatedConfig));
        var _b, _c, _d;
    };
    return ChartJsRenderer;
}(react_1.Component));
exports.ChartJsRenderer = ChartJsRenderer;
function defaultPalette(index, opacity) {
    var colorNo = index % 8;
    var angle = colorNo * 45;
    return "hsla(" + angle + ",75%,70%," + opacity + ")";
}
function getLinearSeriesDefaultStyle(index, fillOpacity) {
    return {
        backgroundColor: defaultPalette(index, fillOpacity),
        borderColor: defaultPalette(index, 1),
        borderWidth: 1,
        pointBackgroundColor: defaultPalette(index, 1),
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: defaultPalette(index, 1),
    };
}
function getDefaultColor(index) {
    return defaultPalette(index, 1);
}
function singleLinearDatasetStyle() {
    return {
        borderColor: 'lightgray',
        fill: false,
        pointRadius: 5,
        pointHitRadius: 7,
    };
}
exports.default = ChartJsRenderer;
