Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var React = require("react");
var react_1 = require("react");
var lodash_1 = require("lodash");
var Maybe = require("data.maybe");
var rdf_1 = require("platform/api/rdf");
var notification_1 = require("platform/components/ui/notification");
var components_1 = require("platform/api/components");
var ImageApi = require("../../data/iiif/ImageAPI");
var ImageAnnotationService_1 = require("../../data/iiif/ImageAnnotationService");
var ManifestBuilder_1 = require("../../data/iiif/ManifestBuilder");
var AnnotationEndpoint_1 = require("../../data/iiif/AnnotationEndpoint");
var Mirador_1 = require("./mirador/Mirador");
var D = React.DOM;
var ImageRegionEditorComponentMirador = (function (_super) {
    tslib_1.__extends(ImageRegionEditorComponentMirador, _super);
    function ImageRegionEditorComponentMirador(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.getRepositories = function () {
            return Maybe.fromNullable(_this.props.repositories).orElse(function () { return Maybe.fromNullable(_this.context.semanticContext).chain(function (c) { return Maybe.fromNullable([c.repository]); }); }).getOrElse(['default']);
        };
        _this.state = { loading: true };
        return _this;
    }
    ImageRegionEditorComponentMirador.prototype.componentDidMount = function () {
        var _this = this;
        var _a = this.props, imageOrRegion = _a.imageOrRegion, imageIdPattern = _a.imageIdPattern;
        var imageOrRegionIri = rdf_1.Rdf.iri(imageOrRegion);
        ImageAnnotationService_1.queryIIIFImageOrRegion(imageOrRegionIri, imageIdPattern, this.getRepositories()).onValue(function (imageInfo) {
            _this.setState({ loading: false, iiifImageId: imageInfo.imageId, info: imageInfo });
        }).onError(function (error) {
            _this.setState({ loading: false, errorMessage: error });
        });
    };
    ImageRegionEditorComponentMirador.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return nextState.loading !== this.state.loading || !lodash_1.isEqual(nextProps, this.props);
    };
    ImageRegionEditorComponentMirador.prototype.renderMirador = function (element) {
        var _this = this;
        if (!this.state || !this.state.info || !element) {
            return;
        }
        Mirador_1.removeMirador(this.miradorInstance, element);
        var imageOrRegion = this.props.imageOrRegion;
        var imageOrRegionIri = rdf_1.Rdf.iri(imageOrRegion);
        var imageInfo = this.state.info;
        var iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
        var imageServiceURI = ImageApi.constructServiceRequestUri(iiifServerUrl, this.state.iiifImageId);
        ImageApi.queryImageBounds(iiifServerUrl, this.state.iiifImageId)
            .mapErrors(function (error) {
            console.warn("Failed to fetch bounds of image: " + imageOrRegion);
            return undefined;
        }).flatMap(function (bounds) { return ManifestBuilder_1.createManifest({
            baseIri: imageInfo.imageIRI,
            imageIri: imageInfo.imageIRI,
            imageServiceUri: imageServiceURI,
            canvasSize: bounds,
        }, _this.getRepositories()); }).onValue(function (manifest) {
            var miradorConfig = _this.miradorConfigFromManifest(manifest, imageOrRegionIri, imageInfo);
            _this.miradorInstance = Mirador_1.renderMirador({
                targetElement: element,
                miradorConfig: miradorConfig,
                onInitialized: function (mirador) {
                    if (_this.state.info && _this.state.info.isRegion) {
                        var viewport_1 = _this.state.info.viewport;
                        Mirador_1.scrollToRegions(mirador, function () { return viewport_1; });
                    }
                },
            });
        });
    };
    ImageRegionEditorComponentMirador.prototype.miradorConfigFromManifest = function (manifest, imageOrRegion, imageInfo) {
        return {
            id: 'mirador',
            layout: '1x1',
            saveSession: false,
            data: [{
                    manifestUri: imageInfo.imageIRI.value,
                    location: 'British Museum',
                    manifestContent: manifest,
                }],
            annotationEndpoint: {
                name: 'Metaphactory annotation endpoint',
                module: 'AdapterAnnotationEndpoint',
                options: {
                    endpoint: new AnnotationEndpoint_1.LdpAnnotationEndpoint({
                        displayedRegion: imageInfo.isRegion ? imageOrRegion : undefined,
                    }),
                },
            },
            availableAnnotationDrawingTools: [
                'Rectangle', 'Ellipse', 'Freehand', 'Polygon', 'Pin',
            ],
            windowObjects: [{
                    loadedManifest: imageInfo.imageIRI.value + '/manifest.json',
                    viewType: 'ImageView',
                    sidePanel: false,
                    canvasControls: {
                        annotations: {
                            annotationState: 'on',
                            annotationRefresh: true,
                        },
                    },
                }],
            annotationBodyEditor: {
                module: 'MetaphactoryAnnotationBodyEditor',
                options: {},
            },
            jsonStorageEndpoint: {
                name: 'Dummy JSON Storage',
                module: 'DummyJSONStorage',
                options: {},
            },
        };
    };
    ImageRegionEditorComponentMirador.prototype.componentWillUnmount = function () {
        Mirador_1.removeMirador(this.miradorInstance, this.miradorElement);
    };
    ImageRegionEditorComponentMirador.prototype.render = function () {
        var _this = this;
        var errorMessage = this.state.errorMessage;
        return D.div({ style: { position: 'relative', width: '100%', height: '100%' } }, errorMessage
            ? React.createElement(notification_1.ErrorNotification, { errorMessage: errorMessage })
            : D.div({
                ref: function (element) {
                    _this.miradorElement = element;
                    _this.renderMirador(element);
                },
                id: 'mirador',
                className: 'mirador',
                style: { width: '100%', height: '100%', position: 'relative' },
            }));
    };
    return ImageRegionEditorComponentMirador;
}(components_1.Component));
ImageRegionEditorComponentMirador.propTypes = {
    imageOrRegion: react_1.PropTypes.string.isRequired,
    imageIdPattern: react_1.PropTypes.string.isRequired,
    iiifServerUrl: react_1.PropTypes.string.isRequired,
};
exports.ImageRegionEditorComponentMirador = ImageRegionEditorComponentMirador;
exports.c = ImageRegionEditorComponentMirador;
exports.f = React.createFactory(exports.c);
exports.default = exports.c;
