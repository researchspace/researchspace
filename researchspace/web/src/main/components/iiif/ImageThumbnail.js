Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var Kefir = require("kefir");
var lodash_1 = require("lodash");
var Maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var components_1 = require("platform/api/components");
var ImageApi = require("../../data/iiif/ImageAPI");
var ImageAnnotationService_1 = require("../../data/iiif/ImageAnnotationService");
var D = React.DOM;
var REGION_OVERLAY_MARGIN_FRACTION = 0.05;
var REGION_OVERLAY_STROKE_WIDTH = '2%';
var ImageThumbnailComponent = (function (_super) {
    tslib_1.__extends(ImageThumbnailComponent, _super);
    function ImageThumbnailComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.state = { loading: true };
        _this.requests = Kefir.pool();
        _this.requests.flatMapLatest(function (request) {
            return request.iri ? _this.loadImageOrRegion(request) : Kefir.never();
        }).onValue(function (thumbnail) { return _this.setState({ loading: true, thumbnail: thumbnail }); })
            .onError(function (error) { return _this.setState({ loading: false, error: error }); });
        return _this;
    }
    ImageThumbnailComponent.prototype.loadImageOrRegion = function (_a) {
        var iri = _a.iri, imageIdPattern = _a.imageIdPattern, iiifServerUrl = _a.iiifServerUrl, width = _a.width, height = _a.height;
        var repository = Maybe.fromNullable(this.context.semanticContext).map(function (c) { return c.repository; }).getOrElse('default');
        var queryResult = ImageAnnotationService_1.queryIIIFImageOrRegion(iri, imageIdPattern, [repository])
            .flatMap(function (info) { return ImageApi
            .queryImageBounds(iiifServerUrl, info.imageId)
            .map(function (bounds) { return ({ info: info, bounds: bounds }); }); });
        return queryResult.map(function (_a) {
            var info = _a.info, bounds = _a.bounds;
            var requestParams = {
                imageId: info.imageId,
                format: 'jpg',
            };
            var requestedRegion = (info.isRegion && info.boundingBox)
                ? computeDisplayedRegionWithMargin(info.boundingBox, bounds, REGION_OVERLAY_MARGIN_FRACTION)
                : undefined;
            requestParams.region = requestedRegion;
            if (width || height) {
                requestParams.size = new ImageApi.Size.BestFit(width, height);
            }
            var imageUri = ImageApi.constructImageUri(iiifServerUrl, requestParams);
            return {
                iiifUri: imageUri,
                info: info,
                requestedRegion: requestedRegion,
            };
        });
    };
    ImageThumbnailComponent.prototype.componentDidMount = function () {
        this.requestThumbnail(this.props);
    };
    ImageThumbnailComponent.prototype.componentWillReceiveProps = function (nextProps) {
        if (!lodash_1.isEqual(nextProps, this.props)) {
            this.requestThumbnail(nextProps);
        }
    };
    ImageThumbnailComponent.prototype.requestThumbnail = function (props) {
        this.requests.plug(Kefir.constant({
            iri: rdf_1.Rdf.iri(props.imageOrRegion),
            imageIdPattern: props.imageIdPattern,
            iiifServerUrl: props.iiifServerUrl,
            width: this.props.width ? Number(this.props.width) : undefined,
            height: this.props.height ? Number(this.props.height) : undefined,
        }));
    };
    ImageThumbnailComponent.prototype.componentWillUnmount = function () {
        this.requests.plug(Kefir.constant({}));
    };
    ImageThumbnailComponent.prototype.render = function () {
        var defaultSize = this.props.preserveImageSize ? undefined : '100%';
        var _a = this.props, width = _a.width, height = _a.height;
        if (width === undefined) {
            width = defaultSize;
        }
        if (height === undefined) {
            height = defaultSize;
        }
        return D.div({ className: 'image-thumbnail', style: { width: width, height: height } }, this.renderChild());
    };
    ImageThumbnailComponent.prototype.renderChild = function () {
        var _this = this;
        if (this.state.loading) {
            var image = this.state.thumbnail ? D.img({
                src: this.state.thumbnail.iiifUri,
                style: { display: 'none' },
                onLoad: function (e) { return _this.onImageLoad(e); },
                onError: function () { return _this.setState(function (prev) { return ({
                    loading: false, thumbnail: prev.thumbnail, error: "Failed to load image at URI '" + prev.thumbnail.iiifUri + "'.",
                }); }); },
            }) : null;
            return D.div({}, React.createElement(spinner_1.Spinner), image);
        }
        else if (this.state.error) {
            return React.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        else if (this.state.thumbnail) {
            return this.renderImage(this.state.thumbnail);
        }
        else {
            return D.span({}, this.props.imageOrRegion);
        }
    };
    ImageThumbnailComponent.prototype.onImageLoad = function (e) {
        var image = e.target;
        this.setState(function (prev) { return ({
            loading: false,
            thumbnail: {
                iiifUri: prev.thumbnail.iiifUri,
                info: prev.thumbnail.info,
                requestedRegion: prev.thumbnail.requestedRegion,
                naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
            },
        }); });
    };
    ImageThumbnailComponent.prototype.renderImage = function (thumbnail) {
        var _this = this;
        var hasOverlay = Boolean(thumbnail.info.svgContent);
        var _a = thumbnail.naturalSize, width = _a.width, height = _a.height;
        var componentSize = this.props.preserveImageSize
            ? thumbnail.naturalSize : { width: '100%', height: '100%' };
        return D.svg({
            style: {
                verticalAlign: 'middle',
                width: componentSize.width,
                height: componentSize.height,
            },
            preserveAspectRatio: 'xMidYMid meet',
            viewBox: "0 0 " + width + " " + height,
        }, D.image({ xlinkHref: thumbnail.iiifUri, width: width, height: height }), hasOverlay ? D.g({
            dangerouslySetInnerHTML: thumbnail.info.svgContent,
            ref: function (parent) { return _this.renderSVGOverlay(parent, thumbnail); },
        }) : undefined);
    };
    ImageThumbnailComponent.prototype.renderSVGOverlay = function (parent, thumbnail) {
        if (!parent) {
            return;
        }
        var svgElement = parent.firstChild;
        var region = thumbnail.requestedRegion;
        svgElement.setAttribute('viewBox', region.x + " " + region.y + " " +
            (region.width + " " + region.height));
        svgElement.setAttribute('width', String(thumbnail.naturalSize.width));
        svgElement.setAttribute('height', String(thumbnail.naturalSize.height));
        overrideOverlayStrokeWidth(svgElement, REGION_OVERLAY_STROKE_WIDTH);
    };
    return ImageThumbnailComponent;
}(components_1.Component));
function computeDisplayedRegionWithMargin(regionBounds, imageSize, marginPercent) {
    var margin = Math.max(regionBounds.width * marginPercent, regionBounds.height * marginPercent);
    return new ImageApi.Region.Absolute(Math.max(regionBounds.x - margin, 0), Math.max(regionBounds.y - margin, 0), Math.min(regionBounds.width + margin * 2, imageSize.width), Math.min(regionBounds.height + margin * 2, imageSize.height));
}
function overrideOverlayStrokeWidth(overlay, newWidth) {
    var paths = overlay.querySelectorAll('path');
    for (var i = 0; i < paths.length; i++) {
        paths[i].setAttribute('stroke-width', newWidth);
    }
}
exports.component = ImageThumbnailComponent;
exports.factory = React.createFactory(exports.component);
exports.default = exports.component;
