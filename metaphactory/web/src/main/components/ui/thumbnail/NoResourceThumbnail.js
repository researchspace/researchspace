Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var NoResourceThumbnail = (function (_super) {
    tslib_1.__extends(NoResourceThumbnail, _super);
    function NoResourceThumbnail() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoResourceThumbnail.prototype.render = function () {
        return react_1.cloneElement(react_1.Children.only(this.props.children), this.props);
    };
    return NoResourceThumbnail;
}(react_1.Component));
exports.NoResourceThumbnail = NoResourceThumbnail;
exports.default = NoResourceThumbnail;
