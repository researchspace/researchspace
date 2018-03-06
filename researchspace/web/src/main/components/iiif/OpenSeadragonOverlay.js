Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var OpenSeadragon = require("openseadragon");
var ImageApi = require("../../data/iiif/ImageAPI");
require("../../scss/image-overlay.scss");
var block = require("bem-cn");
var b = block('open-seadragon-overlay');
var OpenSeadragonOverlay = (function (_super) {
    tslib_1.__extends(OpenSeadragonOverlay, _super);
    function OpenSeadragonOverlay(props) {
        var _this = _super.call(this, props) || this;
        _this.onFirstImageLoaded = function (event) {
            _this.osd.images.push(event.tiledImage);
            var opacity = subsequentImagesOpacity(_this.props.firstImageWeight, _this.props.metadata.size);
            _this.props.metadata.skip(1).forEach(function (imageInfo) {
                var requestUri = _this.getImageInformationRequestUri(imageInfo);
                _this.osd.viewer.addTiledImage({
                    tileSource: requestUri,
                    opacity: opacity,
                    success: _this.onSubsequentImageLoaded,
                });
            });
        };
        _this.onSubsequentImageLoaded = function (event) {
            _this.osd.images.push(event.item);
        };
        return _this;
    }
    OpenSeadragonOverlay.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (this.osd) {
            if (nextProps.firstImageWeight !== this.props.firstImageWeight) {
                this.setOpacity(nextProps.firstImageWeight);
            }
        }
        return false;
    };
    OpenSeadragonOverlay.prototype.setOpacity = function (firstImageOpacity) {
        var subsequentOpacity = subsequentImagesOpacity(firstImageOpacity, this.osd.images.length);
        for (var i = 1; i < this.osd.images.length; i++) {
            this.osd.images[i].setOpacity(subsequentOpacity);
        }
        this.osd.viewer.forceRedraw();
    };
    OpenSeadragonOverlay.prototype.getImageInformationRequestUri = function (imageInfo) {
        var serverAndPrefix = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
        return ImageApi.constructInformationRequestUri(serverAndPrefix, imageInfo.imageId);
    };
    OpenSeadragonOverlay.prototype.render = function () {
        var _this = this;
        return react_1.DOM.div({
            className: b('').toString(),
            style: {},
            ref: function (element) {
                try {
                    _this.renderOpenSeadragon(element);
                }
                catch (e) {
                    console.log(e);
                }
            },
        });
    };
    OpenSeadragonOverlay.prototype.renderOpenSeadragon = function (element) {
        if (element && this.props.metadata && this.props.iiifServerUrl) {
            var viewer = OpenSeadragon({
                id: 'osd',
                element: element,
                alwaysBlend: true,
                showNavigationControl: false,
                opacity: 1,
                minZoomImageRatio: 0.6,
                maxZoomPixelRatio: 4,
                tileSources: [
                    this.getImageInformationRequestUri(this.props.metadata.first()),
                ],
            });
            viewer.addOnceHandler('tile-loaded', this.onFirstImageLoaded);
            this.osd = { viewer: viewer, images: [] };
        }
        else if (this.osd) {
            this.osd.viewer.destroy();
            this.osd = undefined;
        }
    };
    return OpenSeadragonOverlay;
}(react_1.Component));
exports.OpenSeadragonOverlay = OpenSeadragonOverlay;
function subsequentImagesOpacity(firstImageWeight, imageCount) {
    return (1 - firstImageWeight) / Math.max(1, imageCount - 1);
}
