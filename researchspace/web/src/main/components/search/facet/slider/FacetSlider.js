Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var _ = require("lodash");
var moment = require("moment");
var react_1 = require("react");
var React = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var Slider = require("rc-slider");
require("rc-slider/assets/index.css");
var YearInput_1 = require("../../date/YearInput");
var FacetSliderGraph_1 = require("./FacetSliderGraph");
var styles = require("./FacetSlider.scss");
function isDateProps(props) {
    return props.kind === 'date-range';
}
function isNumericProps(props) {
    return props.kind === 'numeric-range';
}
var ErrorKinds = {
    OutsideOfRange: 'OutsideOfRange',
    BeginLaterThenEnd: 'BeginLaterThenEnd',
    NoResultsInRange: 'NoResultsInRange',
};
var DateConverter = (function () {
    function DateConverter() {
        var _this = this;
        this.fromNumberFn = function (x) { return moment({ year: x }).startOf('year'); };
        this.dateToYears = function (m) { return m === null ? null : m.year() + (m.dayOfYear() - 1) / 366; };
        this.toStringFn = function (year) { return Math.abs(year) + " " + (year >= 0 ? 'AD' : 'BC'); };
        this.toSliderRange = function (dateRange) {
            return {
                begin: _this.dateToYears(dateRange.begin),
                end: _this.dateToYears(dateRange.end),
            };
        };
        this.fromSliderRange = function (range) {
            return {
                begin: _this.fromNumberFn(range.begin),
                end: _this.fromNumberFn(range.end),
            };
        };
        this.toInputValue = function (num) {
            return {
                epoch: num >= 0 ? 'AD' : 'BC',
                year: Math.abs(num),
            };
        };
        this.fromInputValue = function (yearValue) {
            var epoch = yearValue.epoch, year = yearValue.year;
            return year * (epoch === 'AD' ? 1 : -1);
        };
    }
    return DateConverter;
}());
var NumericConverter = (function () {
    function NumericConverter() {
        this.toStringFn = function (num) { return '' + num; };
        this.toSliderRange = function (numericRange) { return numericRange; };
        this.fromSliderRange = function (range) { return range; };
        this.toInputValue = function (num) { return '' + num; };
        this.fromInputValue = function (value) { return parseFloat(value); };
    }
    return NumericConverter;
}());
function getConverter(props, fn) {
    if (isDateProps(props)) {
        return fn(props, new DateConverter());
    }
    else if (isNumericProps(props)) {
        return fn(props, new NumericConverter());
    }
}
var CustomHandle = (function (_super) {
    tslib_1.__extends(CustomHandle, _super);
    function CustomHandle() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CustomHandle.prototype.render = function () {
        return React.createElement("div", { className: styles.handle, style: { left: this.props.offset + '%' } }, this.props.toStringFn(this.props.value));
    };
    return CustomHandle;
}(react_1.Component));
var FacetSliderComponent = (function (_super) {
    tslib_1.__extends(FacetSliderComponent, _super);
    function FacetSliderComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.onSliderValueChange = function (value) {
            var newRange = { begin: value[0], end: value[1] };
            _this.setState(function (prevState) { prevState.value = newRange; return prevState; });
            _this.onNewRange(newRange);
        };
        _this.onBeginChange = function (newValue) {
            getConverter(_this.props, function (props, converter) {
                var newRange = {
                    begin: converter.fromInputValue(newValue),
                    end: _this.state.value ? _this.state.value.end : null,
                };
                _this.setState(function (prevState) { prevState.value = newRange; return prevState; });
                _this.onNewRange(newRange);
            });
        };
        _this.onEndChange = function (newValue) {
            getConverter(_this.props, function (props, converter) {
                var newRange = {
                    begin: _this.state.value ? _this.state.value.begin : null,
                    end: converter.fromInputValue(newValue),
                };
                _this.setState(function (prevState) { prevState.value = newRange; return prevState; });
                _this.onNewRange(newRange);
            });
        };
        _this.isRangeValid = function (range) {
            return _this.isValidInterval(range) && _this.isInRange(range) && _this.hasResultsInRange(range);
        };
        _this.isValidInterval = function (range) {
            return range.begin <= range.end;
        };
        _this.isInRange = function (range) {
            return range.begin >= _this.state.min && range.end <= _this.state.max;
        };
        _this.hasResultsInRange = function (range) {
            return _.some(_this.state.events, function (event) { return event.begin <= range.end && event.end >= range.begin; });
        };
        _this.validationMessage = function () {
            var toStringFn = getConverter(_this.props, function (props, converter) { return converter; }).toStringFn;
            var _a = _this.state, min = _a.min, max = _a.max;
            switch (_this.state.validationError) {
                case ErrorKinds.OutsideOfRange:
                    return "Available range is " + toStringFn(min) + " - " + toStringFn(max);
                case ErrorKinds.BeginLaterThenEnd:
                    return 'Begin should not be later than end';
                case ErrorKinds.NoResultsInRange:
                    return 'No results in chosen range';
            }
        };
        _this.state = _.assign({ isValidRange: true }, _this.propsToState(props));
        _this.onNewRange = _.debounce(_this.onNewRange, 500);
        return _this;
    }
    FacetSliderComponent.prototype.propsToState = function (gotProps) {
        var result = {};
        getConverter(gotProps, function (props, converter) {
            var events = [];
            for (var _i = 0, _a = props.data; _i < _a.length; _i++) {
                var entity = _a[_i];
                var _b = converter.toSliderRange(entity), begin = _b.begin, end = _b.end;
                var weight = 1.0;
                if (begin && end) {
                    events.push(new FacetSliderGraph_1.GraphEvent(begin, end, weight));
                }
            }
            var minValue = Math.floor(_.min(events.map(function (event) { return event.begin; })));
            var maxValue = Math.ceil(_.max(events.map(function (event) { return event.end; })));
            var value = props.value.map(converter.toSliderRange).getOrElse({ begin: minValue, end: maxValue });
            result = { min: minValue, max: maxValue, value: value, events: events };
        });
        return result;
    };
    FacetSliderComponent.prototype.componentWillReceiveProps = function (nextProps) {
        this.setState(this.propsToState(nextProps));
    };
    FacetSliderComponent.prototype.onNewRange = function (newRange) {
        if (this.isRangeValid(newRange)) {
            getConverter(this.props, function (props, converter) {
                return props.actions.toggleFacetValue(converter.fromSliderRange(newRange));
            });
            this.setState({
                isValidRange: true,
            });
        }
        else {
            var validationError = void 0;
            if (!this.isValidInterval(newRange)) {
                validationError = ErrorKinds.BeginLaterThenEnd;
            }
            else if (!this.isInRange(newRange)) {
                validationError = ErrorKinds.OutsideOfRange;
            }
            else if (!this.hasResultsInRange(newRange)) {
                validationError = ErrorKinds.NoResultsInRange;
            }
            this.setState({
                isValidRange: false,
                validationError: validationError,
            });
        }
    };
    FacetSliderComponent.prototype.render = function () {
        var _this = this;
        var _a = this.state, min = _a.min, max = _a.max, value = _a.value, isValidRange = _a.isValidRange;
        var events = this.state.events;
        var _b = getConverter(this.props, function (props, converter) { return converter; }), toStringFn = _b.toStringFn, toInputValue = _b.toInputValue;
        return React.createElement("div", null,
            React.createElement("div", { className: styles.slidergraph },
                React.createElement(FacetSliderGraph_1.FacetSliderGraph, { events: events, range: value, min: this.state.min, max: this.state.max }),
                isValidRange ? null :
                    React.createElement("div", { className: 'has-error' },
                        React.createElement("label", { className: 'control-label' }, this.validationMessage())),
                React.createElement(Slider, { allowCross: false, range: true, min: min, max: max, className: styles.slider, value: [value.begin, value.end], handle: React.createElement(CustomHandle, { toStringFn: toStringFn }), onChange: this.onSliderValueChange }),
                this.props.kind === 'numeric-range' ?
                    React.createElement("div", { className: styles.range },
                        React.createElement(react_bootstrap_1.FormControl, { value: toInputValue(value.begin), onChange: function (e) {
                                var newValue = e.target.value;
                                _this.onBeginChange(newValue);
                            } }),
                        React.createElement("span", null, "to"),
                        React.createElement(react_bootstrap_1.FormControl, { value: toInputValue(value.end), onChange: function (e) {
                                var newValue = e.target.value;
                                _this.onEndChange(newValue);
                            } }))
                    :
                        React.createElement("div", { className: styles.range },
                            React.createElement(YearInput_1.YearInput, { value: toInputValue(value.begin), onChange: this.onBeginChange, isYearValid: this.state.isValidRange }),
                            React.createElement("span", null, "to"),
                            React.createElement(YearInput_1.YearInput, { value: toInputValue(value.end), onChange: this.onEndChange, isYearValid: this.state.isValidRange }))));
    };
    return FacetSliderComponent;
}(react_1.Component));
exports.FacetSliderComponent = FacetSliderComponent;
exports.FacetSlider = react_1.createFactory(FacetSliderComponent);
exports.default = exports.FacetSlider;
