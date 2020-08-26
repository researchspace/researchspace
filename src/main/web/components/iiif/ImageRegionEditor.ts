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

import * as React from 'react';
import * as D from 'react-dom-factories';
import * as PropTypes from 'prop-types';
import {
  isEqual, map, throttle, uniqBy, toPairs,
  isEmpty, some, findKey, includes, find, last
} from 'lodash';
import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';

import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { addNotification, ErrorNotification } from 'platform/components/ui/notification';
import { Component } from 'platform/api/components';
import { ResourceLinkComponent } from 'platform/api/navigation/components';

import * as ImageApi from '../../data/iiif/ImageAPI';
import { queryIIIFImageOrRegion, ImageOrRegionInfo, parseImageSubarea } from '../../data/iiif/ImageAnnotationService';
import { Manifest, createManifest } from '../../data/iiif/ManifestBuilder';
import { LdpAnnotationEndpoint, AnnotationEndpoint, ImagesInfoByIri } from '../../data/iiif/AnnotationEndpoint';
import { UpdatedEvent, ZoomToRegionEvent, IiifManifestObject, AddObjectImagesEvent } from './ImageRegionEditorEvents';

import { chooseMiradorLayout } from './SideBySideComparison';

import { renderMirador, removeMirador, scrollToRegions, scrollToRegion } from './mirador/Mirador';
import { computeDisplayedRegionWithMargin } from './ImageThumbnail';

export interface ImageRegionEditorConfig {
  id?: string;
  imageOrRegion: string | { [iri: string]: Array<string> } | IiifManifestObject[];
  imageIdPattern: string;
  iiifServerUrl: string;
  repositories?: Array<string>;

  /**
   * Use details sidebar instead of built-in mirador details view
   */
  useDetailsSidebar?: boolean;

  /**
   * These are special handlebars template passed to mirador, they don't work in the same
   * way as platform templates and can't be used with <template> tag
   */
  annotationViewTooltipTemplate?: string;
}

export interface ImageRegionEditorProps extends ImageRegionEditorConfig {
  annotationEndpoint?: AnnotationEndpoint;
  onMiradorInitialized?: (miradorInstance: Mirador.Instance) => void;
}

interface ImageRegionEditorState {
  loading?: boolean;
  info?: Map<string, ImageOrRegionInfo>;
  iiifImageId?: Map<string, string>;
  errorMessage?: string;

  allImages: IiifManifestObject[];
}

/**
 * @example
 * <div style='height: 700px'>
 *   <rs-iiif-mirador image-or-region='http://example.com/AN00230/AN00230725_001_l.jpg'
 *     image-id-pattern='BIND(REPLACE(str(?imageIRI),
 *       "^.+/[A-Z0]*([1-9][0-9]*)_.*$", "$1") AS ?imageID)'
 *     iiif-server-url='http://example.com/IIIF'>
 *   </rs-iiif-mirador>
 * </div>
 */
export class ImageRegionEditorComponentMirador extends Component<ImageRegionEditorProps, ImageRegionEditorState> {
  static defaultProps: Partial<ImageRegionEditorProps> = {
    id: 'mirador',
  };

  private readonly cancellation = new Cancellation();
  private infoQueryingCancellation = this.cancellation.derive();
  private manifestQueryingCancellation = this.cancellation.derive();

  static readonly propTypes: { [K in keyof ImageRegionEditorProps]?: any } = {
    imageOrRegion: PropTypes.any.isRequired,
    imageIdPattern: PropTypes.string.isRequired,
    iiifServerUrl: PropTypes.string.isRequired,
  };

  private miradorElement: HTMLElement;
  private miradorInstance: Mirador.Instance;

  constructor(props: ImageRegionEditorProps, context: any) {
    super(props, context);
    this.state = {
      loading: true,
      allImages: this.normalizeImageProps(props),
    };
  }

  private normalizeImageProps({ imageOrRegion }: ImageRegionEditorProps) {
    if (typeof imageOrRegion === 'string') {
      return [
        { objectIri: imageOrRegion, images: [imageOrRegion] },
      ];
    } else if (Array.isArray(imageOrRegion)) {
      return imageOrRegion;
    } else {
      return toPairs(imageOrRegion).map(([objectIri, images]) => ({ images, objectIri }));
    }
  }

  componentDidMount() {
    this.queryAllImagesInfo();
  }

  private unsubscribeFromMiradorEvents(mirador: Mirador.Instance) {
    if (mirador) {
      mirador.eventEmitter.unsubscribe('slotRemoved');
    }
  }

