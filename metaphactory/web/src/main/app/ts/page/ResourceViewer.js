Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var overlay_1 = require("platform/components/ui/overlay");
var ResourceViewerDialog_1 = require("./ResourceViewerDialog");
var ResourceViewer = (function (_super) {
    tslib_1.__extends(ResourceViewer, _super);
    function ResourceViewer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onClick = function () {
            var dialogRef = "show-source-statements-" + _this.props.title;
            overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(ResourceViewerDialog_1.ResourceViewerDialog, _this.props));
        };
        return _this;
    }
    ResourceViewer.prototype.render = function () {
        var props = {
            onClick: this.onClick,
        };
        return react_1.cloneElement(react_1.Children.only(this.props.children), props);
    };
    return ResourceViewer;
}(react_1.Component));
exports.ResourceViewer = ResourceViewer;
