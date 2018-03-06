Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_dom_1 = require("react-dom");
var $ = require("jquery");
var assign = require("object-assign");
var _ = require("lodash");
window['jQuery'] = $;
window['SimileAjax'] = {
    loaded: false,
    loadingScriptsCount: 0,
    error: null,
    Platform: new Object(),
};
require('./lib/timeline_2.3.0/timeline_js/images/red-circle.png');
require('./lib/timeline_2.3.0/timeline_js/images/copyright-vertical.png');
require('./lib/timeline_2.3.0/timeline_js/images/progress-running.gif');
require('./lib/timeline_2.3.0/timeline_ajax/styles/graphics.css');
require('./lib/timeline_2.3.0/timeline_js/timeline-bundle.css');
require('simile-ajax-bundle');
SimileAjax.History.enabled = false;
window['Timeline'] = new Object();
Timeline.DateTime = SimileAjax.DateTime;
Timeline.serverLocale = 'en';
Timeline.clientLocale = 'en';
Timeline.urlPrefix = '../assets/';
require('timeline-bundle');
require('./lib/timeline_2.3.0/timeline_js/scripts/l10n/en/timeline.js');
require('./lib/timeline_2.3.0/timeline_js/scripts/l10n/en/labellers.js');
var TimelineComponent = (function (_super) {
    tslib_1.__extends(TimelineComponent, _super);
    function TimelineComponent(props) {
        return _super.call(this, props) || this;
    }
    TimelineComponent.prototype.handleResize = function () {
        if (!_.isNull(this.timeline)) {
            this.timeline.layout();
        }
    };
    TimelineComponent.prototype.setCenterDate = function (date, band) {
        if (!_.isNull(this.timeline)) {
            this.timeline.getBand(band).setCenterVisibleDate(date);
        }
    };
    TimelineComponent.prototype.setAutoWidth = function (v) {
        if (!_.isNull(this.timeline)) {
            this.timeline['autoWidth'] = v;
        }
    };
    TimelineComponent.prototype.componentDidMount = function () {
        this.createTimeline(this.props);
    };
    TimelineComponent.prototype.componentWillReceiveProps = function (props) {
        this.destroyTimeline();
        this.createTimeline(props);
    };
    TimelineComponent.prototype.componentWillUnmount = function () {
        this.destroyTimeline();
    };
    TimelineComponent.prototype.render = function () {
        return React.DOM.div({ style: { height: this.props.height } });
    };
    TimelineComponent.prototype.createTimeline = function (props) {
        if (!_.isUndefined(props.tupleTemplate) && !props.tupleTemplate.isNothing) {
            var that = this;
            var oldFillInfoBubble = Timeline.DefaultEventSource.Event.prototype.fillInfoBubble;
            var renderTemplate = function (eventObject) {
                return props.tupleTemplate.map(function (template) { return template(assign(eventObject._obj.tuple, {
                    _event: eventObject._obj,
                })); }).getOrElse('');
            };
            Timeline.DefaultEventSource.Event.prototype.fillInfoBubble =
                function (elmt, theme, labeller) {
                    var eventObject = this;
                    if (that.props.tupleTemplate.isJust) {
                        elmt.innerHTML = renderTemplate(eventObject);
                        window.setTimeout(function () {
                            elmt.innerHTML = renderTemplate(eventObject);
                        }, 300);
                    }
                    else {
                        oldFillInfoBubble.call(this, elmt, theme, labeller);
                    }
                };
        }
        window.addEventListener('resize', this.handleResize);
        var element = react_dom_1.findDOMNode(this);
        var eventSource = new Timeline.DefaultEventSource();
        var bands = _.map(props.bands, function (band) {
            band.eventSource = eventSource;
            return Timeline.createBandInfo(band);
        });
        this.timeline = Timeline.create(element, bands);
        var url = '../assets/';
        eventSource.loadJSON({ 'events': props.events }, url);
    };
    TimelineComponent.prototype.destroyTimeline = function () {
        this.timeline.dispose();
        this.timeline = null;
    };
    return TimelineComponent;
}(React.Component));
exports.TimelineComponent = TimelineComponent;
exports.TimelineElement = React.createFactory(TimelineComponent);
exports.default = exports.TimelineElement;
