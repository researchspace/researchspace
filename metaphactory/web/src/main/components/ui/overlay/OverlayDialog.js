Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var assign = require("object-assign");
var _ = require("lodash");
var block = require("bem-cn");
var classNames = require("classnames");
var overlay_1 = require("platform/components/ui/overlay");
var OverlayDialogTrigger_1 = require("./OverlayDialogTrigger");
var OverlayDialogContent_1 = require("./OverlayDialogContent");
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var ModalHeader = react_1.createFactory(ReactBootstrap.Modal.Header);
var ModalTitle = react_1.createFactory(ReactBootstrap.Modal.Title);
var ModalBody = react_1.createFactory(ReactBootstrap.Modal.Body);
require("./overlay-dialog.scss");
exports.OverlayDialog = function (props) {
    var type = props.type && (props.type === 'modal' || props.type === 'lightbox') ? props.type : 'modal';
    var className = props.className ? props.className :
        (type === 'lightbox' ? 'overlay-lightbox' : 'overlay-modal');
    var b = block(className);
    return Modal(assign({}, props, { onHide: props.onHide, backdrop: type === 'modal' ? 'static' : false,
        className: b('').toString(),
        dialogClassName: classNames('modal-dialog', b('dialog').toString()),
        bsSize: (props.type === 'modal' || props.type === undefined) && props.bsSize
            ? props.bsSize : null }), ModalHeader({ closeButton: true, className: b('header').toString() }, ModalTitle({}, props.title)), ModalBody({
        className: b('body').toString(),
    }, props.children));
};
var OverlayComponent = (function (_super) {
    tslib_1.__extends(OverlayComponent, _super);
    function OverlayComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OverlayComponent.prototype.render = function () {
        var _this = this;
        var children = react_1.Children.toArray(this.props.children);
        var anchorComponent = _.find(children, function (child) { return child.type === OverlayDialogTrigger_1.default; });
        var bodyComponent = _.find(children, function (child) { return child.type === OverlayDialogContent_1.default; });
        var anchorChild = react_1.Children.only(anchorComponent).props.children;
        var bodyChild = react_1.Children.only(bodyComponent).props.children;
        var props = {
            onClick: function (event) {
                event.preventDefault();
                overlay_1.getOverlaySystem().show(_this.props.title, exports.OverlayDialog({
                    show: true,
                    title: _this.props.title,
                    type: _this.props.type,
                    className: _this.props.className,
                    onHide: function () { return overlay_1.getOverlaySystem().hide(_this.props.title); },
                    children: bodyChild,
                    bsSize: _this.props.bsSize,
                }));
            },
        };
        return react_1.cloneElement(anchorChild, props);
    };
    return OverlayComponent;
}(react_1.Component));
exports.OverlayComponent = OverlayComponent;
exports.default = OverlayComponent;
