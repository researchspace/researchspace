Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var classNames = require("classnames");
var lodash_1 = require("lodash");
require("./alert-component.scss");
var AlertType;
(function (AlertType) {
    AlertType[AlertType["NONE"] = 0] = "NONE";
    AlertType[AlertType["INFO"] = 1] = "INFO";
    AlertType[AlertType["WARNING"] = 2] = "WARNING";
    AlertType[AlertType["SUCCESS"] = 3] = "SUCCESS";
    AlertType[AlertType["DANGER"] = 4] = "DANGER";
})(AlertType = exports.AlertType || (exports.AlertType = {}));
function Error(message) {
    return {
        alert: AlertType.DANGER,
        message: message,
    };
}
exports.Error = Error;
var Alert = (function (_super) {
    tslib_1.__extends(Alert, _super);
    function Alert(props) {
        var _this = _super.call(this, props) || this;
        _this.getCSS = function (alert) {
            switch (alert) {
                case AlertType.INFO: return 'alert-component__info';
                case AlertType.WARNING: return 'alert-component__warning';
                case AlertType.DANGER: return 'alert-component__danger';
                case AlertType.SUCCESS: return 'alert-component__success';
                case AlertType.NONE: return 'alert-component__none';
                default: return 'alert-component';
            }
        };
        return _this;
    }
    Alert.prototype.render = function () {
        return react_1.DOM.div({
            className: classNames('alert-component', this.getCSS(this.props.alert)),
        }, lodash_1.isEmpty(this.props.message) ? '' : this.props.message);
    };
    return Alert;
}(react_1.Component));
exports.Alert = Alert;
