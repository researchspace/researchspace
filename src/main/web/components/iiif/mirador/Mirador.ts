/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as Kefir from 'kefir';
import { range } from 'lodash';
import * as assign from 'object-assign';
import * as _ from 'lodash';

import rso from '../../../data/vocabularies/rso';

import { trigger, BuiltInEvents } from 'platform/api/events';
import { AdapterAnnotationEndpoint } from './MiradorAnnotationEndpoint';
import { researchspaceAnnotationBodyEditor } from './AnnotationBodyEditor';

import 'cache-loader!script-loader!../../../lib/mirador/mirador.js';
import '../../../lib/mirador/css/mirador.scss';

interface EmitterMixin extends Mirador.EventEmitter {
  bus?: JQuery;
  eventStackDepth?: number;
}

function ensureBusExists(emitter: EmitterMixin) {
  if (typeof emitter.bus === 'undefined') {
    emitter.bus = $({});
  }
}

Mirador.DEFAULT_SETTINGS.showAddFromURLBox = false;
Mirador.DEFAULT_SETTINGS.windowSettings.canvasControls.annotations.annotationState = 'on';
Mirador.DEFAULT_SETTINGS.windowSettings.canvasControls.annotations.annotationRefresh = true;

/**
 * override event bus operations to be able to 'clearAllSubscriptions':
 * this allows us to remove and show Mirador again without complete page reload
 */
Mirador.EventEmitter.prototype.subscribe = function (this: EmitterMixin, name, handler) {
  ensureBusExists(this);
  this.bus.on.apply(this.bus, arguments);
  return { name, handler };
};

/**
 * There is no such function in original mirador event bus, but we add it here so we can
 * easily have event listeners that are fired only once and then automatically unsubscribed
 */
