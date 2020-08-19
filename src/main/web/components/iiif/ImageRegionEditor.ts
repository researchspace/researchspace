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
  isEqual, values, toPairs, throttle, uniqBy,
  isEmpty, some, findKey, includes, find
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
import { UpdatedEvent, ZoomToRegionEvent, IiifViewerWindow, AddObjectImagesEvent } from './ImageRegionEditorEvents';

import { chooseMiradorLayout } from './SideBySideComparison';

import { renderMirador, removeMirador, scrollToRegions } from './mirador/Mirador';
import { computeDisplayedRegionWithMargin } from './ImageThumbnail';

export interface ImageRegionEditorConfig {
  id?: string;
  imageOrRegion: string | { [iri: string]: Array<string> };
  imageIdPattern: string;
  iiifServerUrl: string;
  repositories?: Array<string>;

  /**
   * Use details sidebar instead of built-in mirador details view
   */
  useDetailsSidebar?: boolean;
}

export interface ImageRegionEditorProps extends ImageRegionEditorConfig {
  annotationEndpoint?: AnnotationEndpoint;
  onMiradorInitialized?: (miradorInstance: Mirador.Instance) => void;
}

interface ImageRegionEditorState {
  readonly loading?: boolean;
  readonly info?: ReadonlyMap<string, ImageOrRegionInfo>;
  readonly iiifImageId?: ReadonlyMap<string, string>;
  readonly errorMessage?: string;

  additionalImages: {[iri: string]: string[]};
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
    this.state = { loading: true, additionalImages: {} };
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
    mirador.eventEmitter.subscribe('windowUpdated', this.windowUpdateHandler);
    mirador.eventEmitter.subscribe('windowAdded', this.windowUpdateHandler);
    mirador.eventEmitter.subscribe('slotRemoved', this.windowUpdateHandler);
    mirador.eventEmitter.subscribe('ANNOTATIONS_LIST_UPDATED', this.windowUpdateHandler);
  }

  private windowUpdateHandler = (event, data) => {
    if (event.type === 'windowUpdated' && !data.canvasID) {
      return
    }

    this.triggerViewUpdatedEvent(this.miradorInstance);
  };

  /**
   * throttle event trigger because windowUpdated event in mirador is called too often
   */
  private triggerViewUpdatedEvent = throttle(
    (mirador: Mirador.Instance) => {
      if (some(mirador.viewer.workspace.slots, s => !s?.window?.canvasID)) {
        return
      }

      const allImages = this.getImages();
      let images: IiifViewerWindow[] =
        mirador.viewer.workspace.slots.map(
          slot => {
            const imageIri = slot.window.canvasID; // that is image IRI
            // got object from which we queried the image
            const objectIri =
              findKey<Array<string>, {[iri: string]: Array<string>}>(
                allImages, is => includes(is, imageIri)
              );
            let regions = slot.window.annotationsList.map(a => ({regionIri: a['@id']}));
            regions = isEmpty(regions) ? null : regions;
            return {
              imageIri, objectIri, regions
            };
          }
        );
      // we can have multiple slots with the same image, so need to make sure that in the
      // event we don't have duplicates
      images = uniqBy(images, i => i.imageIri);

      // to make sure that we can check for no images in the handlebars template we propagate null instead of empty array
      images = isEmpty(images) ? null : images;

      trigger({
        eventType: UpdatedEvent,
        source: this.props.id,
        data: {images}
      })
    }, 200
  )

  public shouldComponentUpdate(nextProps: ImageRegionEditorProps, nextState: ImageRegionEditorState) {
    return nextState.loading !== this.state.loading || !isEqual(nextProps, this.props);
  }

  private queryAllImagesInfo() {
    const allImages = this.getImages();
    this.queryImagesInfo(allImages).observe({
      value: ({info, iiifImageId}) => {
        this.setState({ loading: false, iiifImageId, info });
      },
      error: (error) => this.setState({ loading: false, errorMessage: error }),
    });
  }

  private queryImagesInfo(allImages: {[objectIri: string]: string[]}) {
    const { imageIdPattern } = this.props;

    const querying = values(allImages).map((images) => {
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
        return {info, iiifImageId};
      }
    );
  }


  private renderMirador(element: HTMLElement) {
    if (!this.state || !this.state.info || !element) {
      return;
    }

    removeMirador(this.miradorInstance, element);

    const allImages = this.getImages();
    const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);

    const manifestQuerying = toPairs(allImages).map(([iri, images]) =>
      this.queryManifestParameters({
        infos: this.state.info,
        iiifImageIds: this.state.iiifImageId,
        iri, images, iiifServerUrl
      }).flatMap((allParams) => {
        const params = allParams.filter((param) => param !== undefined);
        if (params.length === 0) {
          addNotification({
            level: 'error',
            children: React.createElement(
              'p',
              {},
              'Images of the entity ',
              React.createElement(ResourceLinkComponent, { iri }),
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
              React.createElement(ResourceLinkComponent, { iri }),
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
    this.triggerViewUpdatedEvent(mirador);
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
          if (!this.getImages()[event.data.objectIri]) {
            const images = {[event.data.objectIri]: event.data.imageIris};
            this.setState({additionalImages: {...this.state.additionalImages, ...images}})

            const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
            this.queryImagesInfo(images)
              .flatMap(
                ({info, iiifImageId}) => {
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
                this.miradorInstance.eventEmitter.publish(
                  'ADD_MANIFEST_FROM_URL', [manifestJson['@id'], 'Test']
                );

                addNotification({
                  level: 'info',
                  children: React.createElement(
                    'p',
                    {},
                    'Images for object were successfully added to the image viewer.'
                  ),
                });
              });
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
          scrollToRegions(this.miradorInstance, ({ index, canvasId }) => {
            if (canvasId === event.data.imageIri)  {
              const activeWindow = this.miradorInstance.viewer.workspace.slots[index].window;
              const annotations = activeWindow.annotationsList;
              const annotation = find(annotations, a => a['@id'] === event.data.regionIri);
              const viewport = activeWindow.canvases[canvasId].bounds;
              const boundingBox =
                parseImageSubarea(annotation.on[0].selector.default.value).get();
              return computeDisplayedRegionWithMargin(
                boundingBox, viewport, 0.05
              );
            }
            return undefined;
          })
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

  private getImages() {
    const { imageOrRegion } = this.props;
    if (typeof imageOrRegion === 'string') {
      return { [imageOrRegion]: [imageOrRegion] };
    }
    return {...imageOrRegion, ...this.state.additionalImages};
  }

  private getRepositories = () =>
    Maybe.fromNullable(this.props.repositories)
      .orElse(() => Maybe.fromNullable(this.context.semanticContext).chain((c) => Maybe.fromNullable([c.repository])))
      .getOrElse(['default']);

  private miradorConfigFromManifest(manifests: Array<Manifest>): Mirador.Options {
    const { id, annotationEndpoint, useDetailsSidebar } = this.props;
    const imagesInfo = this.state.info as ImagesInfoByIri;
    return {
      id: id, // The CSS ID selector for the containing element.
      useDetailsSidebar: this.props.useDetailsSidebar,
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
}

export type c = ImageRegionEditorComponentMirador;
export const c = ImageRegionEditorComponentMirador;
export const f = React.createFactory(c);
export default c;
