Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
require("./removable-badge.scss");
var CLASS_NAME = 'RemovableBadge';
var RemovableBadge = (function (_super) {
    tslib_1.__extends(RemovableBadge, _super);
    function RemovableBadge() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    RemovableBadge.prototype.render = function () {
        return react_1.DOM.div({
            className: CLASS_NAME + " " + (this.props.className || ''),
            style: this.props.style,
            title: this.props.title,
        }, react_1.DOM.button({
            className: CLASS_NAME + "__content",
            type: 'button',
            onClick: this.props.onClick,
        }, this.props.children), react_1.DOM.button({
            className: CLASS_NAME + "__remove",
            type: 'button',
            onClick: this.props.onRemove,
        }, react_1.DOM.span({ className: 'fa fa-times' })));
    };
    return RemovableBadge;
}(react_1.Component));
exports.RemovableBadge = RemovableBadge;
exports.default = RemovableBadge;
