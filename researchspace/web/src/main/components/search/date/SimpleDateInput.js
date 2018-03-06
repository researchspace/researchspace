Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var classNames = require("classnames");
var moment = require("moment");
var react_bootstrap_1 = require("react-bootstrap");
var _ = require("lodash");
var styles = require("./SimpleDateInput.scss");
var SimpleDateInput = (function (_super) {
    tslib_1.__extends(SimpleDateInput, _super);
    function SimpleDateInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onDayChange = function (event) {
            var value = event.target.value;
            if (_this.state.day !== value) {
                var number = parseInt(value);
                _this.setState({
                    day: value,
                    dayIsValid: _.isNaN(number) || number < 1 || number > 31 ? 'error' : 'success',
                });
            }
        };
        _this.onMonthChange = function (event) {
            _this.setState({ month: event.target.value });
        };
        _this.onYearChange = function (event) {
            _this.setState({ year: event.target.value });
        };
        _this.triggerOnSelected = function (state) {
            var day = state.day, month = state.month, year = state.year;
            var isFullDate = !_.isEmpty(day) && !_.isEmpty(month) && !_.isEmpty(year);
            if (isFullDate) {
                _this.props.onSelected(moment({ day: day, month: month, year: year }));
            }
        };
        _this.state = {
            day: '',
            dayIsValid: undefined,
            month: '',
            monthIsValid: undefined,
            year: '',
            yearIsValid: undefined,
        };
        return _this;
    }
    SimpleDateInput.prototype.render = function () {
        return React.createElement("div", { className: styles.holder },
            React.createElement(react_bootstrap_1.FormGroup, { validationState: this.state.dayIsValid },
                React.createElement(react_bootstrap_1.FormControl, { className: classNames('form-control', styles.day), autoFocus: this.props.autoFocus, value: this.state.day, onChange: this.onDayChange, type: 'number', min: '1', max: '31', placeholder: 'DD', required: true })),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: this.state.monthIsValid },
                React.createElement(react_bootstrap_1.FormControl, { className: classNames('form-control', styles.month), value: this.state.month, onChange: this.onMonthChange, type: 'number', min: '1', max: '12', placeholder: 'MM', required: true })),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: this.state.yearIsValid },
                React.createElement(react_bootstrap_1.FormControl, { className: classNames('form-control', styles.year), value: this.state.year, onChange: this.onYearChange, type: 'number', placeholder: 'YYYY', required: true })));
    };
    SimpleDateInput.prototype.componentWillUpdate = function (nextProps, nextState) {
        this.triggerOnSelected(nextState);
    };
    return SimpleDateInput;
}(React.PureComponent));
exports.SimpleDateInput = SimpleDateInput;
exports.default = SimpleDateInput;
