Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var spinner_1 = require("platform/components/ui/spinner");
var LoadingBackdrop = (function (_super) {
    tslib_1.__extends(LoadingBackdrop, _super);
    function LoadingBackdrop(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            showBackdrop: false,
        };
        return _this;
    }
    LoadingBackdrop.prototype.componentDidMount = function () {
        var _this = this;
        this.showBackdropTimeout =
            setTimeout(function () { return _this.setState({ showBackdrop: true }); }, 500);
    };
    LoadingBackdrop.prototype.componentWillUnmount = function () {
        clearTimeout(this.showBackdropTimeout);
    };
    LoadingBackdrop.prototype.render = function () {
        return this.state.showBackdrop ?
            react_1.DOM.div({ className: 'modal-backdrop in' }, react_1.createElement(spinner_1.Spinner)) : react_1.DOM.div({});
    };
    return LoadingBackdrop;
}(react_1.Component));
exports.LoadingBackdrop = LoadingBackdrop;
