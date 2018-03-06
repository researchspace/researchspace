Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var maybe = require("data.maybe");
var classNames = require("classnames");
var ReactSelect = require("react-select");
var react_bootstrap_1 = require("react-bootstrap");
var _ = require("lodash");
var Model_1 = require("platform/components/semantic/search/data/search/Model");
var SimpleDateInput_1 = require("./SimpleDateInput");
var YearInput_1 = require("./YearInput");
var styles = require("./DateFormatSelector.scss");
var DateFormatSelectorComponent = (function (_super) {
    tslib_1.__extends(DateFormatSelectorComponent, _super);
    function DateFormatSelectorComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.initialState = {
            showSelectorDropdown: false,
            dateFormat: maybe.Nothing(),
            value: maybe.Nothing(),
        };
        _this.showDateInput = function (dateFormat) {
            return React.createElement("div", { className: styles.inputHolder },
                _this.dateInput({ kind: dateFormat }),
                React.createElement("button", { className: classNames('btn', 'btn-primary'), onClick: _this.onSelect }, "Select"));
        };
        _this.onSelect = function () {
            return _this.props.onSelect({
                dateFormat: _this.state.dateFormat.get(),
                value: _this.state.value.get(),
            });
        };
        _this.simpleDate = function () { return [React.createElement(SimpleDateInput_1.SimpleDateInput, { autoFocus: true, onSelected: _this.setSimpleDate })]; };
        _this.setSimpleDate = function (date) { return _this.setState({ value: maybe.Just(date) }); };
        _this.dateRange = function () { return [
            React.createElement(SimpleDateInput_1.SimpleDateInput, { key: 'date-range-begin', autoFocus: true, onSelected: _this.setDateRangeBegin }),
            React.createElement("span", { className: styles.dateSeparator }, "to"),
            React.createElement(SimpleDateInput_1.SimpleDateInput, { key: 'date-range-end', onSelected: _this.setDateRangeEnd }),
        ]; };
        _this.setDateRangeBegin = function (date) {
            return _this.setState(function (state) { return ({
                value: maybe.Just({
                    begin: date,
                    end: state.value.map(function (v) { return v.end; }).getOrElse(null),
                }),
            }); });
        };
        _this.setDateRangeEnd = function (date) {
            return _this.setState(function (state) { return ({
                value: maybe.Just({
                    begin: state.value.map(function (v) { return v.begin; }).getOrElse(null),
                    end: date,
                }),
            }); });
        };
        _this.dateDeviation = function () { return [
            React.createElement(SimpleDateInput_1.SimpleDateInput, { key: 'date-deviation-date', autoFocus: true, onSelected: _this.setDateDeviationDate }),
            React.createElement("span", { className: styles.dateSeparator }, "\u00B1"),
            React.createElement(react_bootstrap_1.FormGroup, null,
                React.createElement(react_bootstrap_1.FormControl, { key: 'date-deviation', type: 'number', className: styles.deviationInput, placeholder: 'Days', required: true, onChange: _this.setDateDeviation, value: _this.state.value.map(function (v) { return v.deviation; }).getOrElse(undefined) })),
        ]; };
        _this.setDateDeviationDate = function (date) {
            return _this.setState(function (state) { return ({
                value: maybe.Just({
                    date: date,
                    deviation: state.value.map(function (v) { return v.deviation; }).getOrElse(null),
                }),
            }); });
        };
        _this.setDateDeviation = function (event) {
            var value = event.target.value;
            _this.setState(function (state) { return ({
                value: maybe.Just({
                    date: state.value.map(function (v) { return v.date; }).getOrElse(null),
                    deviation: value,
                }),
            }); });
        };
        _this.year = function () { return [React.createElement(YearInput_1.YearInput, { key: 'year', autoFocus: true, onChange: _this.setYear })]; };
        _this.setYear = function (year) {
            return _this.setState({
                value: maybe.Just(year),
            });
        };
        _this.yearRange = function () { return [
            React.createElement(YearInput_1.YearInput, { key: 'year-range-begin', autoFocus: true, onChange: _this.setYearRangeBegin }),
            React.createElement("span", { className: styles.dateSeparator }, "to"),
            React.createElement(YearInput_1.YearInput, { key: 'year-range-end', onChange: _this.setYearRangeEnd }),
        ]; };
        _this.setYearRangeBegin = function (year) {
            return _this.setState(function (state) { return ({
                value: maybe.Just({
                    begin: year,
                    end: state.value.map(function (v) { return v.end; }).getOrElse(null),
                }),
            }); });
        };
        _this.setYearRangeEnd = function (year) {
            return _this.setState(function (state) { return ({
                value: maybe.Just({
                    begin: state.value.map(function (v) { return v.begin; }).getOrElse(null),
                    end: year,
                }),
            }); });
        };
        _this.yearDeviation = function () { return [
            React.createElement(YearInput_1.YearInput, { key: 'year-deviation-year', autoFocus: true, onChange: _this.setYearDeviationYear }),
            React.createElement("span", { className: styles.dateSeparator }, "\u00B1"),
            React.createElement(react_bootstrap_1.FormGroup, null,
                React.createElement(react_bootstrap_1.FormControl, { key: 'year-deviation', type: 'number', className: styles.deviationInput, placeholder: 'Years', required: true, value: _this.state.value.map(function (v) { return v.deviation; }).getOrElse(undefined), onChange: _this.setYearDeviation })),
        ]; };
        _this.setYearDeviationYear = function (year) {
            return _this.setState(function (state) { return ({
                value: maybe.Just({
                    year: year,
                    deviation: state.value.map(function (v) { return v.deviation; }).getOrElse(null),
                }),
            }); });
        };
        _this.setYearDeviation = function (event) {
            var value = event.target.value;
            _this.setState(function (state) { return ({
                value: maybe.Just({
                    year: state.value.map(function (v) { return v.year; }).getOrElse(null),
                    deviation: value,
                }),
            }); });
        };
        _this.dateSelectorDropdown = function () {
            var options = _.keys(Model_1.TemporalDisjunctKinds).map(function (v) { return ({ value: v, label: v }); });
            return React.createElement(ReactSelect, { className: classNames(styles.dateFormatSelect), options: options, value: _this.state.dateFormat.getOrElse(undefined), clearable: false, onChange: _this.selectDateFormat.bind(_this), optionRenderer: _this.dateSelectorOptions, valueRenderer: _this.dateSelectorOptions, placeholder: 'Select Date or Range Type' });
        };
        _this.state = _this.initialState;
        return _this;
    }
    DateFormatSelectorComponent.prototype.render = function () {
        var _this = this;
        return React.createElement("div", { className: styles.holder },
            this.dateSelectorDropdown(),
            this.state.dateFormat.map(function (dateFormat) { return _this.showDateInput(dateFormat); }).getOrElse(React.createElement("span", null)));
    };
    DateFormatSelectorComponent.prototype.dateInput = function (disjunct) {
        return Model_1.matchTemporalDisjunct({
            Date: this.simpleDate,
            DateRange: this.dateRange,
            DateDeviation: this.dateDeviation,
            Year: this.year,
            YearRange: this.yearRange,
            YearDeviation: this.yearDeviation,
        })(disjunct);
    };
    DateFormatSelectorComponent.prototype.selectDateFormat = function (value) {
        this.setState(_.assign({}, this.initialState, { dateFormat: maybe.Just(value.value) }));
    };
    DateFormatSelectorComponent.prototype.dateSelectorOptions = function (option) {
        var simpleDate = React.createElement("div", null,
            React.createElement("span", { className: styles.dateFormatSelect__ddMmYyyy }, "DD"),
            React.createElement("span", { className: styles.dateFormatSelect__ddMmYyyy }, "MM"),
            React.createElement("span", { className: styles.dateFormatSelect__ddMmYyyy }, "YYYY"));
        var yearInput = React.createElement("span", { className: styles.dateFormatSelect__yyyyAcBc }, "year");
        var disjunct = { kind: option.value };
        return Model_1.matchTemporalDisjunct({
            Date: function () {
                return React.createElement("div", { className: styles.dateFormatSelect__option }, simpleDate);
            },
            DateRange: function () {
                return React.createElement("div", { className: styles.dateFormatSelect__option },
                    simpleDate,
                    React.createElement("span", { className: styles.dateSeparator }, "to"),
                    simpleDate);
            },
            DateDeviation: function () {
                return React.createElement("div", { className: styles.dateFormatSelect__option },
                    simpleDate,
                    React.createElement("span", { className: styles.dateSeparator }, "\u00B1"),
                    React.createElement("span", { className: styles.dateFormatSelectDdMmYyyyDateDeviation }, "days"));
            },
            Year: function () { return React.createElement("div", { className: styles.dateFormatSelect__option }, yearInput); },
            YearRange: function () {
                return React.createElement("div", { className: styles.dateFormatSelect__option },
                    yearInput,
                    React.createElement("span", { className: styles.dateSeparator }, "to"),
                    yearInput);
            },
            YearDeviation: function () {
                return React.createElement("div", { className: styles.dateFormatSelect__option },
                    yearInput,
                    React.createElement("span", { className: styles.dateSeparator }, "\u00B1"),
                    React.createElement("span", { className: styles.dateFormatSelectDdMmYyyyYearDeviation }, "years"));
            },
        })(disjunct);
    };
    return DateFormatSelectorComponent;
}(React.Component));
exports.DateFormatSelectorComponent = DateFormatSelectorComponent;
exports.default = DateFormatSelectorComponent;