  private subscribeOnMiradorEvents(mirador: Mirador.Instance) {
    // mirador.eventEmitter.subscribe('windowUpdated', this.windowUpdateHandler);
    // mirador.eventEmitter.subscribe('windowAdded', this.windowUpdateHandler);
    // mirador.eventEmitter.subscribe('slotRemoved', this.windowUpdateHandler);
    // mirador.eventEmitter.subscribe('ANNOTATIONS_LIST_UPDATED', this.windowUpdateHandler);
  }

  /**
   * throttle event trigger because windowUpdated event in mirador is called too often
   */
  private triggerManifestUpdateEvent(objects: IiifManifestObject[]) {
    trigger({
      eventType: UpdatedEvent,
      source: this.props.id,
      data: { objects }
    });
  }

  public shouldComponentUpdate(nextProps: ImageRegionEditorProps, nextState: ImageRegionEditorState) {
    return nextState.loading !== this.state.loading || !isEqual(nextProps, this.props);
  }

  private queryAllImagesInfo() {
    this.queryImagesInfo(this.state.allImages).observe({
      value: ({ info, iiifImageId }) => {
        this.setState({ loading: false, iiifImageId, info });
      },
      error: (error) => this.setState({ loading: false, errorMessage: error }),
    });
  }

  private queryImagesInfo(allImages: IiifManifestObject[]) {
    const { imageIdPattern } = this.props;

    const querying = allImages.map(({ images }) => {
      if (!images.length) {
        return Kefir.constant([]);
      }
      const infoQuerying = images
        .map(Rdf.iri)
        .map((imageOrRegionIri) =>
          queryIIIFImageOrRegion(imageOrRegionIri, imageIdPattern, this.getRepositories()).flatMapErrors<
            ImageOrRegionInfo
          >(() => Kefir.constant(undefined))
        );
      return Kefir.combine(infoQuerying);
    });

    this.infoQueryingCancellation = this.cancellation.deriveAndCancel(this.infoQueryingCancellation);
    return this.infoQueryingCancellation.map(Kefir.combine(querying)).map(
      (result) => {
        const info = new Map<string, ImageOrRegionInfo>();
        const iiifImageId = new Map<string, string>();
        result.forEach((imagesInfo) =>
          imagesInfo.forEach((imageInfo) => {
            if (!imageInfo) {
              return;
            }
            info.set(imageInfo.iri.value, imageInfo);
            iiifImageId.set(imageInfo.iri.value, imageInfo.imageId);
          })
        );
        return { info, iiifImageId };
      }
    );
  }


  private renderMirador(element: HTMLElement) {
    if (!this.state || !this.state.info || !element) {
      return;
    }

    removeMirador(this.miradorInstance, element);

    const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);

    const manifestQuerying = this.state.allImages.map(({ objectIri, images }) =>
      this.queryManifestParameters({
        infos: this.state.info,
        iiifImageIds: this.state.iiifImageId,
        iri: objectIri, images, iiifServerUrl
      }).flatMap((allParams) => {
        const params = allParams.filter((param) => param !== undefined);
        if (params.length === 0) {
          addNotification({
            level: 'error',
            children: React.createElement(
              'p',
              {},
              'Images of the entity ',
              React.createElement(ResourceLinkComponent, { iri: objectIri }),
              ' not found'
            ),
          });
          return Kefir.constant(undefined);
        }
        if (params.length < allParams.length) {
          addNotification({
            level: 'warning',
            children: React.createElement(
              'p',
              {},
              'Some images of the entity ',
              React.createElement(ResourceLinkComponent, { iri: objectIri }),
              ' not found'
            ),
          });
        }
        return createManifest(params);
      })
    );

