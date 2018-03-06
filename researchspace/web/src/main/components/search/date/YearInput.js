Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var classNames = require("classnames");
var _ = require("lodash");
var react_bootstrap_1 = require("react-bootstrap");
var styles = require("./YearInput.scss");
var AD = 'AD';
var BC = 'BC';
var YearInput = (function (_super) {
    tslib_1.__extends(YearInput, _super);
    function YearInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.booleanToValidState = function (isValid) {
            return isValid ? 'success' : 'error';
        };
        _this.isValidYear = function (year) { return !_.isNaN(parseInt(year)); };
        _this.onYearChange = function (event) {
            var yearText = event.target.value;
            _this.setState({
                year: yearText,
                isYearValid: _this.booleanToValidState(_this.isValidYear(yearText)),
            });
        };
        _this.onEpochChange = function (event) {
            var eventValue = event.target.value;
            _this.setState(function (state) { return ({
                epoch: eventValue,
                isYearValid: _this.booleanToValidState(_this.isValidYear(state.year)),
            }); });
        };
        var isYearValid = _this.props.isYearValid;
        _this.state = {
            year: props.value ? '' + props.value.year : '',
            isYearValid: isYearValid ? _this.booleanToValidState(isYearValid) : undefined,
            epoch: props.value ? props.value.epoch : AD,
        };
        return _this;
    }
    YearInput.prototype.componentWillReceiveProps = function (nextProps) {
        if (nextProps.value && this.state.year &&
            !(_.isEqual(this.state.year, nextProps.value.year) &&
                _.isEqual(this.state.epoch, nextProps.value.epoch))) {
            this.setState({
                year: '' + nextProps.value.year, epoch: nextProps.value.epoch,
                isYearValid: this.booleanToValidState(nextProps.isYearValid),
            });
        }
    };
    YearInput.prototype.componentWillUpdate = function (nextProps, nextState) {
        if (nextState.isYearValid === 'success') {
            var year = nextState.year, epoch = nextState.epoch;
            var newValue = { year: parseInt(year), epoch: epoch };
            if (!_.isEqual(nextProps.value, newValue)) {
                this.props.onChange(newValue);
            }
        }
    };
    YearInput.prototype.render = function () {
        return React.createElement("div", { className: classNames(styles.holder, this.props.className) },
            React.createElement(react_bootstrap_1.FormGroup, { validationState: this.state.isYearValid },
                React.createElement(react_bootstrap_1.FormControl, { className: styles.year, value: this.state.year, autoFocus: this.props.autoFocus, onChange: this.onYearChange, type: 'number', min: '0', placeholder: 'YYYY', required: true })),
            React.createElement(react_bootstrap_1.FormGroup, { validationState: this.state.isYearValid },
                React.createElement(react_bootstrap_1.FormControl, { className: styles.epoch, value: this.state.epoch, onChange: this.onEpochChange, componentClass: 'select', placeholder: 'AD/BC', required: true },
                    React.createElement("option", { value: AD }, AD),
                    React.createElement("option", { value: BC }, BC))));
    };
    return YearInput;
}(React.PureComponent));
exports.YearInput = YearInput;
exports.default = YearInput;
