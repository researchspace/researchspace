Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var lodash_1 = require("lodash");
var Kefir = require("kefir");
var maybe = require("data.maybe");
var components_1 = require("platform/api/components");
var rdf_1 = require("platform/api/rdf");
var notification_1 = require("platform/components/ui/notification");
var spinner_1 = require("platform/components/ui/spinner");
var ImageAnnotationService_1 = require("../../data/iiif/ImageAnnotationService");
var ImageApi = require("../../data/iiif/ImageAPI");
var ManifestBuilder_1 = require("../../data/iiif/ManifestBuilder");
var LDPImageRegionService_1 = require("../../data/iiif/LDPImageRegionService");
var AnnotationEndpoint_1 = require("../../data/iiif/AnnotationEndpoint");
var Mirador_1 = require("./mirador/Mirador");
var SideBySideComparison = (function (_super) {
    tslib_1.__extends(SideBySideComparison, _super);
    function SideBySideComparison(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.requests = Kefir.pool();
        _this.miradorElementId = lodash_1.uniqueId('mirador_');
        _this.state = { loading: true };
        _this.requests.flatMapLatest(function (request) { return request.isJust
            ? _this.loadMiradorConfig(request.get()) : Kefir.never(); }).onValue(function (_a) {
            var imagesMetadata = _a.imagesMetadata, miradorConfig = _a.miradorConfig;
            return _this.setState({ loading: false, imagesMetadata: imagesMetadata, miradorConfig: miradorConfig });
        }).onError(function (error) { return _this.setState({ loading: false, error: error }); });
        return _this;
    }
    SideBySideComparison.prototype.loadMiradorConfig = function (request) {
        var _this = this;
        return this.gatherImageMetadata(request).map(function (imagesMetadata) {
            var miradorConfig = _this.createMiradorConfig(imagesMetadata);
            return { imagesMetadata: imagesMetadata, miradorConfig: miradorConfig };
        });
    };
    SideBySideComparison.prototype.gatherImageMetadata = function (request) {
        var repositories = request.repositories;
        var serviceUrl = ImageApi.getIIIFServerUrl(request.iiifServerUrl);
        var metadataTasks = request.selection
            .map(function (iri) { return typeof iri === 'string' ? rdf_1.Rdf.iri(iri) : iri; })
            .map(function (iri) { return ImageAnnotationService_1.queryIIIFImageOrRegion(iri, request.imageIdPattern, repositories).flatMap(function (imageInfo) {
            var serviceRequestUri = ImageApi.constructServiceRequestUri(serviceUrl, imageInfo.imageId);
            return ImageApi.queryImageBounds(serviceUrl, imageInfo.imageId).flatMap(function (bounds) {
                return LDPImageRegionService_1.LdpRegionService.search(imageInfo.imageIRI).flatMap(function (annotations) {
                    return ManifestBuilder_1.createManifest({
                        baseIri: imageInfo.iri,
                        imageIri: imageInfo.imageIRI,
                        imageServiceUri: serviceRequestUri,
                        canvasSize: bounds,
                    }, repositories).map(function (manifest) { return ({ manifest: manifest, imageInfo: imageInfo, annotations: annotations }); });
                });
            });
        }); });
        return Kefir.zip(metadataTasks);
    };
    SideBySideComparison.prototype.createMiradorConfig = function (imagesMetadata) {
        var metadataByIri = lodash_1.keyBy(imagesMetadata, function (meta) { return meta.imageInfo.iri.value; });
        var annotationEndpoint = new SideBySideAnnotationEndpoint(metadataByIri);
        return {
            id: this.miradorElementId,
            layout: chooseMiradorLayout(imagesMetadata.length),
            saveSession: false,
            data: imagesMetadata.map(function (metadata) { return ({
                manifestUri: metadata.imageInfo.imageIRI.value,
                location: 'British Museum',
                manifestContent: metadata.manifest,
            }); }),
            annotationEndpoint: {
                name: 'Metaphactory annotation endpoint',
                module: 'AdapterAnnotationEndpoint',
                options: {
                    endpoint: annotationEndpoint,
                },
            },
            windowObjects: imagesMetadata.map(function (metadata) { return ({
                loadedManifest: metadata.manifest['@id'],
                viewType: 'ImageView',
                sidePanel: false,
                canvasControls: {
                    annotations: {
                        annotationState: 'on',
                        annotationCreation: true,
                    },
                },
            }); }),
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
    SideBySideComparison.prototype.componentDidMount = function () {
        this.requests.plug(Kefir.constant(maybe.Just(this.props)));
    };
    SideBySideComparison.prototype.componentWillUnmount = function () {
        this.requests.plug(Kefir.constant(maybe.Nothing()));
        Mirador_1.removeMirador(this.miradorInstance, this.miradorElement);
    };
    SideBySideComparison.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        return nextState.loading !== this.state.loading || !lodash_1.isEqual(nextProps, this.props);
    };
    SideBySideComparison.prototype.render = function () {
        return react_1.DOM.div({ style: { position: 'relative', width: '100%', height: '100%' } }, this.renderContent());
    };
    SideBySideComparison.prototype.renderContent = function () {
        var _this = this;
        if (this.state.loading) {
            return react_1.createElement(spinner_1.Spinner);
        }
        else if (this.state.error) {
            return react_1.createElement(notification_1.ErrorNotification, { errorMessage: this.state.error });
        }
        else {
            return react_1.DOM.div({
                ref: function (element) {
                    _this.miradorElement = element;
                    _this.renderMirador(element);
                },
                id: this.miradorElementId,
                className: 'mirador',
                style: { width: '100%', height: '100%', position: 'relative' },
            });
        }
    };
    SideBySideComparison.prototype.renderMirador = function (element) {
        var _this = this;
        if (!this.state || !this.state.miradorConfig || !element) {
            return;
        }
        Mirador_1.removeMirador(this.miradorInstance, element);
        this.miradorInstance = Mirador_1.renderMirador({
            targetElement: element,
            miradorConfig: this.state.miradorConfig,
            onInitialized: function (mirador) {
                Mirador_1.scrollToRegions(mirador, function (index) {
                    var metadata = _this.state.imagesMetadata[index];
                    return metadata.imageInfo.viewport;
                });
            },
        });
    };
    return SideBySideComparison;
}(components_1.Component));
SideBySideComparison.defaultProps = {
    repositories: ['default'],
};
exports.SideBySideComparison = SideBySideComparison;
function chooseMiradorLayout(slotCount) {
    var layout = { type: 'column' };
    if (slotCount <= 1) {
        return layout;
    }
    var rows = Math.max(1, Math.floor(Math.sqrt(slotCount)));
    var columns = Math.ceil(slotCount / rows);
    var columnsInLastRow = slotCount - columns * (rows - 1);
    layout.children = [];
    for (var i = 0; i < rows; i++) {
        var row = { type: 'row', children: [] };
        layout.children.push(row);
        var columnCount = (i === rows - 1) ? columnsInLastRow : columns;
        for (var j = 0; j < columnCount; j++) {
            row.children.push({ type: 'column' });
        }
    }
    return layout;
}
var SideBySideAnnotationEndpoint = (function (_super) {
    tslib_1.__extends(SideBySideAnnotationEndpoint, _super);
    function SideBySideAnnotationEndpoint(metadataByIri) {
        var _this = _super.call(this, {}) || this;
        _this.metadataByIri = metadataByIri;
        return _this;
    }
    SideBySideAnnotationEndpoint.prototype.search = function (canvasIri) {
        var meta = this.metadataByIri[canvasIri.value];
        if (meta && meta.imageInfo.isRegion) {
            return Kefir.constant(meta.annotations.filter(function (annotation) { return annotation['@id'] === canvasIri.value; }));
        }
        else {
            return Kefir.constant(meta.annotations);
        }
    };
    return SideBySideAnnotationEndpoint;
}(AnnotationEndpoint_1.LdpAnnotationEndpoint));
exports.c = SideBySideComparison;
exports.f = react_1.createFactory(exports.c);
exports.default = exports.c;
