Object.defineProperty(exports, "__esModule", { value: true });
var React = require("react");
var react_dom_1 = require("react-dom");
var LDPImageRegionService_1 = require("../../../data/iiif/LDPImageRegionService");
var D = React.DOM;
var MetaphactoryAnnotationBodyEditor = (function () {
    function MetaphactoryAnnotationBodyEditor(options) {
        this.annotation = options.annotation;
        this.windowId = options.windowId;
        var textResource = LDPImageRegionService_1.getAnnotationTextResource(this.annotation);
        this.originalRegionTitle = textResource ? textResource.chars : '';
    }
    MetaphactoryAnnotationBodyEditor.prototype.show = function (selector) {
        var container = document.querySelector(selector);
        if (!container) {
            return;
        }
        var root = document.createElement('div');
        container.insertBefore(root, container.firstChild);
        var reactElement = this.renderReactElement();
        react_dom_1.render(reactElement, root);
    };
    MetaphactoryAnnotationBodyEditor.prototype.renderReactElement = function () {
        var _this = this;
        return D.div({ className: 'annotation-body-editor' }, D.input({
            className: 'annotation-body-editor__title-field',
            placeholder: 'Title',
            defaultValue: this.originalRegionTitle,
            onChange: function (event) {
                _this.changedRegionTitle = event.target.value;
            },
        }));
    };
    MetaphactoryAnnotationBodyEditor.prototype.isDirty = function () { return this.changedRegionTitle !== this.originalRegionTitle; };
    MetaphactoryAnnotationBodyEditor.prototype.createAnnotation = function () {
        return {
            '@context': 'http://iiif.io/api/presentation/2/context.json',
            '@type': 'oa:Annotation',
            'motivation': ['oa:commenting'],
            'resource': {
                '@type': 'dctypes:Text',
                'format': 'text/html',
                'chars': this.changedRegionTitle,
            },
        };
    };
    MetaphactoryAnnotationBodyEditor.prototype.updateAnnotation = function (annotation) {
        var textResource = LDPImageRegionService_1.getAnnotationTextResource(this.annotation);
        if (textResource) {
            textResource.chars = this.changedRegionTitle;
        }
    };
    return MetaphactoryAnnotationBodyEditor;
}());
exports.MetaphactoryAnnotationBodyEditor = MetaphactoryAnnotationBodyEditor;
