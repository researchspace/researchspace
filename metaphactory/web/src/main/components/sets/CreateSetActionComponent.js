Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var maybe = require("data.maybe");
var sets_1 = require("platform/components/sets");
var rdf_1 = require("platform/api/rdf");
var TypedSelectionActionComponent_1 = require("./TypedSelectionActionComponent");
var CreateSetActionComponent = (function (_super) {
    tslib_1.__extends(CreateSetActionComponent, _super);
    function CreateSetActionComponent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSave = function (selection, name) {
            var result = sets_1.createNewSetFromItems(_this.props.id, name, selection.map(rdf_1.Rdf.iri));
            result.onEnd(TypedSelectionActionComponent_1.closeDialog);
            return result;
        };
        return _this;
    }
    CreateSetActionComponent.prototype.render = function () {
        var _this = this;
        var _a = this.props, selection = _a.selection, closeMenu = _a.closeMenu, menuTitle = _a.menuTitle, title = _a.title;
        return React.createElement(TypedSelectionActionComponent_1.default, { menuTitle: menuTitle, title: title, isDisabled: function (s) { return s.length === 0; }, renderRawDialog: function (s) {
                return React.createElement(sets_1.SaveSetDialog, { onSave: function (name) { return _this.onSave(s, name); }, onHide: function () { }, maxSetSize: maybe.Nothing() });
            }, selection: selection, closeMenu: closeMenu });
    };
    return CreateSetActionComponent;
}(react_1.Component));
CreateSetActionComponent.defaultProps = {
    menuTitle: 'Create new set',
    title: 'Create new set',
};
exports.default = CreateSetActionComponent;
