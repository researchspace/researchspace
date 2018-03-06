Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var classNames = require("classnames");
var react_1 = require("react");
var SpinnerComponent = (function (_super) {
    tslib_1.__extends(SpinnerComponent, _super);
    function SpinnerComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            showMessage: false,
            showSpinner: false,
        };
        return _this;
    }
    SpinnerComponent.prototype.componentDidMount = function () {
        var _this = this;
        this.showSpinnerTimeout =
            setTimeout(function () { return _this.setState({ showSpinner: true }); }, this.props.spinnerDelay);
        this.showMessageTimeout =
            setTimeout(function () { return _this.setState({ showMessage: true }); }, this.props.messageDelay);
    };
    SpinnerComponent.prototype.componentWillUnmount = function () {
        clearTimeout(this.showSpinnerTimeout);
        clearTimeout(this.showMessageTimeout);
    };
    SpinnerComponent.prototype.render = function () {
        return react_1.DOM.span({
            className: classNames('system-spinner', this.props.className),
            style: this.props.style,
        }, this.state.showSpinner ? react_1.DOM.i({ className: 'system-spinner__icon' }) : null, this.state.showMessage
            ? react_1.DOM.span({ className: 'system-spinner__message' }, 'Please wait...')
            : null);
    };
    return SpinnerComponent;
}(react_1.Component));
SpinnerComponent.defaultProps = {
    spinnerDelay: 500,
    messageDelay: 2000,
};
exports.SpinnerComponent = SpinnerComponent;
exports.Spinner = react_1.createFactory(SpinnerComponent);
exports.default = exports.Spinner;
