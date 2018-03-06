Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_bootstrap_1 = require("react-bootstrap");
var lodash_1 = require("lodash");
var block = require("bem-cn");
var ReactBootstrap = require("react-bootstrap");
var maybe = require("data.maybe");
var classNames = require("classnames");
var table_1 = require("platform/components/semantic/table");
var SideBySideComparison_1 = require("./SideBySideComparison");
var OverlayComparison_1 = require("./OverlayComparison");
var sets_1 = require("platform/components/sets");
var ldp_set_1 = require("platform/api/services/ldp-set");
var overlay_1 = require("platform/components/ui/overlay");
var ldp_1 = require("platform/components/ldp");
var LdpLinkService_1 = require("../../data/LdpLinkService");
require("../../../scss/lightbox.scss");
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var ModalHeader = react_1.createFactory(ReactBootstrap.Modal.Header);
var ModalTitle = react_1.createFactory(ReactBootstrap.Modal.Title);
var ModalBody = react_1.createFactory(ReactBootstrap.Modal.Body);
var ACTION_DIALOG_REF = 'dialog-action';
exports.OverlayDialogComponent = function (props) {
    var b = block('rs-lightbox-modal');
    return Modal(lodash_1.assign({
        show: true,
    }, props, {
        animation: false,
        backdrop: false,
        className: b.toString(),
        dialogClassName: b('dialog').toString(),
    }), ModalHeader({ closeButton: false, className: b('header').toString() }, ModalTitle({}, react_1.DOM.button({
        className: classNames('btn', 'btn-default', b('back-button').toString()),
        onClick: function () { return overlay_1.getOverlaySystem().hide(ACTION_DIALOG_REF); },
    }, react_1.DOM.i({}), 'Back to Lightbox'), props.title)), ModalBody({
        className: b('body').toString(),
    }, react_1.DOM.div({
        style: { height: 800 },
    }, props.children)));
};
var LightBoxTable = (function (_super) {
    tslib_1.__extends(LightBoxTable, _super);
    function LightBoxTable() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.getSelectedCount = function () {
            return _this.refs.table ? _this.refs.table.getSelected().size : 0;
        };
        _this.getSelectedItems = function () {
            return _this.refs.table.getSelected().map(function (item) { return item.node; });
        };
        _this.showDialogAction = function (title, component, iiifServerUrl) {
            var images = _this.getSelectedItems().map(function (node) { return node.value; }).toArray();
            overlay_1.getOverlaySystem().show(ACTION_DIALOG_REF, react_1.createElement(exports.OverlayDialogComponent, {
                key: 'create-link',
                title: title,
                children: component({
                    iiifServerUrl: iiifServerUrl,
                    comparedImages: images,
                }),
            }));
        };
        _this.showLinkDialog = function () {
            var dialogRef = 'create-link';
            overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(ldp_1.CreateResourceDialog, {
                onSave: _this.createLink,
                onHide: function () { return overlay_1.getOverlaySystem().hide(dialogRef); },
                show: true,
                title: 'Create Linked Resource',
                placeholder: 'Enter link title',
            }));
        };
        _this.createLink = function (name) {
            var images = _this.getSelectedItems();
            return LdpLinkService_1.default.createLink(name, images);
        };
        _this.showCreateNewSetDialog = function () {
            var images = _this.getSelectedItems().toList();
            var dialogRef = 'add-to-new-set';
            overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(sets_1.SaveSetDialog, {
                onSave: function (name) { return ldp_set_1.getSetServiceForUser().flatMap(function (service) {
                    return service.createSetAndAddItems(name, images);
                }); },
                onHide: function () { return overlay_1.getOverlaySystem().hide(dialogRef); },
                maxSetSize: maybe.Nothing(),
            }));
        };
        return _this;
    }
    LightBoxTable.prototype.render = function () {
        var _this = this;
        var actions = react_1.DOM.div({ className: 'rs-lightbox-modal__actions' }, react_1.createElement(react_bootstrap_1.DropdownButton, {
            id: 'lightbo-actions',
            title: 'Actions',
            pullRight: true,
            onToggle: function () { return _this.forceUpdate(); },
        }, react_1.createElement(react_bootstrap_1.MenuItem, {
            disabled: this.getSelectedCount() < 1,
            onClick: function () {
                return _this.showDialogAction('Side-by-Side image comparison', SideBySideComparison_1.default, _this.props.config.iiifServerUrl);
            },
        }, 'Compare side-by-side'), react_1.createElement(react_bootstrap_1.MenuItem, {
            disabled: this.getSelectedCount() !== 2,
            onClick: function () {
                return _this.showDialogAction('Image overlay', OverlayComparison_1.default, _this.props.config.iiifServerUrl);
            },
        }, 'Overlay'), react_1.createElement(react_bootstrap_1.MenuItem, {
            onClick: this.showCreateNewSetDialog,
        }, 'Create new set'), react_1.createElement(react_bootstrap_1.MenuItem, {
            disabled: this.getSelectedCount() < 1,
            onClick: this.showLinkDialog,
        }, 'Link')));
        return react_1.DOM.div({}, actions, react_1.createElement(table_1.SemanticTable, lodash_1.assign({ ref: 'table' }, this.props)));
    };
    return LightBoxTable;
}(react_1.Component));
exports.c = LightBoxTable;
exports.f = react_1.createFactory(exports.c);
exports.default = exports.c;
