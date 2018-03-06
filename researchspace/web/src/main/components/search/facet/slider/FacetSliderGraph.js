Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_dom_1 = require("react-dom");
var GraphEvent = (function () {
    function GraphEvent(begin, end, weight) {
        this.begin = begin;
        this.end = end;
        this.weight = weight;
    }
    return GraphEvent;
}());
exports.GraphEvent = GraphEvent;
var FacetSliderGraph = (function (_super) {
    tslib_1.__extends(FacetSliderGraph, _super);
    function FacetSliderGraph(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.points = [];
        return _this;
    }
    FacetSliderGraph.prototype.calculatePoints = function (events) {
        var indices = [];
        var points = [];
        var changes = [];
        var i = 0;
        for (var _i = 0, events_1 = events; _i < events_1.length; _i++) {
            var event_1 = events_1[_i];
            var scaledWeight = event_1.weight / Math.max(1, event_1.end - event_1.begin);
            points.push(event_1.begin);
            changes.push(scaledWeight);
            indices.push(i);
            ++i;
            points.push(event_1.end);
            changes.push(-scaledWeight);
            indices.push(i);
            ++i;
        }
        indices.sort(function (ia, ib) { return points[ia] - points[ib] === 0 ? changes[ib] - changes[ia] : points[ia] - points[ib]; });
        var n = points.length;
        var min = n ? points[indices[0]] : 0;
        var max = n ? points[indices[n - 1]] : 0;
        var currentWeight = 0;
        var maxWeight = 0;
        for (var j = 0; j < n; ++j) {
            currentWeight += changes[indices[j]];
            if (currentWeight > maxWeight) {
                maxWeight = currentWeight;
            }
        }
        var coordinates = [];
        currentWeight = 0;
        for (var k = 0; k < n; ++k) {
            coordinates.push([(points[indices[k]] - min) / (max - min), currentWeight / maxWeight]);
            currentWeight += changes[indices[k]];
            coordinates.push([(points[indices[k]] - min) / (max - min), currentWeight / maxWeight]);
        }
        return coordinates;
    };
    FacetSliderGraph.prototype.componentWillReceiveProps = function (newProps) {
        if (newProps.events !== this.props.events) {
            this.points = this.calculatePoints(newProps.events);
        }
    };
    FacetSliderGraph.prototype.componentWillMount = function () {
        this.points = this.calculatePoints(this.props.events);
    };
    FacetSliderGraph.prototype.componentDidMount = function () {
        this.updateCanvas();
    };
    FacetSliderGraph.prototype.componentDidUpdate = function (prevProps, prevState) {
        this.updateCanvas();
    };
    FacetSliderGraph.prototype.updateCanvas = function () {
        var canvas = react_dom_1.findDOMNode(this.refs['canvas']);
        canvas.width = this.refs['canvas-container'].clientWidth;
        var h = canvas.height;
        var w = canvas.width;
        var ctx = canvas.getContext('2d');
        var points = this.points;
        if (points.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#008cba';
            ctx.lineWidth = 0.5;
            ctx.moveTo(points[0][0] * (w - 2) + 1, h - points[0][1] * h);
            for (var i = 1; i < points.length; ++i) {
                ctx.lineTo(points[i][0] * (w - 2) + 1, h - points[i][1] * h);
            }
            ctx.stroke();
        }
        var min = this.props.min;
        var max = this.props.max;
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.strokeRect(Math.round((this.props.range.begin - min) / (max - min) * w) + 0.5, 0 - 10.5, Math.round((this.props.range.end - this.props.range.begin) / (max - min) * w), h + 20);
    };
    FacetSliderGraph.prototype.render = function () {
        return react_1.DOM.div({ ref: 'canvas-container' }, react_1.DOM.canvas({
            ref: 'canvas', width: '100%', height: '100',
        }));
    };
    return FacetSliderGraph;
}(react_1.Component));
exports.FacetSliderGraph = FacetSliderGraph;
exports.default = FacetSliderGraph;
