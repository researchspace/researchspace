Object.defineProperty(exports, "__esModule", { value: true });
var Kefir = require("kefir");
var lodash_1 = require("lodash");
var assign = require("object-assign");
var _ = require("lodash");
var rso_1 = require("../../../data/vocabularies/rso");
var MiradorAnnotationEndpoint_1 = require("./MiradorAnnotationEndpoint");
var AnnotationBodyEditor_1 = require("./AnnotationBodyEditor");
require("cache-loader!script-loader!../../../lib/mirador/mirador.js");
require("../../../lib/mirador/css/mirador.scss");
require("../../../scss/iiif-region-editor-mirador.scss");
function ensureBusExists(emitter) {
    if (typeof emitter.bus === 'undefined') {
        emitter.bus = $({});
    }
}
Mirador.EventEmitter.prototype.subscribe = function () {
    ensureBusExists(this);
    this.bus.on.apply(this.bus, arguments);
};
Mirador.EventEmitter.prototype.unsubscribe = function () {
    ensureBusExists(this);
    this.bus.off.apply(this.bus, arguments);
};
Mirador.EventEmitter.prototype.publish = function (name) {
    ensureBusExists(this);
    if (typeof this.eventStackDepth === 'undefined') {
        this.eventStackDepth = 0;
    }
    if (this.debug && name.indexOf('updateTooltips') !== 0) {
        var args = Array.prototype.slice.call(arguments);
        if (args.length > 0) {
            args[0] = Array(this.eventStackDepth + 1).join('> ') + args[0];
        }
        console.log(args);
    }
    this.eventStackDepth++;
    var result = this.bus.trigger.apply(this.bus, arguments);
    this.eventStackDepth--;
    return result;
};
function clearAllSubscriptions(emitter) {
    var mixin = emitter;
    if (mixin.bus) {
        mixin.bus.remove();
        delete mixin.bus;
    }
}
Mirador.EventEmitter.debug = false;
Mirador['AdapterAnnotationEndpoint'] = MiradorAnnotationEndpoint_1.AdapterAnnotationEndpoint;
Mirador['MetaphactoryAnnotationBodyEditor'] = AnnotationBodyEditor_1.MetaphactoryAnnotationBodyEditor;
Mirador['DummyJSONStorage'] = (function () {
    function class_1() {
    }
    class_1.prototype.readSync = function (blobId) { return {}; };
    class_1.prototype.save = function (blob) {
        var deferred = $.Deferred();
        deferred.reject();
        return deferred.promise();
    };
    return class_1;
}());
var globalHandlebars = window['Handlebars'];
Mirador.AnnotationTooltip.prototype.viewerTemplate = globalHandlebars.compile([
    '<div class="all-annotations" id="annotation-viewer-{{windowId}}">',
    '{{#each annotations}}',
    '<div class="annotation-display annotation-tooltip" data-anno-id="{{id}}">',
    '<div class="button-container">',
    '<mp-template-item><semantic-link guess-repository=true uri="{{id}}"></semantic-link></mp-template-item>',
    '<i class="fa fa fa-external-link fa-fw"></i>open</a>',
    '{{#if showUpdate}}<a href="#edit" class="edit">',
    '<i class="fa fa-pencil-square-o fa-fw"></i>{{t "edit"}}</a>{{/if}}',
    '{{#if showDelete}}<a href="#delete" class="delete">',
    '<i class="fa fa-trash-o fa-fw"></i>{{t "delete"}}</a>{{/if}}',
    '</div>',
    '<div class="text-viewer">',
    '{{#if username}}<p class="user">{{username}}:</p>{{/if}}',
    '<p>{{{annoText}}}</p>',
    '</div>',
    '<div id="tags-viewer-{{windowId}}" class="tags-viewer">',
    '{{#each tags}}',
    '<span class="tag">{{this}}</span>',
    '{{/each}}',
    '</div>',
    '</div>',
    '{{/each}}',
    '</div>',
].join(''));
var MiradorOpenSeadragon = Mirador.OpenSeadragon;
Mirador.OpenSeadragon = function (options) {
    options.maxZoomPixelRatio = Infinity;
    return MiradorOpenSeadragon(options);
};
var buildAnnotation = Mirador.MiradorDualStrategy.prototype.buildAnnotation;
Mirador.MiradorDualStrategy.prototype.buildAnnotation = function (options) {
    var annotation = buildAnnotation.apply(this, arguments);
    var viewer = options.overlay.viewer;
    var viewportBounds = viewer.viewport.getBounds(true);
    var scope = viewer.viewport.viewportToImageRectangle(viewportBounds);
    annotation[rso_1.default.viewport.value] = rectangleToFragmentString(scope);
    return annotation;
};
function rectangleToFragmentString(_a) {
    var x = _a.x, y = _a.y, width = _a.width, height = _a.height;
    return "xywh=" + Math.round(x) + "," + Math.round(y) + "," + Math.round(width) + "," + Math.round(height);
}
var overlayInit = Mirador.Overlay.prototype.init;
Mirador.Overlay.prototype.init = function () {
    this.hitOptions.tolerance = 50;
    overlayInit.apply(this, arguments);
};
var hackTimer;
function applyRedrawHack(mirador, onInitialized) {
    if (hackTimer) {
        console.error('Mirador redraw timer already set');
    }
    hackTimer = window.setInterval(function () {
        if (!_.isEmpty($('.mirador-viewer:visible'))) {
            mirador.viewer.workspace.calculateLayout();
            onInitialized(mirador);
            window.clearInterval(hackTimer);
            hackTimer = null;
        }
    }, 500);
}
function scrollToRegions(mirador, region) {
    var windows = mirador.viewer.workspace.windows;
    var task = Kefir.sequentially(0, lodash_1.range(windows.length)).flatMap(function (index) {
        var window = windows[index];
        return scrollToRegion(window, function (view) { return region(index, view); });
    }).last().map(function (value) { }).toProperty();
    task.onEnd(function () { });
    return task;
}
exports.scrollToRegions = scrollToRegions;
function scrollToRegion(window, regionOfView) {
    return Kefir.stream(function (emitter) {
        if (window) {
            var imageView = window.focusModules.ImageView;
            if (imageView) {
                var region = regionOfView(imageView);
                if (region) {
                    var viewportRect = imageView.osd.viewport.imageToViewportRectangle(region.x, region.y, region.width, region.height);
                    imageView.osd.viewport.fitBounds(viewportRect, true);
                    imageView.osd.forceRedraw();
                }
                emitter.emit(true);
                emitter.end();
            }
        }
        emitter.emit(false);
        emitter.end();
    }).toProperty();
}
function renderMirador(options) {
    var instance = Mirador(assign({
        'buildPath': '',
        'i18nPath': '/mirador/locales/',
        'imagesPath': '/mirador/images/',
    }, options.miradorConfig));
    options.targetElement.style.position = 'static';
    applyRedrawHack(instance, options.onInitialized);
    return instance;
}
exports.renderMirador = renderMirador;
function removeMirador(mirador, element) {
    if (mirador) {
        clearAllSubscriptions(mirador.eventEmitter);
    }
    if (element) {
        element.innerHTML = '';
    }
    if (hackTimer) {
        window.clearInterval(hackTimer);
        hackTimer = null;
    }
}
exports.removeMirador = removeMirador;