    this.manifestQueryingCancellation = this.cancellation.deriveAndCancel(this.manifestQueryingCancellation);
    this.manifestQueryingCancellation.map(Kefir.zip(manifestQuerying)).onValue((allManifests) => {
      const manifests = allManifests.filter((manifest) => manifest !== undefined);
      const miradorConfig = this.miradorConfigFromManifest(manifests);
      this.miradorInstance = renderMirador({
        targetElement: element,
        miradorConfig,
        onInitialized: this.onMiradorInitialized,
      });
    });
  }

  private onMiradorInitialized = (mirador: Mirador.Instance) => {
    scrollToRegions(mirador, ({ canvasId }) => {
      for (const [iri, image] of Array.from(this.state.info)) {
        if (canvasId === image.imageIRI.value) {
          return image.viewport;
        }
      }
      return undefined;
    });
    this.unsubscribeFromMiradorEvents(mirador);
    this.subscribeOnMiradorEvents(mirador);
    this.listenToEvents();
    this.triggerManifestUpdateEvent(this.state.allImages);
    if (this.props.onMiradorInitialized) {
      this.props.onMiradorInitialized(mirador);
    }
  }

  private listenToEvents = () => {
    this.cancellation
      .map(
        listen({
          eventType: AddObjectImagesEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const { allImages } = this.state;
          if (!some(allImages, im => im.objectIri === event.data.objectIri)) {
            // if we don't have object images loaded, then we need to fetch the manifest
            const newImage = { objectIri: event.data.objectIri, images: event.data.imageIris };
            allImages.unshift(newImage);
            this.setState({ allImages: this.state.allImages })

            const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
            this.queryImagesInfo([newImage])
              .flatMap(
                ({ info, iiifImageId }) => {
                  return this.queryManifestParameters({
                    infos: info, iiifImageIds: iiifImageId,
                    iri: event.data.objectIri, images: event.data.imageIris, iiifServerUrl
                  })
                }
              )
              .flatMap(createManifest)
              .onValue((manifestJson) => {
                const manifest = new Mirador.Manifest(manifestJson['@id'], 'British Museum', manifestJson);
                this.miradorInstance.eventEmitter.publish('manifestReceived', manifest, 'Test');
                this.triggerManifestUpdateEvent(allImages);

                // add new window with new manifest, see handling of the ZoomToRegionEvent for the explanation of the logic behind this code
                const onSlotAdded = (e, { slots }: { slots: Mirador.Slot[] }) => {
                  this.miradorInstance.eventEmitter.publish(
                    'ADD_WINDOW', {
                      manifest,
                      slotAddress: last(slots).layoutAddress
                    }
                  );
                };
                this.miradorInstance.eventEmitter.one('slotsUpdated', onSlotAdded)
                this.miradorInstance.eventEmitter.publish(
                  'SPLIT_RIGHT_FROM_WINDOW',
                  this.miradorInstance.viewer.workspace.windows[0].id
                );
              });
          } else {
            // if object images are already loaded then just add new slot with the object
            const onSlotAdded = (e, { slots }: { slots: Mirador.Slot[] }) => {
              const objectImages = allImages.find(os => os.objectIri === event.data.objectIri);
              const manifest =
                this.miradorInstance.viewer.manifestsPanel.manifestListItems.find(
                  ({ manifest }) =>
                    manifest.jsonLd.sequences[0].canvases.some(
                      c => objectImages.images.includes(c['@id'])
                    )
                ).manifest;
              this.miradorInstance.eventEmitter.publish(
                'ADD_WINDOW', {
                  manifest,
                  slotAddress: last(slots).layoutAddress
                }
              );
            };
            this.miradorInstance.eventEmitter.one('slotsUpdated', onSlotAdded)
            this.miradorInstance.eventEmitter.publish(
              'SPLIT_RIGHT_FROM_WINDOW',
              this.miradorInstance.viewer.workspace.windows[0].id
            );
          }
        }
      });


    this.cancellation
      .map(
        listen({
          eventType: ZoomToRegionEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const windows = this.miradorInstance.viewer.workspace.windows;
          const windowForImage = windows.find(w => w.canvasID === event.data.imageIri);

          if (windowForImage) {
            this.scrollToImageRegion(event.data.imageIri, event.data.regionIri)
          } else {
            // Mirador handles events asynchronously, so here:
            //  1. we trigger "SPLIT_RIGHT_FROM_WINDOW" event to add new mirador window
            //  2. then when it is ready Mirador triggers "slotsUpdated" event
            //  3. and we load needed image into the new window
            //  4. when image with annotations is loaded Mirador triggers "ANNOTATIONS_LIST_UPDATED" event
            //  5. and then we scroll to the region

            const onSlotAdded = (e, { slots }: { slots: Mirador.Slot[] }) => {
              const onAnnotationsReady = () => {
                this.scrollToImageRegion(event.data.imageIri, event.data.regionIri)
              };
              this.miradorInstance.eventEmitter.one('ANNOTATIONS_LIST_UPDATED', onAnnotationsReady);

              const manifest =
                this.miradorInstance.viewer.manifestsPanel.manifestListItems.find(
                  ({ manifest }) => some(manifest.jsonLd.sequences[0].canvases, c => c['@id'] === event.data.imageIri)
                ).manifest;
              this.miradorInstance.eventEmitter.publish(
                'ADD_WINDOW', {
                manifest,
                canvasID: event.data.imageIri,
                slotAddress: last(slots).layoutAddress
              }
              );
            };

            this.miradorInstance.eventEmitter.one('slotsUpdated', onSlotAdded)
            this.miradorInstance.eventEmitter.publish('SPLIT_RIGHT_FROM_WINDOW', windows[0].id)
          }
        }
      })
  }

  private queryManifestParameters({
    iri,
    images,
    iiifServerUrl,
    infos,
    iiifImageIds
  }: {
    iri: string;
    images: Array<string>;
    iiifServerUrl: string;
    infos?: ReadonlyMap<string, ImageOrRegionInfo>;
    iiifImageIds?: ReadonlyMap<string, string>;
  }) {
    if (!images.length) {
      return Kefir.constant([]);
    }
    const queryingImagesInfo = images.map((imageIri) => {
      const imageInfo = infos.get(imageIri);
      const iiifImageId = iiifImageIds.get(imageIri);
      if (!imageInfo || !iiifImageId) {
        return Kefir.constant(undefined);
      }
      const imageServiceUri = ImageApi.constructServiceRequestUri(iiifServerUrl, iiifImageId);
      return ImageApi.queryImageBounds(iiifServerUrl, iiifImageId)
        .flatMap((canvasSize) =>
          Kefir.constant({
            baseIri: imageInfo.isRegion ? imageInfo.imageIRI : Rdf.iri(iri),
            imageIri: imageInfo.imageIRI,
            imageServiceUri,
            canvasSize,
          })
        )
        .flatMapErrors(() => Kefir.constant(undefined));
    });
    return Kefir.zip(queryingImagesInfo).toProperty();
  }

  private getRepositories = () =>
    Maybe.fromNullable(this.props.repositories)
      .orElse(() => Maybe.fromNullable(this.context.semanticContext).chain((c) => Maybe.fromNullable([c.repository])))
      .getOrElse(['default']);

  private miradorConfigFromManifest(manifests: Array<Manifest>): Mirador.Options {
    const {
      id, annotationEndpoint, useDetailsSidebar,
      annotationViewTooltipTemplate,
    } = this.props;
    const imagesInfo = this.state.info as ImagesInfoByIri;
    return {
      id: id, // The CSS ID selector for the containing element.
      useDetailsSidebar, annotationViewTooltipTemplate,
      windowSettings: {
        sidePanel: !useDetailsSidebar
      },
      layout: chooseMiradorLayout(manifests.length),
      saveSession: false,
      data: manifests.map((manifest) => ({
        manifestUri: manifest['@id'],
        location: 'British Museum',
        manifestContent: manifest,
      })),
      annotationEndpoint: {
        name: 'ResearchSpace annotation endpoint',
        module: 'AdapterAnnotationEndpoint',
        options: {
          endpoint: annotationEndpoint || new LdpAnnotationEndpoint({ imagesInfo }),
        },
      },
      availableAnnotationDrawingTools: ['Rectangle', 'Ellipse', 'Freehand', 'Polygon', 'Pin'],
      windowObjects: manifests.map<Mirador.WindowObject>((manifest) => ({
        loadedManifest: manifest['@id'],
        viewType: 'ImageView',
        sidePanel: false,
        canvasControls: {
          annotations: {
            annotationState: 'on',
            annotationRefresh: true,
          },
        },
      })),
      annotationBodyEditor: {
        module: 'researchspaceAnnotationBodyEditor',
        options: {},
      },
      jsonStorageEndpoint: {
        name: 'Dummy JSON Storage',
        module: 'DummyJSONStorage',
        options: {},
      },
    };
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
    this.unsubscribeFromMiradorEvents(this.miradorInstance);
    removeMirador(this.miradorInstance, this.miradorElement);
  }

  render() {
    const { errorMessage } = this.state;
    return D.div(
      {
        className: 'mirador',
        style: { position: 'relative', width: '100%', height: '100%' }
      },
      errorMessage
        ? React.createElement(ErrorNotification, { errorMessage })
        : D.div({
          ref: (element) => {
            this.miradorElement = element;
            this.renderMirador(element);
          },
          id: this.props.id,
          style: { width: '100%', height: '100%', position: 'relative' },
        })
    );
  }

  private scrollToImageRegion = (imageIri: string, regionIri: string) => {
    const windows = this.miradorInstance.viewer.workspace.windows;
    const windowForImage = windows.find(w => w.canvasID === imageIri);
    scrollToRegion(windowForImage, view => {
      const annotations = windowForImage.annotationsList;
      const annotation = find(annotations, a => a['@id'] === regionIri);
      const viewport = windowForImage.canvases[imageIri].bounds;
      const boundingBox =
        parseImageSubarea(annotation.on[0].selector.default.value).get();

      return computeDisplayedRegionWithMargin(
        boundingBox, viewport, 0.05
      );
    }).onEnd(() => {
      // make observable active (hot)
    });
  }
}

export type c = ImageRegionEditorComponentMirador;
export const c = ImageRegionEditorComponentMirador;
export const f = React.createFactory(c);
export default c;
