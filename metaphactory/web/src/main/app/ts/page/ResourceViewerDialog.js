Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var overlay_1 = require("platform/components/ui/overlay");
var PageLoader = require("platform/components/ui/page-loader");
var ResourceViewerDialog = (function (_super) {
    tslib_1.__extends(ResourceViewerDialog, _super);
    function ResourceViewerDialog() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ResourceViewerDialog.prototype.render = function () {
        return React.createElement(overlay_1.OverlayDialog, { type: 'modal', onHide: function () { overlay_1.getOverlaySystem().hideAll(); }, title: this.props.title, show: true, className: 'resource-viewer-modal', bsSize: 'lg' },
            React.createElement(PageLoader.component, { iri: this.props.pageIri }));
    };
    return ResourceViewerDialog;
}(react_1.Component));
exports.ResourceViewerDialog = ResourceViewerDialog;
