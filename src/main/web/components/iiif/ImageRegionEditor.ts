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
  isEqual, toPairs, some, find, last, size,
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
import { ManifestUpdatedEvent, ZoomToRegionEvent, IiifManifestObject, AddObjectImagesEvent, RegionCreatedEvent, RegionUpdatedEvent, RegionRemovedEvent, HighlightRegion, RemoveRegion } from './ImageRegionEditorEvents';

import { renderMirador, removeMirador, scrollToRegions, scrollToRegion } from './mirador/Mirador';
import { computeDisplayedRegionWithMargin } from './ImageThumbnail';
import { OARegionAnnotation, getAnnotationTextResource } from 'platform/data/iiif/LDPImageRegionService';

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
  private annotationEndpoint: AnnotationEndpoint;
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

  private triggerManifestUpdatedEvent = (objects: IiifManifestObject[]) => {
    trigger({
      eventType: ManifestUpdatedEvent,
      source: this.props.id,
      data: { objects }
    });
  }

  private triggerRegionUpdatedEvent =
    (eventType: typeof RegionCreatedEvent | typeof RegionUpdatedEvent | typeof RegionRemovedEvent) =>
    (regionIri: Rdf.Iri, oa: OARegionAnnotation) => {
      const imageIri = oa.on[0].full;
      const objectIri = this.state.allImages.find(i => i.images.includes(imageIri)).objectIri;
      const regionLabel = getAnnotationTextResource(oa).chars;
      trigger({
        eventType,
        source: this.props.id,
        data: {
          objectIri, imageIri, regionIri: regionIri.value, regionLabel
        }
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
          return image.boundingBox;
        }
      }
      return undefined;
    });
    this.listenToEvents();
    this.triggerManifestUpdatedEvent(this.state.allImages);

    /**
     * If we have one than one object or one than one image for the object then show
     * image selection view in the mirador
     */
    const { allImages } = this.state;
    if (
      allImages.length > 1 || (allImages.length == 1 && size(allImages[0].images) > 1)
    ) {
      mirador.eventEmitter.publish('TOGGLE_LOAD_WINDOW');
    }


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
                const manifest = new Mirador.Manifest(manifestJson['@id'], '', manifestJson);
                this.miradorInstance.eventEmitter.publish('manifestReceived', manifest, 'Test');
                this.triggerManifestUpdatedEvent(allImages);

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
          eventType: RemoveRegion,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const windows = this.miradorInstance.viewer.workspace.windows;
          const windowForImage = windows.find(w => w.canvasID === event.data.imageIri);

          if (windowForImage) {
            const annotation = windowForImage.annotationsList.find(a => a['@id'] === event.data.regionIri) as OARegionAnnotation;
            this.cancellation.map(
              this.annotationEndpoint.remove(annotation)
            ).observe({
              value: (event) => {
                this.miradorInstance.eventEmitter.publish('updateAnnotationList.'+windowForImage.id);
              }
            })
          } else {
            this.cancellation.map(
              this.annotationEndpoint
                .search(Rdf.iri(event.data.imageIri))
                .flatMap(
                  regions => {
                    const regionToRemove =
                      regions.find(region => region['@id'] === event.data.regionIri);
                    return this.annotationEndpoint.remove(regionToRemove);
                  }
                )
            ).observe({
              value: () => {/**/}
            })
          }
        }
      });

    this.cancellation
      .map(
        listen({
          eventType: HighlightRegion,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          this.miradorInstance.eventEmitter.publish('highlightAnnotation', event.data.regionIri)
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

    this.annotationEndpoint = new AnnotationEndpointProxy(
      annotationEndpoint || new LdpAnnotationEndpoint({ imagesInfo }),
      this.triggerRegionUpdatedEvent(RegionCreatedEvent),
      this.triggerRegionUpdatedEvent(RegionUpdatedEvent),
      this.triggerRegionUpdatedEvent(RegionRemovedEvent),
    );

    const windowObjects: Mirador.WindowObject[] =
      manifests.length > 1 ? [] : [{
        loadedManifest: manifests[0]['@id'] as string,
        viewType: 'ImageView',
        sidePanel: false,
        canvasControls: {
          annotations: {
            annotationState: 'on',
            annotationRefresh: true,
          },
        },
      }];

    return {
      id: id, // The CSS ID selector for the containing element.
      useDetailsSidebar, annotationViewTooltipTemplate,
      windowSettings: {
        sidePanel: !useDetailsSidebar
      },
      saveSession: false,
      data: manifests.map((manifest) => ({
        manifestUri: manifest['@id'],
        location: '',
        manifestContent: manifest,
      })),
      annotationEndpoint: {
        name: 'ResearchSpace annotation endpoint',
        module: 'AdapterAnnotationEndpoint',
        options: {
          endpoint: this.annotationEndpoint,
        },
      },
      availableAnnotationDrawingTools: ['Rectangle', 'Ellipse', 'Freehand', 'Polygon', 'Pin'],
      windowObjects,
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
          className: 'researchspace-mirador',
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

class AnnotationEndpointProxy implements AnnotationEndpoint {
  constructor(
    private endpoint: AnnotationEndpoint,
    private onCreated: (regionIri: Rdf.Iri, oa: OARegionAnnotation) => void,
    private onUpdated: (regionIri: Rdf.Iri, oa: OARegionAnnotation) => void,
    private onRemoved: (regionIri: Rdf.Iri, oa: OARegionAnnotation) => void,
  ) {}

  init = this.endpoint.init ? () =>  {
    this.endpoint.init();
  } : undefined;

  search(canvasIri: Rdf.Iri) {
    return this.endpoint.search(canvasIri);
  }

  create(annotation: OARegionAnnotation) {
    return this.endpoint.create(annotation)
      .onValue(regionIri => this.onCreated(regionIri, annotation));
  }

  update(annotation: OARegionAnnotation) {
    return this.endpoint.update(annotation)
      .onValue(regionIri => this.onUpdated(regionIri, annotation));
  }

  remove(annotation: OARegionAnnotation) {
    return this.endpoint.remove(annotation)
      .onValue(() => this.onRemoved(Rdf.iri(annotation['@id']), annotation));
  }

  userAuthorize = this.endpoint.userAuthorize ? (action: any, annotation: OARegionAnnotation) => {
    return this.endpoint.userAuthorize(action, annotation);
  } : undefined;
}

export type c = ImageRegionEditorComponentMirador;
export const c = ImageRegionEditorComponentMirador;
export const f = React.createFactory(c);
export default c;
