Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var _ = require("lodash");
var react_bootstrap_1 = require("react-bootstrap");
var Navigation = require("platform/api/navigation");
var styles = require("./TextSelection.scss");
var ENTER_KEY_CODE = 13;
var TextSelection = (function (_super) {
    tslib_1.__extends(TextSelection, _super);
    function TextSelection(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.isButtonDisabled = function () { return _.isEmpty(_this.state.textValue); };
        _this.onValueChange = function (event) {
            return _this.setState({ textValue: event.target.value });
        };
        _this.submitText = function (event) {
            return _this.props.onSelect(_this.state.textValue);
        };
        _this.onKeyUp = function (event) {
            if (event.keyCode === ENTER_KEY_CODE) {
                _this.submitText(event);
            }
        };
        _this.state = {
            textValue: '',
            helpUrl: ''
        };
        if (props.helpPage)
            Navigation.constructUrlForResource(props.helpPage)
                .onValue(function (uri) { return _this.setState({ helpUrl: uri.valueOf() }); });
        return _this;
    }
    TextSelection.prototype.render = function () {
        return React.createElement("div", { className: styles.holder },
            this.props.helpPage ? React.createElement("a", { href: this.state.helpUrl, target: "_blank" },
                React.createElement("i", { className: styles.helpQuestionCircle })) : null,
            React.createElement(react_bootstrap_1.FormGroup, { className: styles.inputGroup },
                React.createElement(react_bootstrap_1.FormControl, { value: this.state.textValue, autoFocus: true, onChange: this.onValueChange, onKeyUp: this.onKeyUp, placeholder: 'text' })),
            React.createElement(react_bootstrap_1.Button, { bsStyle: 'primary', disabled: this.isButtonDisabled(), onClick: this.submitText }, "Find Text"));
    };
    return TextSelection;
}(React.PureComponent));
exports.TextSelection = TextSelection;
exports.default = TextSelection;
