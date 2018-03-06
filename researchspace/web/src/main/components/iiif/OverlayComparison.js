Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var Kefir = require("kefir");
var Immutable = require("immutable");
var classNames = require("classnames");
var rdf_1 = require("platform/api/rdf");
var navigation_1 = require("platform/api/navigation");
var overlay_1 = require("platform/components/ui/overlay");
var utils_1 = require("platform/components/utils");
var ldp_1 = require("platform/components/ldp");
var ImageAnnotationService_1 = require("../../data/iiif/ImageAnnotationService");
var LDPOverlayImageService_1 = require("../../data/iiif/LDPOverlayImageService");
var OpenSeadragonOverlay_1 = require("./OpenSeadragonOverlay");
require("../../scss/image-overlay.scss");
var block = require("bem-cn");
var b = block('overlay-comparison');
var OverlayComparison = (function (_super) {
    tslib_1.__extends(OverlayComparison, _super);
    function OverlayComparison(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.createOverlayImage = function (name) {
            if (!_this.state.metadata || _this.state.metadata.size < 2) {
                return;
            }
            _this.setState(_this.updateState({ creatingImage: true }));
            return LDPOverlayImageService_1.default.createOverlayImage(name, _this.state.metadata.get(0).iri, _this.state.firstImageWeight, _this.state.metadata.get(1).iri, 1 - _this.state.firstImageWeight).flatMap(function (res) {
                _this.setState(_this.updateState({ creatingImage: false }));
                return navigation_1.navigateToResource(res, {}, 'assets');
            }).toProperty();
        };
        _this.state = _this.updateState({ firstImageWeight: 0.5 });
        return _this;
    }
    OverlayComparison.prototype.loadState = function (props) {
        var tasks = props.selection
            .map(function (iri) { return typeof iri === 'string' ? rdf_1.Rdf.iri(iri) : iri; })
            .map(function (iri) { return ImageAnnotationService_1.queryIIIFImageOrRegion(iri, props.imageIdPattern, props.repositories); });
        return Kefir.zip(tasks).map(function (metadata) { return ({
            metadata: Immutable.List(metadata),
        }); });
    };
    OverlayComparison.prototype.render = function () {
        var _this = this;
        var rendered = _super.prototype.render.call(this);
        return react_1.DOM.div({
            className: b('').toString(),
        }, react_1.DOM.div({
            className: b('controls').toString(),
        }, react_1.DOM.span({ className: b('image-label').toString() }, 'First image'), react_1.DOM.input({
            className: b('slider').toString(),
            readOnly: this.state.loading,
            type: 'range',
            min: 0, max: 1, step: 0.01,
            value: this.state.firstImageWeight,
            onChange: function (event) {
                var input = event.target;
                var opacity = parseFloat(input.value);
                var capped = isNaN(opacity)
                    ? 0.5 : Math.min(1, Math.max(0, opacity));
                _this.setState(_this.updateState({ firstImageWeight: capped }));
            },
        }), react_1.DOM.span({ className: b('image-label').toString() }, 'Second image'), react_1.DOM.button({
            type: 'button',
            className: classNames('btn', 'btn-default', b('submit').toString()),
            disabled: this.state.loading || this.state.creatingImage,
            onClick: function () {
                var dialogRef = 'create-overlay-image';
                overlay_1.getOverlaySystem().show(dialogRef, react_1.createElement(ldp_1.CreateResourceDialog, {
                    onSave: _this.createOverlayImage,
                    onHide: function () { return overlay_1.getOverlaySystem().hide(dialogRef); },
                    show: true,
                    title: 'Create overlay image',
                    placeholder: 'Enter image title',
                }));
            },
        }, 'Create overlayed image')), react_1.DOM.div({ className: b('image-container').toString() }, rendered ? rendered : react_1.createElement(OpenSeadragonOverlay_1.OpenSeadragonOverlay, {
            metadata: this.state.metadata,
            iiifServerUrl: this.props.iiifServerUrl,
            firstImageWeight: this.state.firstImageWeight,
        })));
    };
    return OverlayComparison;
}(utils_1.KefirComponentBase));
OverlayComparison.defaultProps = {
    repositories: ['default'],
};
exports.OverlayComparison = OverlayComparison;
exports.c = OverlayComparison;
exports.f = react_1.createFactory(exports.c);
exports.default = exports.c;
