Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var components_1 = require("platform/api/components");
var TypedSelectionActionComponent_1 = require("platform/components/sets/TypedSelectionActionComponent");
var SideBySideComparison_1 = require("../SideBySideComparison");
var SideBySideComparisonActionComponent = (function (_super) {
    tslib_1.__extends(SideBySideComparisonActionComponent, _super);
    function SideBySideComparisonActionComponent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SideBySideComparisonActionComponent.prototype.render = function () {
        var _a = this.props, iiifServerUrl = _a.iiifServerUrl, imageIdPattern = _a.imageIdPattern, selection = _a.selection, closeMenu = _a.closeMenu, menuTitle = _a.menuTitle, title = _a.title, types = _a.types, repositories = _a.repositories;
        return React.createElement(TypedSelectionActionComponent_1.default, { repositories: repositories, menuTitle: menuTitle, title: title, isDisabled: function (selection) { return selection.length < 2; }, renderDialog: function (selection) {
                return React.createElement(SideBySideComparison_1.default, { repositories: repositories, iiifServerUrl: iiifServerUrl, imageIdPattern: imageIdPattern, selection: selection });
            }, selection: selection, closeMenu: closeMenu, types: types });
    };
    return SideBySideComparisonActionComponent;
}(components_1.Component));
SideBySideComparisonActionComponent.defaultProps = {
    menuTitle: 'Compare side-by-side',
    title: 'Side-by-Side image comparison',
    types: ['http://www.researchspace.org/ontology/EX_Digital_Image'],
};
exports.default = SideBySideComparisonActionComponent;
