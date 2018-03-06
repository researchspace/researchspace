Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var maybe = require("data.maybe");
var cache_1 = require("platform/api/services/cache");
var alert_1 = require("platform/components/ui/alert");
var Button = react_1.createFactory(ReactBootstrap.Button);
var InvalidateCacheButton = (function (_super) {
    tslib_1.__extends(InvalidateCacheButton, _super);
    function InvalidateCacheButton(props) {
        var _this = _super.call(this, props) || this;
        _this.onClick = function () {
            cache_1.invalidateAllCaches().onValue(function (v) { return _this.setState({
                alert: maybe.Just({
                    message: v,
                    alert: alert_1.AlertType.SUCCESS,
                }),
            }); }).onError(function (e) { return _this.setState({
                alert: maybe.Just({
                    message: 'Cache invalidation failed: ' + e,
                    alert: alert_1.AlertType.DANGER,
                }),
            }); });
        };
        _this.state = {
            alert: maybe.Nothing(),
        };
        return _this;
    }
    InvalidateCacheButton.prototype.render = function () {
        return react_1.DOM.div({}, [
            react_1.createElement(alert_1.Alert, this.state.alert.map(function (config) { return config; }).getOrElse({ alert: alert_1.AlertType.NONE, message: '' })),
            Button({
                type: 'submit',
                bsSize: 'small',
                bsStyle: 'primary',
                className: 'btn btn-default',
                onClick: this.onClick,
            }, 'Invalidate All Caches'),
        ]);
    };
    return InvalidateCacheButton;
}(react_1.Component));
exports.component = InvalidateCacheButton;
exports.factory = react_1.createFactory(exports.component);
exports.default = exports.component;
