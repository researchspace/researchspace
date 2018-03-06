Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var moment = require("moment");
var Either = require("data.either");
var URI = require("urijs");
var _ = require("lodash");
var maybe = require("data.maybe");
var Handlebars = require("handlebars");
var sparql_1 = require("platform/api/sparql");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var template_1 = require("platform/components/ui/template");
var utils_1 = require("platform/components/utils");
var TimelineModule = require("./Timeline");
require("./SemanticTimeline.scss");
var D = React.DOM;
var SemanticTimeline = (function (_super) {
    tslib_1.__extends(SemanticTimeline, _super);
    function SemanticTimeline(props) {
        var _this = _super.call(this, props) || this;
        _this.renderTimeline = function (config, bands) { return function (events) {
            var timeline = TimelineModule.TimelineElement({
                ref: 'ref-timeline-component',
                events: events,
                bands: bands,
                height: config.height,
                tupleTemplate: _this.state.layout.tupleTemplate,
            });
            return D.div({}, [
                timeline,
                _this.getHideableExpandLink(),
            ]);
        }; };
        _this.state = {
            isLoading: true,
            noResults: false,
        };
        return _this;
    }
    SemanticTimeline.convertToDate = function (value, dateFormats) {
        if (_.startsWith(value, '-')) {
            var m = moment(value, dateFormats);
            m.year(parseInt('-' + m.year()));
            return m.toDate();
        }
        return moment(value, dateFormats).toDate();
    };
    SemanticTimeline.guessZoomSteps = function (duration) {
        return {
            zoomIndex: 3,
            zoomSteps: new Array({ pixelsPerInterval: 400, unit: Timeline.DateTime.DECADE }, { pixelsPerInterval: 300, unit: Timeline.DateTime.CENTURY }, { pixelsPerInterval: 200, unit: Timeline.DateTime.MILLENNIUM }, { pixelsPerInterval: 100, unit: Timeline.DateTime.MILLENNIUM }),
        };
    };
    SemanticTimeline.guessInterval = function (duration) {
        var year = duration.year();
        if (year > 1000) {
            return Timeline.DateTime.MILLENNIUM;
        }
        if (100 < year && year < 1000) {
            return Timeline.DateTime.CENTURY;
        }
        if (10 < year && year < 100) {
            return Timeline.DateTime.DECADE;
        }
        if (1 < year && year < 10) {
            return Timeline.DateTime.YEAR;
        }
        var month = duration.month();
        if (month > 3) {
            return Timeline.DateTime.QUARTER;
        }
        if (1 < month && month < 3) {
            return Timeline.DateTime.MONTH;
        }
        var day = duration.day();
        if (month === 1 && day > 1) {
            return Timeline.DateTime.DAY;
        }
        if (day <= 1) {
            return Timeline.DateTime.HOUR;
        }
        return Timeline.DateTime.CENTURY;
    };
    SemanticTimeline.prototype.componentDidMount = function () {
        this.prepareData(this.props);
    };
    SemanticTimeline.prototype.componentWillReceiveProps = function (props) {
        this.prepareData(props);
    };
    SemanticTimeline.prototype.componentWillMount = function () {
        this.compileTemplatesInConfig(this.props);
    };
    SemanticTimeline.prototype.prepareData = function (props) {
        var _this = this;
        var dateFormats = ['YYYY-MM-DDZ', 'YYYY-MM-D', "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ssZ", 'EEE, d MMM yyyy HH:mm:ss Z', 'yyyy-MM-dd', 'yyyy'];
        var query = sparql_1.SparqlUtil.parseQuery(props.query);
        var stream = sparql_1.SparqlClient.select(query);
        stream.onValue(function (res) {
            var events = _.map(res.results.bindings, function (x) {
                return {
                    start: SemanticTimeline.convertToDate(x[props.start].value, dateFormats),
                    end: SemanticTimeline.convertToDate(x[props.end].value, dateFormats),
                    title: x[props.label].value,
                    color: '#1D719F',
                    icon: 'red-circle.png',
                    durationEvent: props.durationEvent,
                    image: _.isUndefined(x[props.image]) ? '' : x[props.image].value,
                    description: '',
                    tuple: x,
                    link: URI('./?uri=' + encodeURIComponent(x[props.link].value)).absoluteTo(window.location.href).toString(),
                };
            });
            if (!_.isEmpty(events)) {
                var theme = Timeline.ClassicTheme.create();
                theme.event.bubble.width = 320;
                theme.ether.backgroundColors = [
                    '#D1CECA',
                    '#E7DFD6',
                    '#E8E8F4',
                    '#D0D0E8',
                ];
                var allDates = _.union(_.map(events, function (e) { return moment(e.end, moment.ISO_8601); }), _.map(events, function (e) { return moment(e.start, moment.ISO_8601); }));
                var minDate = moment.min.apply(moment, allDates);
                var maxDate = moment.max.apply(moment, allDates);
                var duration = moment(moment.duration(minDate.diff(maxDate)));
                var band = {
                    width: '100%',
                    date: events[0].start,
                    intervalUnit: _.isString(props.interval) ? Timeline.DateTime[props.interval] : SemanticTimeline.guessInterval(duration),
                    intervalPixels: 100,
                    timeZone: '0',
                    theme: theme,
                };
                _.assign(band, SemanticTimeline.guessZoomSteps(duration));
                _this.setState({
                    isLoading: false,
                    events: Either.fromNullable(events),
                    bands: [band],
                });
            }
            else {
                _this.setState({ noResults: true, isLoading: false });
            }
        });
        stream.onError(function (error) {
            return _this.setState({
                isLoading: false,
                events: Either.Left(error),
            });
        });
    };
    SemanticTimeline.prototype.compileTemplatesInConfig = function (config) {
        var layout = {
            tupleTemplate: maybe.fromNullable(config.tupleTemplate).map(Handlebars.compile),
        };
        this.setState({
            layout: layout,
            isLoading: true,
        });
    };
    SemanticTimeline.renderErrorMessage = function (error) {
        return React.createElement(notification_1.ErrorNotification, {
            errorMessage: error,
        });
    };
    SemanticTimeline.prototype.getHideableExpandLink = function () {
        if (_.isUndefined(this.props.height)) {
            return null;
        }
        return React.createElement(utils_1.HideableLink, {
            className: 'semantic-timeline__timeline-expand-link',
            linkText: 'Expand',
            onClick: this.expandTimeLineContainerSize.bind(this),
        });
    };
    SemanticTimeline.prototype.expandTimeLineContainerSize = function () {
        var t = this.refs['ref-timeline-component'];
        t.setAutoWidth(true);
        t.handleResize();
    };
    SemanticTimeline.prototype.getTimeline = function () {
        if (this.state.isLoading) {
            return React.createElement(spinner_1.Spinner);
        }
        if (this.state.noResults) {
            return React.createElement(template_1.TemplateItem, { template: { source: this.props.noResultTemplate } });
        }
        return this.state.events.fold(SemanticTimeline.renderErrorMessage, this.renderTimeline(this.props, this.state.bands));
    };
    SemanticTimeline.prototype.render = function () {
        return D.div({ className: 'metaphacts-timeline-component' }, this.getTimeline());
    };
    return SemanticTimeline;
}(React.Component));
exports.SemanticTimeline = SemanticTimeline;
exports.default = SemanticTimeline;
