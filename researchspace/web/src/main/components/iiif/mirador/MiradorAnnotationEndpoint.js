Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var _ = require("lodash");
var rdf_1 = require("platform/api/rdf");
var LDPImageRegionService_1 = require("../../../data/iiif/LDPImageRegionService");
var AdapterAnnotationEndpoint = (function () {
    function AdapterAnnotationEndpoint(options) {
        this.dfd = options.dfd;
        this.endpoint = options.endpoint;
    }
    AdapterAnnotationEndpoint.prototype.init = function () {
        if (this.endpoint.init) {
            this.endpoint.init();
        }
    };
    AdapterAnnotationEndpoint.prototype.set = function (property, value, options) {
        this[property] = value;
    };
    AdapterAnnotationEndpoint.prototype.userAuthorize = function (action, annotation) {
        if (this.endpoint.userAuthorize) {
            return this.endpoint.userAuthorize(action, annotation);
        }
        else {
            return true;
        }
    };
    AdapterAnnotationEndpoint.prototype.search = function (options, onSuccess, onError) {
        var _this = this;
        this.annotationsList = [];
        var task = this.endpoint.search
            ? this.endpoint.search(rdf_1.Rdf.iri(options.uri))
            : Kefir.constantError(new Error('AnnotationEndpoint.search is not implemented'));
        task.onValue(function (annotationList) {
            if (typeof onSuccess === 'function') {
                onSuccess(annotationList);
            }
            else {
                _this.annotationsList = annotationList.map(function (annotation) {
                    annotation['endpoint'] = _this;
                    return annotation;
                });
                _this.dfd.resolve(false);
            }
        }).onError(onError);
    };
    AdapterAnnotationEndpoint.prototype.create = function (oaAnnotation, onSuccess, onError) {
        oaAnnotation['@id'] = '';
        var textResource = LDPImageRegionService_1.getAnnotationTextResource(oaAnnotation);
        oaAnnotation['http://www.w3.org/2000/01/rdf-schema#label'] =
            textResource.chars.replace(/<(?:.|\n)*?>/gm, '');
        oaAnnotation['endpoint'] = this;
        var clone = cloneAnnotation(oaAnnotation);
        var task = this.endpoint.create
            ? this.endpoint.create(clone)
            : Kefir.constantError(new Error('AnnotationEndpoint.create is not implemented'));
        task.onValue(function (iri) {
            oaAnnotation['@id'] = iri.value;
            onSuccess(oaAnnotation);
        }).onError(onError);
    };
    AdapterAnnotationEndpoint.prototype.update = function (oaAnnotation, onSuccess, onError) {
        var clone = cloneAnnotation(oaAnnotation);
        var textResource = LDPImageRegionService_1.getAnnotationTextResource(clone);
        clone['http://www.w3.org/2000/01/rdf-schema#label'] =
            textResource.chars.replace(/<(?:.|\n)*?>/gm, '');
        var task = this.endpoint.update
            ? this.endpoint.update(clone)
            : Kefir.constantError(new Error('AnnotationEndpoint.update is not implemented'));
        task.onValue(function (iri) { onSuccess(); }).onError(onError);
    };
    AdapterAnnotationEndpoint.prototype.deleteAnnotation = function (annotationId, onSuccess, onError) {
        var task = this.endpoint.remove
            ? this.endpoint.remove(rdf_1.Rdf.iri(annotationId))
            : Kefir.constantError(new Error('AnnotationEndpoint.delete is not implemented'));
        task.onValue(onSuccess).onError(onError);
    };
    return AdapterAnnotationEndpoint;
}());
exports.AdapterAnnotationEndpoint = AdapterAnnotationEndpoint;
function cloneAnnotation(annotation) {
    var endpoint = annotation['endpoint'];
    delete annotation['endpoint'];
    var clone = _.cloneDeep(annotation);
    annotation['endpoint'] = endpoint;
    return clone;
}