Mirador.EventEmitter.prototype.one = function (this: EmitterMixin, name, handler) {
  ensureBusExists(this);
  this.bus.one.apply(this.bus, arguments);
  return { name, handler };
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
Mirador['researchspaceAnnotationBodyEditor'] = researchspaceAnnotationBodyEditor;
Mirador['DummyJSONStorage'] = class {
  readSync(blobId: string) {
    return {};
  }
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
const globalHandlebars = Mirador.Handlebars;

// add raw handlebars helper to the helpers available in the mirador
// see https://handlebarsjs.com/guide/block-helpers.html#raw-blocks
globalHandlebars.registerHelper(
  'raw',
  function (options) {
    return options.fn(this);
  }
);
const defaultAnnotationViewerTemplate = globalHandlebars.compile(
  `
  <div class="all-annotations" id="annotation-viewer-{{windowId}}">
    <div class="text-viewer">Image Region(s)</div>
      {{#each annotations}}
        <div class="annotation-display annotation-tooltip" data-anno-id="{{id}}">
          <div class="button-container">
            {{#if id}}
              <mp-template-item style="max-width: calc(100% - 80px);">
                <div>
                  <semantic-link iri="{{id}}" style="display: block; width: 100%;">{{{annoText}}}</semantic-link>
                </div>
              </mp-template-item>
            {{/if}}
            <div>
              {{#if showUpdate}}
                <a href="#edit" class="edit">
                  <i class="fa fa-pencil"></i>
                </a>
              {{/if}}
              {{#if showDelete}}
                <a href="#delete" class="delete">
                  <i class="fa fa-trash-o"></i>
                </a>
              {{/if}}
            </div>
          </div>
        </div>
      {{/each}}
    </div>
  </div>
  `
 );
Mirador.AnnotationTooltip.prototype.viewerTemplate = defaultAnnotationViewerTemplate;
Mirador.AnnotationTooltip.prototype.editorTemplate = globalHandlebars.compile(
  `
  <form id="annotation-editor-{{windowId}}" class="annotation-editor annotation-tooltip" {{#if id}}data-anno-id="{{id}}"{{/if}}>
    <div>
      <div class="button-container">
        <a href="#cancel" class="cancel"><button class="btn btn-default">{{t "cancel"}}</button></a>
        <a href="#save" class="save"><button class="btn btn-action">{{t "save"}}</button></a>
      </div>
    </div>
  </form>
  `
);

/**
 * override OpenSeadragon default settings
 */
const MiradorOpenSeadragon = Mirador.OpenSeadragon;
Mirador.OpenSeadragon = function (options) {
  options.maxZoomPixelRatio = Infinity;
  return MiradorOpenSeadragon(options);
};

const miradorToggleMetadataOverlay = Mirador.Window.prototype.toggleMetadataOverlay;
Mirador.Window.prototype.toggleMetadataOverlay = function(focusState) {
  if(Mirador.DEFAULT_SETTINGS.windowSettings.useDetailsSidebar) {
    trigger({
      eventType: BuiltInEvents.ComponentTemplateUpdate,
      source: this.id,
      data: {iri: this.canvasID},
      targets: ['details-view', 'open-details-sidebar']
    });
  } else {
    miradorToggleMetadataOverlay.apply(this, arguments);
  }
}

const buildAnnotation = Mirador.MiradorDualStrategy.prototype.buildAnnotation;
Mirador.MiradorDualStrategy.prototype.buildAnnotation = function (options) {
  const annotation = buildAnnotation.apply(this, arguments);

  const viewer: OpenSeadragon.Viewer = options.overlay.viewer;
  const viewportBounds = viewer.viewport.getBounds(true);
  const scope = viewer.viewport.viewportToImageRectangle(viewportBounds);
  annotation[rso.viewport.value] = rectangleToFragmentString(scope);

  return annotation;
};

function rectangleToFragmentString({ x, y, width, height }: OpenSeadragon.Rect) {
  return `xywh=${Math.round(x)},${Math.round(y)},${Math.round(width)},${Math.round(height)}`;
}

const overlayInit = Mirador.Overlay.prototype.init;
Mirador.Overlay.prototype.init = function (this: Mirador.Overlay) {
  this.hitOptions.tolerance = 10;
  overlayInit.apply(this, arguments);
};

function applyRedrawHack(mirador: Mirador.Instance, onInitialized: (mirador: Mirador.Instance) => void) {
  if (mirador.hackTimer) {
    console.error('Mirador redraw timer already set');
  }
  mirador.hackTimer = window.setInterval(() => {
    if (!_.isEmpty($(`#${mirador.viewer.id} .mirador-viewer:visible`))) {
      window.clearInterval(mirador.hackTimer);
      mirador.hackTimer = null;
      mirador.viewer.workspace.calculateLayout();
      onInitialized(mirador);
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
  region: (params: { index: number; canvasId: string; view: Mirador.ImageViewModule }) => ViewportRegion | undefined
): Kefir.Property<void> {
  const windows = mirador.viewer.workspace.windows;
  const task = Kefir.sequentially(0, range(windows.length))
    .flatMap((index) => {
      const window = windows[index];
      return scrollToRegion(window, (view) => region({ index, canvasId: window.canvasID, view }));
    })
    .last()
    .map((value) => {
      /* void */
    })
    .toProperty();
  // make observable active (hot)
  task.onEnd(() => {
    /* nothing */
  });
  return task;
}

export function scrollToRegion(
  window: Mirador.Window,
  regionOfView: (view: Mirador.ImageViewModule) => ViewportRegion
): Kefir.Property<boolean> {
  return Kefir.stream<boolean>((emitter) => {
    if (window) {
      const imageView = window.focusModules.ImageView;
      if (imageView) {
        const region = regionOfView(imageView);
        if (region) {
          const viewportRect = imageView.osd.viewport.imageToViewportRectangle(
            region.x,
            region.y,
            region.width,
            region.height
          );
          imageView.osd.viewport.fitBounds(viewportRect);
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
  targetElement: HTMLElement;
  miradorConfig: Mirador.Options;
  onInitialized: (mirador: Mirador.Instance) => void;
}): Mirador.Instance {
  Mirador.DEFAULT_SETTINGS.windowSettings.useDetailsSidebar =
    options.miradorConfig.useDetailsSidebar;

  if (options.miradorConfig.annotationViewTooltipTemplate) {
    Mirador.AnnotationTooltip.prototype.viewerTemplate =
      globalHandlebars.compile(options.miradorConfig.annotationViewTooltipTemplate);
  }
  const instance = Mirador(
    assign(
      {
        buildPath: '',
        i18nPath: '/mirador/locales/',
        imagesPath: '/mirador/images/',
      },
      options.miradorConfig
    )
  );
  options.targetElement.style.position = 'static';
  applyRedrawHack(instance, options.onInitialized);
  return instance;
}

export function removeMirador(mirador: Mirador.Instance, element: HTMLElement) {
  if (mirador) {
    if (mirador.hackTimer) {
      window.clearInterval(mirador.hackTimer);
      mirador.hackTimer = null;
    }

    clearAllSubscriptions(mirador.eventEmitter);

    for(const w of mirador.viewer.workspace.windows) {
      w.destroy();
    }
  }

  if (element) {
    element.innerHTML = '';
  }

  // reset annotation template
  Mirador.AnnotationTooltip.prototype.viewerTemplate = defaultAnnotationViewerTemplate;
}
