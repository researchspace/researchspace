/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as Kefir from 'kefir';
import { range } from 'lodash';
import * as assign from 'object-assign';
import * as _ from 'lodash';

import rso from '../../../data/vocabularies/rso';

import { AdapterAnnotationEndpoint } from './MiradorAnnotationEndpoint';
import { MetaphactoryAnnotationBodyEditor } from './AnnotationBodyEditor';

import 'cache-loader!script-loader!../../../lib/mirador/mirador.js';
import '../../../lib/mirador/css/mirador.scss';

import '../../../scss/iiif-region-editor-mirador.scss';

interface EmitterMixin extends Mirador.EventEmitter {
  bus?: JQuery;
  eventStackDepth?: number;
}

function ensureBusExists(emitter: EmitterMixin) {
  if (typeof emitter.bus === 'undefined') {
    emitter.bus = $({});
  }
}

/**
 * override event bus operations to be able to 'clearAllSubscriptions':
 * this allows us to remove and show Mirador again without complete page reload
 */
Mirador.EventEmitter.prototype.subscribe = function (this: EmitterMixin, name, handler) {
  ensureBusExists(this);
  this.bus.on.apply(this.bus, arguments);
  return {name, handler};
};
Mirador.EventEmitter.prototype.unsubscribe = function (this: EmitterMixin) {
  ensureBusExists(this);
  this.bus.off.apply(this.bus, arguments);
};
Mirador.EventEmitter.prototype.publish = function (this: EmitterMixin, name) {
  ensureBusExists(this);
  if (typeof this.eventStackDepth === 'undefined') {
    this.eventStackDepth = 0;
  }

  if (this.debug && name.indexOf('updateTooltips') !== 0) {
    const args = Array.prototype.slice.call(arguments);
    if (args.length > 0) {
      args[0] = Array(this.eventStackDepth + 1).join('> ') + args[0];
    }
    console.log(args);
    // console.trace();
  }
  this.eventStackDepth++;
  const result = this.bus.trigger.apply(this.bus, arguments);
  this.eventStackDepth--;
  return result;
};

function clearAllSubscriptions(emitter: Mirador.EventEmitter) {
  const mixin = emitter as EmitterMixin;
  if (mixin.bus) {
    mixin.bus.remove();
    delete mixin.bus;
  }
}

Mirador.EventEmitter.debug = false;

Mirador['AdapterAnnotationEndpoint'] = AdapterAnnotationEndpoint;
Mirador['MetaphactoryAnnotationBodyEditor'] = MetaphactoryAnnotationBodyEditor;
Mirador['DummyJSONStorage'] = class {
  readSync(blobId: string) { return {}; }
  save(blob: any) {
    const deferred = $.Deferred();
    deferred.reject();
    return deferred.promise();
  }
};

/**
 * overriding template for annotation viewer to append additional 'open'
*  button with 'Open as semantic link in platform' action
 */
const globalHandlebars = window['Handlebars'];
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

/**
 * override OpenSeadragon default settings
 */
const MiradorOpenSeadragon = Mirador.OpenSeadragon;
Mirador.OpenSeadragon = function(options) {
  options.maxZoomPixelRatio = Infinity;
  return MiradorOpenSeadragon(options);
};

const buildAnnotation = Mirador.MiradorDualStrategy.prototype.buildAnnotation;
Mirador.MiradorDualStrategy.prototype.buildAnnotation = function (options) {
  const annotation = buildAnnotation.apply(this, arguments);

  const viewer: OpenSeadragon.Viewer = options.overlay.viewer;
  const viewportBounds = viewer.viewport.getBounds(true);
  const scope = viewer.viewport.viewportToImageRectangle(viewportBounds);
  annotation[rso.viewport.value] = rectangleToFragmentString(scope);

  return annotation;
};

function rectangleToFragmentString({x, y, width, height}: OpenSeadragon.Rect) {
  return `xywh=${Math.round(x)},${Math.round(y)},${Math.round(width)},${Math.round(height)}`;
}

const overlayInit = Mirador.Overlay.prototype.init;
Mirador.Overlay.prototype.init = function (this: Mirador.Overlay) {
  this.hitOptions.tolerance = 50;
  overlayInit.apply(this, arguments);
};

let hackTimer: number;
function applyRedrawHack(
  mirador: Mirador.Instance,
  onInitialized: (mirador: Mirador.Instance) => void
) {
  if (hackTimer) {
    console.error('Mirador redraw timer already set');
  }
  hackTimer = window.setInterval(() => {
    if (!_.isEmpty($('.mirador-viewer:visible'))) {
      mirador.viewer.workspace.calculateLayout();
      onInitialized(mirador);
      window.clearInterval(hackTimer);
      hackTimer = null;
    }
  }, 500);
}

interface ViewportRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function scrollToRegions(
  mirador: Mirador.Instance,
  region: (
    params: { index: number; canvasId: string; view: Mirador.ImageViewModule }
  ) => ViewportRegion | undefined
): Kefir.Property<void> {
  const windows = mirador.viewer.workspace.windows;
  const task = Kefir.sequentially(0, range(windows.length)).flatMap(index => {
    const window = windows[index];
    return scrollToRegion(window, view => region({index, canvasId: window.canvasID, view}));
  }).last().map(value => { /* void */}).toProperty();
  // make observable active (hot)
  task.onEnd(() => { /* nothing */ });
  return task;
}

function scrollToRegion(
  window: Mirador.Window,
  regionOfView: (view: Mirador.ImageViewModule) => ViewportRegion
): Kefir.Property<boolean> {
  return Kefir.stream<boolean>(emitter => {
    if (window) {
      const imageView = window.focusModules.ImageView;
      if (imageView) {
        const region = regionOfView(imageView);
        if (region) {
          const viewportRect = imageView.osd.viewport.imageToViewportRectangle(
            region.x, region.y, region.width, region.height);
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

export function renderMirador(options: {
  targetElement: HTMLElement,
  miradorConfig: Mirador.Options,
  onInitialized: (mirador: Mirador.Instance) => void,
}): Mirador.Instance {
  const instance = Mirador(assign({
    'buildPath': '',
    'i18nPath': '/mirador/locales/',
    'imagesPath': '/mirador/images/',
  }, options.miradorConfig));
  options.targetElement.style.position = 'static';
  applyRedrawHack(instance, options.onInitialized);
  return instance;
}

export function removeMirador(mirador: Mirador.Instance, element: HTMLElement) {
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
