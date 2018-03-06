Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var async_1 = require("platform/api/async");
var security_1 = require("platform/api/services/security");
var HasPermisssion = (function (_super) {
    tslib_1.__extends(HasPermisssion, _super);
    function HasPermisssion(props) {
        var _this = _super.call(this, props) || this;
        _this.cancellation = new async_1.Cancellation();
        _this.state = { allowedToSee: false };
        return _this;
    }
    HasPermisssion.prototype.componentWillMount = function () {
        var _this = this;
        this.cancellation.map(security_1.Util.isPermitted(this.props.permission)).onValue(function (allowedToSee) { return _this.setState({ allowedToSee: allowedToSee }); });
    };
    HasPermisssion.prototype.render = function () {
        if (this.state.allowedToSee) {
            return react_1.Children.only(this.props.children);
        }
        else {
            return null;
        }
    };
    return HasPermisssion;
}(react_1.Component));
exports.HasPermisssion = HasPermisssion;
exports.default = HasPermisssion;
