Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = require("lodash");
var react_1 = require("react");
var ChartingCommons_1 = require("./ChartingCommons");
var highchartsLoaded = false;
var ReactHighchartsChart;
var HighchartsRenderer = (function (_super) {
    tslib_1.__extends(HighchartsRenderer, _super);
    function HighchartsRenderer(props) {
        var _this = _super.call(this, props) || this;
        _this.loadHigcharts = function () {
            if (BUNDLE_HIGHCHARTS) {
                if (!highchartsLoaded) {
                    highchartsLoaded = true;
                    require('highcharts-css');
                    ReactHighchartsChart = require('react-highcharts');
                    var HighchartsMore = require('highcharts-more');
                    HighchartsMore(ReactHighchartsChart.Highcharts);
                }
                _this.setState({ libraryLoaded: true });
            }
        };
        _this.state = {
            libraryLoaded: false,
            config: _this.buildConfig(props),
        };
        return _this;
    }
    HighchartsRenderer.prototype.componentWillMount = function () {
        this.loadHigcharts();
    };
    HighchartsRenderer.prototype.componentWillReceiveProps = function (nextProps) {
        this.setState({
            config: this.buildConfig(nextProps),
        });
    };
    HighchartsRenderer.prototype.mapLinearNumericalScaleData = function (data, labels) {
        return {
            series: data.sets.map(function (set) {
                var hasZAxis = Boolean(set.mapping.z);
                return {
                    name: set.name || ChartingCommons_1.labeled(set.iri, labels),
                    data: set.points.map(function (point) {
                        var x = ChartingCommons_1.propertyValue(point, set.mapping.x || set.mapping.category).chain(ChartingCommons_1.parseNumeric);
                        var y = ChartingCommons_1.propertyValue(point, set.mapping.y || set.mapping.value).chain(ChartingCommons_1.parseNumeric);
                        if (x.isNothing || y.isNothing) {
                            return null;
                        }
                        if (!hasZAxis) {
                            return [x.get(), y.get()];
                        }
                        var z = ChartingCommons_1.propertyValue(point, set.mapping.z).chain(ChartingCommons_1.parseNumeric);
                        var name = ChartingCommons_1.propertyValue(point, set.mapping.category)
                            .map(function (category) { return labels[category] || category; });
                        return {
                            x: x.get(),
                            y: y.get(),
                            z: z.getOrElse(0),
                            name: name.getOrElse(undefined),
                        };
                    }).filter(function (point) { return point !== null; }),
                };
            }),
        };
    };
    HighchartsRenderer.prototype.mapLinearCategorialScaleData = function (data, labels) {
        return {
            xAxis: { categories: data.categories.map(function (category) { return ChartingCommons_1.labeled(category, labels); }) },
            series: data.sets.map(function (set) {
                return {
                    name: set.name || ChartingCommons_1.labeled(set.iri, labels),
                    data: set.points.map(function (point) {
                        var coords = [];
                        if (set.mapping.x && set.mapping.category) {
                            var x = ChartingCommons_1.propertyValue(point, set.mapping.x).chain(ChartingCommons_1.parseNumeric);
                            coords.push(x.getOrElse(0));
                        }
                        if (set.mapping.y || set.mapping.value) {
                            var y = ChartingCommons_1.propertyValue(point, set.mapping.y || set.mapping.value).chain(ChartingCommons_1.parseNumeric);
                            coords.push(y.getOrElse(0));
                        }
                        if (set.mapping.z) {
                            var z = ChartingCommons_1.propertyValue(point, set.mapping.z).chain(ChartingCommons_1.parseNumeric);
                            coords.push(z.getOrElse(0));
                        }
                        return coords.length === 1 ? coords[0] : coords;
                    }).filter(function (p) { return p != null; }),
                };
            }),
        };
    };
    HighchartsRenderer.prototype.mapCircularData = function (data, labels, isDonut) {
        var cutoutRadius = isDonut ? 50 : 0;
        var ringWidth = (100 - cutoutRadius) / data.sets.length;
        var radius = function (ringIndex) { return cutoutRadius + ringWidth * ringIndex; };
        var series = data.sets.map(function (set, setIndex) {
            var pointData = set.points.map(function (point, pointIndex) { return ({
                y: ChartingCommons_1.propertyValue(point, set.mapping.value || set.mapping.y).map(parseFloat).getOrElse(0),
                name: ChartingCommons_1.labeled(point[set.mapping.category || set.mapping.x], labels),
                color: ChartingCommons_1.propertyValue(point, set.mapping.color).getOrElse(undefined),
            }); });
            return {
                name: set.name || ChartingCommons_1.labeled(set.iri, labels),
                data: pointData,
                size: radius(setIndex + 1) + "%",
                innerSize: radius(setIndex) + "%",
            };
        });
        return { series: series };
    };
    HighchartsRenderer.prototype.render = function () {
        if (this.state.libraryLoaded) {
            return react_1.createElement(ReactHighchartsChart, { config: this.state.config });
        }
        else {
            return react_1.DOM.span({});
        }
    };
    HighchartsRenderer.prototype.buildConfig = function (props) {
        var config = props.config, builtData = props.builtData, labels = props.labels;
        var isCategorialChart = config.type === 'bar' || config.type === 'radar';
        var isCircularChart = config.type === 'pie' || config.type === 'donut';
        var generatedConfig;
        if (isCircularChart) {
            generatedConfig = this.mapCircularData(builtData, labels, config.type === 'donut');
        }
        else if (isCategorialChart || (config.type === 'line' && builtData.categories)) {
            generatedConfig = this.mapLinearCategorialScaleData(builtData, labels);
        }
        else if (config.type === 'line' || config.type === 'bubble') {
            generatedConfig = this.mapLinearNumericalScaleData(builtData, labels);
        }
        else {
            throw Error("Unsupported chart type '" + config.type + "'");
        }
        if (config.dimensions) {
            lodash_1.merge(generatedConfig, {
                chart: {
                    className: this.props.className,
                    width: config.dimensions.width,
                    height: config.dimensions.height,
                },
            });
        }
        lodash_1.merge(generatedConfig, lodash_1.cloneDeep(HighchartsRenderer.CHART_TYPE_MAPPING[config.type]), {
            title: { text: null },
        });
        var specificStyle = lodash_1.find(config.styles, function (style) { return style.provider === 'highcharts'; });
        if (specificStyle && specificStyle.style) {
            lodash_1.merge(generatedConfig, specificStyle.style);
        }
        return generatedConfig;
    };
    return HighchartsRenderer;
}(react_1.Component));
HighchartsRenderer.CHART_TYPE_MAPPING = {
    'line': { chart: { type: 'line' } },
    'bar': { chart: { type: 'column' } },
    'radar': {
        chart: { type: 'line', polar: true },
        xAxis: { tickmarkPlacement: 'on' },
        yAxis: (_a = { min: 0 }, _a['gridLineInterpolation'] = 'polygon', _a),
    },
    'pie': { chart: { type: 'pie' } },
    'donut': { chart: { type: 'pie' } },
    'bubble': {
        chart: { type: 'bubble' },
        xAxis: { gridLineWidth: 1 },
        plotOptions: {
            series: {
                dataLabels: { enabled: true, format: '{point.name}' },
            },
        },
    },
};
exports.HighchartsRenderer = HighchartsRenderer;
exports.default = HighchartsRenderer;
var _a;
