Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var classnames = require("classnames");
require("./clearable-input.scss");
var CLASS_NAME = 'clearable-input';
var ClearableInput = (function (_super) {
    tslib_1.__extends(ClearableInput, _super);
    function ClearableInput(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.onInputMount = function (input) {
            _this.input = input;
        };
        _this.onClickSelf = function (e) {
            if (e.currentTarget === e.target && _this.input) {
                _this.input.focus();
            }
        };
        _this.onFocus = function (e) {
            _this.setState({ focused: true });
            var onFocus = _this.props.onFocus;
            if (onFocus) {
                onFocus(e);
            }
        };
        _this.onBlur = function (e) {
            _this.setState({ focused: false });
            var onBlur = _this.props.onBlur;
            if (onBlur) {
                onBlur(e);
            }
        };
        _this.state = { focused: false };
        return _this;
    }
    ClearableInput.prototype.render = function () {
        var _a = this.props, className = _a.className, style = _a.style, inputClassName = _a.inputClassName, inputStyle = _a.inputStyle, onClear = _a.onClear, clearTitle = _a.clearTitle, children = _a.children, inputProps = tslib_1.__rest(_a, ["className", "style", "inputClassName", "inputStyle", "onClear", "clearTitle", "children"]);
        var hasNonEmptyAddon = react_1.Children.count(children) > 0;
        var groupClass = classnames(CLASS_NAME + " input-group has-feedback", this.state.focused ? CLASS_NAME + "--focused" : undefined, className);
        var controlClass = classnames(CLASS_NAME + "__input form-control", inputClassName);
        return React.createElement("div", { className: groupClass, style: style, onClick: this.onClickSelf },
            hasNonEmptyAddon ? children : null,
            React.createElement("div", { className: CLASS_NAME + "__input-with-clear" },
                React.createElement("input", tslib_1.__assign({ type: 'text' }, inputProps, { ref: this.onInputMount, className: controlClass, style: inputStyle, placeholder: hasNonEmptyAddon ? undefined : inputProps.placeholder, onFocus: this.onFocus, onBlur: this.onBlur })),
                React.createElement("div", { className: CLASS_NAME + "__clear", title: clearTitle, onClick: onClear },
                    React.createElement("span", { className: 'fa fa-times', "aria-hidden": 'true' }))));
    };
    return ClearableInput;
}(React.Component));
ClearableInput.defaultProps = {
    clearTitle: 'Clear input',
};
exports.ClearableInput = ClearableInput;
