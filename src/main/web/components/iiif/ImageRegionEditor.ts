/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
  forEach,
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
import { ManifestUpdatedEvent, ZoomToRegionEvent, IiifManifestResource, AddResourceImagesEvent, RegionCreatedEvent, RegionUpdatedEvent, RegionRemovedEvent, HighlightRegion, RemoveRegion, ShowRegionEvent, HideRegionEvent, ToggleRegionEvent, ToggleRegionsEvent, RegionVisibilityChangedEvent } from './ImageRegionEditorEvents';
import type { RegionTarget } from './ImageRegionEditorEvents';

import { renderMirador, removeMirador, scrollToRegions, scrollToRegion } from './mirador/Mirador';
import { computeDisplayedRegionWithMargin } from './ImageThumbnail';
import { OARegionAnnotation, getAnnotationTextResource } from 'platform/data/iiif/LDPImageRegionService';
import { LayoutChanged } from '../dashboard/DashboardEvents';

export interface ImageRegionEditorConfig {
  id?: string;
  imageOrRegion: string | { [iri: string]: Array<string> } | IiifManifestResource[];
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

  semanticAnnotationMode?: SemanticAnnotationMode[];

  /**
   * Additional data passed from the configuration that will be merged into the
   * OARegionAnnotation payload so it can be consumed in the service layer.
   */
  annotationDataContext?: any;
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

  allImages: IiifManifestResource[];
}

export interface SemanticAnnotationMode {
  id: string;
  label: string;
  iri: string;
  p2TypeIri?: string;
}

/**
 * @example
 * <div style='height: 700px'>
 *   <rs-iiif-mirador image-or-region='http://example.com/AN00230/AN00230725_001_l.jpg'
 *     image-id-pattern='BIND(REPLACE(str(?imageIRI),
 *       "^.+/[A-Z0]*([1-9][0-9]*)_.*$", "$1") AS ?imageID)'
 *     iiif-server-url='http://example.com/IIIF'
 *     semantic-annotation-mode='[{"id":"annotateImage","label":"Image Region","iri":"http://www.researchspace.org/ontology/EX_Digital_Image_Region"},{"id":"digitalSample","label":"Sampling Site","iri":"http://www.cidoc-crm.org/cidoc-crm/E26_Physical_Feature","p2TypeIri":"http://www.researchspace.org/resource/system/vocab/resource_type/sampling_site"},{"id":"visualItem","label":"Visual Item","iri":"http://www.cidoc-crm.org/cidoc-crm/E36_Visual_Item"}]'>
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
    semanticAnnotationMode: PropTypes.array,
    annotationDataContext: PropTypes.object,
  };

  private miradorElement: HTMLElement;
  private miradorInstance: Mirador.Instance;
  private semanticModeByCanvas = new Map<string, SemanticAnnotationMode>();
  private semanticModeHandlers = new Map<string, Function>();
  private canvasIdUpdatedHandlers = new Map<string, Function>();
  private slotsUpdatedSemanticHandler?: Function;
  private windowUpdatedSemanticHandler?: Function;

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
        { resourceIri: imageOrRegion, images: [imageOrRegion] },
      ];
    } else if (Array.isArray(imageOrRegion)) {
      return imageOrRegion;
    } else {
      return toPairs(imageOrRegion).map(([resourceIri, images]) => ({ images, resourceIri }));
    }
  }

  componentDidMount() {
    this.queryAllImagesInfo();
  }

  private getRegionsForResource(resourceIri: string, allImages: IiifManifestResource[] = this.state.allImages) {
    const resource = allImages.find(r => r.resourceIri === resourceIri);
    if (!resource) {
      return undefined;
    }

    const existingRegions = resource.regions || [];
    const regionsByIri = new Map(existingRegions.map(region => [region.regionIri, { ...region }]));

    if (!this.miradorInstance || !this.miradorInstance.viewer || !this.miradorInstance.viewer.workspace) {
      return existingRegions.length > 0 ? Array.from(regionsByIri.values()) : undefined;
    }

    const windows = this.miradorInstance.viewer.workspace.windows || [];
    const resourceImages = new Set(resource.images || []);

    for (const window of windows) {
      if (!resourceImages.has(window.canvasID) || !window.annotationsList) {
        continue;
      }

      window.annotationsList.forEach(annotation => {
        const regionIri = annotation['@id'];
        if (!regionsByIri.has(regionIri)) {
          const renderedVisibility = this.resolveRenderedRegionVisibility(window.canvasID, regionIri);
          regionsByIri.set(regionIri, {
            regionIri,
            visibility: typeof renderedVisibility === 'boolean' ? renderedVisibility : true,
          });
        }
      });
    }

    const regions = Array.from(regionsByIri.values());
    return regions.length > 0 ? regions : undefined;
  }

  private triggerManifestUpdatedEvent = (resources: IiifManifestResource[]) => {
    const resourcesWithRegions = resources.map(resource => {
      const resourceRegions = this.getRegionsForResource(resource.resourceIri, resources);
      return {
        ...resource,
        regions: resourceRegions
      };
    });

    this.setState({ allImages: resourcesWithRegions });

    trigger({
      eventType: ManifestUpdatedEvent,
      source: this.props.id,
      data: { resources: resourcesWithRegions}
    });
  }

  private findResourceIriForImage(imageIri: string): string | undefined {
    const resource = this.state.allImages.find(i => (i.images || []).includes(imageIri));
    return resource && resource.resourceIri;
  }

  private resolveImageIriForRegion(regionIri: string, preferredImageIri?: string): string | undefined {
    if (preferredImageIri) return preferredImageIri;
    if (!regionIri || !this.miradorInstance || !this.miradorInstance.viewer || !this.miradorInstance.viewer.workspace) {
      return undefined;
    }

    const windows = this.miradorInstance.viewer.workspace.windows || [];
    const windowMatch = windows.find(window =>
      Array.isArray(window.annotationsList) && window.annotationsList.some(annotation => annotation['@id'] === regionIri)
    );
    if (windowMatch && windowMatch.canvasID) {
      return windowMatch.canvasID;
    }

    const resourceMatch = this.state.allImages.find(resource =>
      Array.isArray(resource.regions) && resource.regions.some(region => region.regionIri === regionIri)
    );
    if (resourceMatch && Array.isArray(resourceMatch.images) && resourceMatch.images.length === 1) {
      return resourceMatch.images[0];
    }

    return undefined;
  }

  private triggerRegionVisibilityChangedEvent = (payload: RegionTarget & { visible: boolean; resourceIri?: string }) => {
    trigger({
      eventType: RegionVisibilityChangedEvent,
      source: this.props.id,
      data: {
        ...payload,
        resourceIri: payload.resourceIri || this.findResourceIriForImage(payload.imageIri),
      }
    });
  }

  private triggerRegionUpdatedEvent =
    (eventType: typeof RegionCreatedEvent | typeof RegionUpdatedEvent | typeof RegionRemovedEvent) =>
    (regionIri: Rdf.Iri, oa: OARegionAnnotation) => {
      const imageIri = oa.on[0].full;
      const resourceIri = this.state.allImages.find(i => i.images.includes(imageIri)).resourceIri;
      const regionLabel = getAnnotationTextResource(oa).chars;

      let newImages = [...this.state.allImages];
      const resourceIndex = newImages.findIndex(r => r.resourceIri === resourceIri);

      if (resourceIndex !== -1) {
        const resource = newImages[resourceIndex];
        const miradorRegions = this.getRegionsForResource(resourceIri, newImages) || [];
        let newRegions = [...miradorRegions];

        if (eventType === RegionCreatedEvent) {
          if (!newRegions.some(r => r.regionIri === regionIri.value)) {
            newRegions.push({ regionIri: regionIri.value, visibility: true });
          }
        } else if (eventType === RegionRemovedEvent) {
          newRegions = newRegions.filter(r => r.regionIri !== regionIri.value);
        }

        newImages[resourceIndex] = { ...resource, regions: newRegions };
      }

      this.setState({ allImages: newImages });

      trigger({
        eventType: ManifestUpdatedEvent,
        source: this.props.id,
        data: { resources: newImages }
      });

      trigger({
        eventType,
        source: this.props.id,
        data: {
          resourceIri, imageIri, regionIri: regionIri.value, regionLabel
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

  private queryImagesInfo(allImages: IiifManifestResource[]) {
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

    this.cleanupSemanticModeListeners();
    removeMirador(this.miradorInstance, element);

    const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);

    const manifestQuerying = this.state.allImages.map(({ resourceIri, images }) =>
      this.queryManifestParameters({
        infos: this.state.info,
        iiifImageIds: this.state.iiifImageId,
        iri: resourceIri, images, iiifServerUrl
      }).flatMap((allParams) => {
        const params = allParams.filter((param) => param !== undefined);
        if (params.length === 0) {
          addNotification({
            level: 'error',
            children: React.createElement(
              'p',
              {},
              'Images of the entity ',
              React.createElement(ResourceLinkComponent, { iri: resourceIri }),
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
              React.createElement(ResourceLinkComponent, { iri: resourceIri }),
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
    this.bindSemanticModeListeners();
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
          eventType: AddResourceImagesEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const { allImages } = this.state;
          if (!some(allImages, im => im.resourceIri === event.data.resourceIri)) {
            // if we don't have object images loaded, then we need to fetch the manifest
            const newImage = { resourceIri: event.data.resourceIri, images: event.data.imageIris };
            allImages.unshift(newImage);
            this.setState({ allImages: this.state.allImages })

            const iiifServerUrl = ImageApi.getIIIFServerUrl(this.props.iiifServerUrl);
            this.queryImagesInfo([newImage])
              .flatMap(
                ({ info, iiifImageId }) => {
                  return this.queryManifestParameters({
                    infos: info, iiifImageIds: iiifImageId,
                    iri: event.data.resourceIri, images: event.data.imageIris, iiifServerUrl
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
              const objectImages = allImages.find(os => os.resourceIri === event.data.resourceIri);
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
            )
            .onError(() => { 
              /* Errors are triggered when an image annotation has been created in the image graph authoring,
                 as the data it creates depends on the persistence model chosen in the ontodia configuration,
                 the AnnotationEndpoint will create LDP Resources for the image annotations i.e. regions
              */
              this.miradorInstance.eventEmitter.publish('updateAnnotationList.'+windowForImage.id);
              this.triggerManifestUpdatedEvent(this.state.allImages);
            })
            .observe({
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
          eventType: ShowRegionEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const data = event.data as any;
          const regionIri = data && data.regionIri;
          const imageIri = regionIri ? this.resolveImageIriForRegion(regionIri, data.imageIri) : undefined;
          if (imageIri && regionIri) {
            this.setRegionVisibility(imageIri, regionIri, true);
          }
        }
      });

    this.cancellation
      .map(
        listen({
          eventType: HideRegionEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const data = event.data as any;
          const regionIri = data && data.regionIri;
          const imageIri = regionIri ? this.resolveImageIriForRegion(regionIri, data.imageIri) : undefined;
          if (imageIri && regionIri) {
            this.setRegionVisibility(imageIri, regionIri, false);
          }
        }
      });

    this.cancellation
      .map(
        listen({
          eventType: ToggleRegionEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const data = event.data as any;
          const regionIri = data && data.regionIri;
          const imageIri = regionIri ? this.resolveImageIriForRegion(regionIri, data.imageIri) : undefined;
          if (imageIri && regionIri) {
            this.toggleRegionVisibility(imageIri, regionIri);
          }
        }
      });

    this.cancellation
      .map(
        listen({
          eventType: ToggleRegionsEvent,
          target: this.props.id
        })
      )
      .observe({
        value: (event) => {
          const regionIris = Array.isArray(event.data && (event.data as any).regionIris)
            ? (event.data as any).regionIris
            : [];
          if (regionIris.length > 0) {
            this.toggleRegionsVisibility(regionIris);
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

      this.cancellation
      .map(
        listen({
          eventType: LayoutChanged
        })
      )
      .observe({
        value: (event) => {
          setTimeout(() => {
            this.miradorInstance.viewer.workspace.calculateLayout()
          }, 100)
          
        }
      });
  }


  private getAvailableSemanticModes = (): SemanticAnnotationMode[] => {
    if (this.props.semanticAnnotationMode && this.props.semanticAnnotationMode.length > 0) {
      return this.props.semanticAnnotationMode;
    }
    return [
      {
        id: 'annotateImage',
        label: 'Image Region',
        iri: 'http://www.researchspace.org/ontology/EX_Digital_Image_Region',
      }
    ];
  };

  private getDefaultSemanticMode = (): SemanticAnnotationMode | undefined =>
    this.getAvailableSemanticModes()[0];

  private getWindowById = (windowId: string): Mirador.Window | undefined =>
    this.miradorInstance?.viewer?.workspace?.windows?.find(w => w.id === windowId);

  private ensureSemanticModeForCanvas = (canvasId?: string | null) => {
    if (!canvasId || this.semanticModeByCanvas.has(canvasId)) {
      return;
    }

    const defaultMode = this.getDefaultSemanticMode();
    if (defaultMode) {
      this.semanticModeByCanvas.set(canvasId, defaultMode);
    }
  }

  private bindSemanticModeListeners = () => {
    if (!this.miradorInstance?.eventEmitter || !this.miradorInstance?.viewer?.workspace) {
      return;
    }

    const bindWindow = (win: Mirador.Window) => {
      if (!win || this.semanticModeHandlers.has(win.id)) {
        return;
      }

      this.ensureSemanticModeForCanvas(win.canvasID);

      const modeHandler = (_event: any, mode: SemanticAnnotationMode) => {
        if (!mode || !mode.id) {
          return;
        }

        const currentWindow = this.getWindowById(win.id);
        const canvasId = currentWindow?.canvasID || win.canvasID;
        if (!canvasId) {
          return;
        }

        this.semanticModeByCanvas.set(canvasId, mode);
      };

      const canvasUpdatedHandler = (_event: any, payload?: { canvasID?: string; canvasId?: string }) => {
        const currentWindow = this.getWindowById(win.id);
        const canvasId = payload?.canvasID || payload?.canvasId || currentWindow?.canvasID || win.canvasID;
        this.ensureSemanticModeForCanvas(canvasId);
      };

      this.miradorInstance.eventEmitter.subscribe(`semanticAnnotationModeChanged.${win.id}`, modeHandler);
      this.miradorInstance.eventEmitter.subscribe(`currentCanvasIDUpdated.${win.id}`, canvasUpdatedHandler);

      this.semanticModeHandlers.set(win.id, modeHandler);
      this.canvasIdUpdatedHandlers.set(win.id, canvasUpdatedHandler);
    };

    this.miradorInstance.viewer.workspace.windows.forEach(bindWindow);

    if (!this.slotsUpdatedSemanticHandler) {
      this.slotsUpdatedSemanticHandler = () => {
        this.miradorInstance?.viewer?.workspace?.windows?.forEach(bindWindow);
      };
      this.miradorInstance.eventEmitter.subscribe('slotsUpdated', this.slotsUpdatedSemanticHandler);
    }

    if (!this.windowUpdatedSemanticHandler) {
      this.windowUpdatedSemanticHandler = (_event: any, payload?: { window?: Mirador.Window; id?: string; canvasID?: string }) => {
        if (payload?.window) {
          bindWindow(payload.window);
          this.ensureSemanticModeForCanvas(payload.window.canvasID);
          return;
        }

        if (payload?.id) {
          const win = this.getWindowById(payload.id);
          if (win) {
            bindWindow(win);
            this.ensureSemanticModeForCanvas(payload.canvasID || win.canvasID);
          }
          return;
        }

        this.miradorInstance?.viewer?.workspace?.windows?.forEach(bindWindow);
      };
      this.miradorInstance.eventEmitter.subscribe('windowUpdated', this.windowUpdatedSemanticHandler);
    }
  }

  private cleanupSemanticModeListeners = () => {
    if (!this.miradorInstance?.eventEmitter) {
      this.semanticModeHandlers.clear();
      this.canvasIdUpdatedHandlers.clear();
      this.slotsUpdatedSemanticHandler = undefined;
      this.windowUpdatedSemanticHandler = undefined;
      return;
    }

    this.semanticModeHandlers.forEach((handler, windowId) => {
      this.miradorInstance.eventEmitter.unsubscribe(`semanticAnnotationModeChanged.${windowId}`, handler);
    });
    this.canvasIdUpdatedHandlers.forEach((handler, windowId) => {
      this.miradorInstance.eventEmitter.unsubscribe(`currentCanvasIDUpdated.${windowId}`, handler);
    });

    if (this.slotsUpdatedSemanticHandler) {
      this.miradorInstance.eventEmitter.unsubscribe('slotsUpdated', this.slotsUpdatedSemanticHandler);
    }
    if (this.windowUpdatedSemanticHandler) {
      this.miradorInstance.eventEmitter.unsubscribe('windowUpdated', this.windowUpdatedSemanticHandler);
    }

    this.semanticModeHandlers.clear();
    this.canvasIdUpdatedHandlers.clear();
    this.slotsUpdatedSemanticHandler = undefined;
    this.windowUpdatedSemanticHandler = undefined;
  }

  private getSemanticModeForCanvas = (canvasId?: string | null): SemanticAnnotationMode | undefined => {
    if (!canvasId) {
      return this.getDefaultSemanticMode();
    }

    return this.semanticModeByCanvas.get(canvasId) || this.getDefaultSemanticMode();
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
      (canvasId) => this.getSemanticModeForCanvas(canvasId),
      this.props.annotationDataContext,
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
      availableAnnotationModes: this.getAvailableSemanticModes(),
  //annotationModeDebugShowIri: true,
      showAnnotationTextLabels: true,
      annotationTextLabelMaxLength: 120,
      annotationTextLabelPinOffsetX: -15,
      annotationTextLabelPinOffsetY: -20,
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
    this.cleanupSemanticModeListeners();
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

  private updateRegionVisibilityState(
    updates: Array<{ imageIri: string, regionIri: string, visible: boolean }>,
    onCommitted?: (newAllImages: IiifManifestResource[]) => void
  ): IiifManifestResource[] {
    const newAllImages = this.state.allImages.map(resource => {
      const resourceImages = resource.images || [];
      const relevantUpdates = updates.filter(update => resourceImages.includes(update.imageIri));
      if (relevantUpdates.length === 0) {
        return resource;
      }

      const regionsByIri = new Map((resource.regions || []).map(region => [region.regionIri, { ...region }]));

      relevantUpdates.forEach(update => {
        const existingRegion = regionsByIri.get(update.regionIri);
        regionsByIri.set(update.regionIri, existingRegion
          ? { ...existingRegion, visibility: update.visible }
          : { regionIri: update.regionIri, visibility: update.visible });
      });

      return { ...resource, regions: Array.from(regionsByIri.values()) };
    });
    this.setState({ allImages: newAllImages }, () => {
      if (onCommitted) {
        onCommitted(newAllImages);
      }
    });
    return newAllImages;
  }

  private getAnnotationLayer(window: Mirador.Window) {
    const imageView = window && window.focusModules && window.focusModules.ImageView;
    return imageView && imageView.annotationsLayer ? (imageView.annotationsLayer as any) : null;
  }

  private getAnnotationShapesMap(layer: any) {
    if (!layer) return null;
    return layer.drawTool ? layer.drawTool.annotationsToShapesMap : (layer.annotationsToShapesMap || null);
  }

  private applyShapeVisibility(shape: any, visible: boolean) {
    if (!shape) return;

    if (typeof shape.setVisible === 'function') {
      shape.setVisible(visible);
    }

    shape.visible = visible;

    if ('_visible' in shape) {
      shape._visible = visible;
    }
  }

  private redrawAndSyncAnnotationLayer(layer: any) {
    if (!layer) return;

    const paperScope = (layer.drawTool && layer.drawTool.paperScope) ||
      (layer.drawTool && layer.drawTool.svgOverlay && layer.drawTool.svgOverlay.paperScope) ||
      (layer.svgOverlay && layer.svgOverlay.paperScope) ||
      layer.paperScope;

    if (paperScope && paperScope.view) {
      paperScope.view.draw();
    }

    if (layer.drawTool && typeof layer.drawTool.renderAnnotationTextLabels === 'function') {
      layer.drawTool.renderAnnotationTextLabels();
    } else if (layer.drawTool && typeof layer.drawTool.syncAnnotationTextLabels === 'function') {
      layer.drawTool.syncAnnotationTextLabels();
    }
  }

  private resolveRenderedRegionVisibility(imageIri: string, regionIri: string): boolean | undefined {
    if (!this.miradorInstance || !this.miradorInstance.viewer || !this.miradorInstance.viewer.workspace) {
      return undefined;
    }

    const windows = this.miradorInstance.viewer.workspace.windows || [];
    const window = windows.find(w => w && w.canvasID === imageIri);
    if (!window) {
      return undefined;
    }

    const layer = this.getAnnotationLayer(window);
    const shapesMap = this.getAnnotationShapesMap(layer);
    const shapes = shapesMap && shapesMap[regionIri];
    if (!Array.isArray(shapes) || shapes.length === 0) {
      return undefined;
    }

    return shapes.some(shape => !(shape && (shape.visible === false || shape._visible === false)));
  }

  private resolveRegionVisibility(imageIri: string, regionIri: string): boolean {
    for (const resource of this.state.allImages) {
      if (!(resource.images || []).includes(imageIri)) continue;
      const region = resource.regions && resource.regions.find(r => r.regionIri === regionIri);
      if (region && typeof region.visibility === 'boolean') {
        return region.visibility;
      }
    }

    const renderedVisibility = this.resolveRenderedRegionVisibility(imageIri, regionIri);
    if (typeof renderedVisibility === 'boolean') {
      return renderedVisibility;
    }

    return false;
  }

  private setRegionVisibility = (imageIri: string, regionIri: string, visible: boolean): IiifManifestResource[] => {
    const newImages = this.updateRegionVisibilityState([{ imageIri, regionIri, visible }]);
    const windows = this.miradorInstance.viewer.workspace.windows;
    for (const window of windows) {
      this.setRegionVisibilityInWindow(window, imageIri, regionIri, visible);
    }
    this.triggerRegionVisibilityChangedEvent({
      imageIri,
      regionIri,
      visible,
      resourceIri: this.findResourceIriForImage(imageIri),
    });
    return newImages;
  }

  private setAllRegionsVisibility = (visible: boolean): IiifManifestResource[] => {
    const updates = [];
    this.state.allImages.forEach(resource => {
      if (resource.regions) {
        resource.regions.forEach(region => {
          (resource.images || []).forEach(imageIri => {
            updates.push({ imageIri, regionIri: region.regionIri, visible });
          });
        });
      }
    });
    const newImages = this.updateRegionVisibilityState(updates);

    const windows = this.miradorInstance.viewer.workspace.windows;
    for (const window of windows) {
      const layer = this.getAnnotationLayer(window);
      const shapesMap = this.getAnnotationShapesMap(layer);

      if (shapesMap) {
        Object.keys(shapesMap).forEach(key => {
          const shapes = shapesMap[key];
          if (shapes) {
            shapes.forEach(shape => {
              this.applyShapeVisibility(shape, visible);
            });
          }
        });
        this.redrawAndSyncAnnotationLayer(layer);
      }
    }

    return newImages;
  }

  private toggleRegionVisibility = (imageIri: string, regionIri: string): IiifManifestResource[] => {
    const current = this.resolveRegionVisibility(imageIri, regionIri);
    return this.setRegionVisibility(imageIri, regionIri, !current);
  }

  private toggleRegionsVisibility(regionIris: string[]): IiifManifestResource[] {
    const wantedRegionIris = Array.from(new Set((regionIris || []).filter(Boolean)));
    const updates: Array<{ imageIri: string, regionIri: string, visible: boolean }> = [];
    const resourceIriByImage = new Map<string, string>();
    const seenTargets = new Set<string>();
    const windows = this.miradorInstance.viewer.workspace.windows;

    // Use the component state as the source of truth for current region visibility.
    // ToggleRegionsEvent only provides region IRIs, so batch toggling must derive the
    // current visibility from allImages[*].regions[*].visibility rather than from the
    // viewer or ad-hoc image resolution.
    this.state.allImages.forEach(resource => {
      const resourceImages = resource.images || [];
      const resourceRegions = resource.regions || [];

      resourceRegions.forEach(region => {
        if (!wantedRegionIris.includes(region.regionIri)) return;

        resourceImages.forEach(imageIri => {
          const key = `${imageIri}::${region.regionIri}`;
          if (seenTargets.has(key)) return;
          seenTargets.add(key);
          resourceIriByImage.set(imageIri, resource.resourceIri);
          updates.push({ imageIri, regionIri: region.regionIri, visible: !region.visibility });
        });
      });
    });

    // Backward-compatible fallback: if a selected region is not present in allImages yet,
    // try to resolve it from the current viewer state.
    wantedRegionIris.forEach(regionIri => {
      const alreadyPlanned = updates.some(update => update.regionIri === regionIri);
      if (alreadyPlanned) return;

      const imageIri = this.resolveImageIriForRegion(regionIri);
      if (!imageIri) return;

      const key = `${imageIri}::${regionIri}`;
      if (seenTargets.has(key)) return;
      seenTargets.add(key);
      updates.push({ imageIri, regionIri, visible: !this.resolveRegionVisibility(imageIri, regionIri) });
    });

    updates.forEach(({ imageIri, regionIri, visible }) => {
      for (const window of windows) {
        this.setRegionVisibilityInWindow(window, imageIri, regionIri, visible);
      }
    });

    const newImages = this.updateRegionVisibilityState(updates, (committedImages) => {
      updates.forEach(({ imageIri, regionIri, visible }) => {
        this.triggerRegionVisibilityChangedEvent({
          imageIri,
          regionIri,
          visible,
          resourceIri: resourceIriByImage.get(imageIri) || this.findResourceIriForImage(imageIri),
        });
      });

      this.triggerManifestUpdatedEvent(committedImages);
    });

    return newImages;
  }

  private setRegionVisibilityInWindow = (window: Mirador.Window, imageIri: string, regionIri: string, visible: boolean) => {
    if (!window || window.canvasID !== imageIri) return;

    const layer = this.getAnnotationLayer(window);
    const shapesMap = this.getAnnotationShapesMap(layer);

    if (!shapesMap) return;

    const shapes = shapesMap[regionIri];
    if (shapes) {
      shapes.forEach(shape => {
        this.applyShapeVisibility(shape, visible);
      });
      this.redrawAndSyncAnnotationLayer(layer);
    }
  }

  private toggleAllRegionsVisibility = (): IiifManifestResource[] => {
    const updates = [];
    this.state.allImages.forEach(resource => {
      if (resource.regions) {
        resource.regions.forEach(region => {
          (resource.images || []).forEach(imageIri => {
            updates.push({ imageIri, regionIri: region.regionIri, visible: !region.visibility });
          });
        });
      }
    });
    const newImages = this.updateRegionVisibilityState(updates);

    const windows = this.miradorInstance.viewer.workspace.windows;
    for (const window of windows) {
      const layer = this.getAnnotationLayer(window);
      const shapesMap = this.getAnnotationShapesMap(layer);

      if (shapesMap) {
        Object.keys(shapesMap).forEach(key => {
          const shapes = shapesMap[key];
          if (shapes) {
            shapes.forEach(shape => {
              const currentlyVisible = !(shape.visible === false || shape._visible === false);
              this.applyShapeVisibility(shape, !currentlyVisible);
            });
          }
        });
        this.redrawAndSyncAnnotationLayer(layer);
      }
    }

    return newImages;
  }
}

class AnnotationEndpointProxy implements AnnotationEndpoint {
  constructor(
    private endpoint: AnnotationEndpoint,
    private onCreated: (regionIri: Rdf.Iri, oa: OARegionAnnotation) => void,
    private onUpdated: (regionIri: Rdf.Iri, oa: OARegionAnnotation) => void,
    private onRemoved: (regionIri: Rdf.Iri, oa: OARegionAnnotation) => void,
    private resolveSemanticModeForCanvas?: (canvasId?: string | null) => SemanticAnnotationMode | undefined,
    private annotationDataContext?: any,
  ) {}

  private getCanvasIdFromAnnotation = (annotation: OARegionAnnotation): string | undefined => {
    const target = annotation?.on?.[0] as any;
    return target?.full || target?.['@id'] || target?.source || undefined;
  }

  private applySemanticModeToAnnotation = (annotation: OARegionAnnotation, mode?: SemanticAnnotationMode) => {
    if (!mode) {
      return;
    }

    const annotationWithSemanticMode = annotation as any;
    annotationWithSemanticMode.semanticMode = mode.id;
    annotationWithSemanticMode.semanticModeLabel = mode.label;
    annotationWithSemanticMode.representsResourcesOfType = mode.iri;
    annotationWithSemanticMode.representsResourcesOfP2Type = mode?.p2TypeIri;

    const resources = Array.isArray(annotationWithSemanticMode.resource)
      ? annotationWithSemanticMode.resource
      : (annotationWithSemanticMode.resource ? [annotationWithSemanticMode.resource] : []);

    resources.forEach((resource: any) => {
      if (resource && typeof resource === 'object') {
        resource.semanticMode = mode.id;
        resource.semanticModeLabel = mode.label;
      }
    });
  }

  init = this.endpoint.init ? () =>  {
    this.endpoint.init();
  } : undefined;

  search(canvasIri: Rdf.Iri) {
    return this.endpoint.search(canvasIri);
  }

  create(annotation: OARegionAnnotation) {
    const canvasId = this.getCanvasIdFromAnnotation(annotation);
    const semanticMode = this.resolveSemanticModeForCanvas ? this.resolveSemanticModeForCanvas(canvasId) : undefined;
    this.applySemanticModeToAnnotation(annotation, semanticMode);

    if (this.annotationDataContext) {
      annotation.annotationDataContext = this.annotationDataContext;
      annotation.annotationDataContext["semanticMode"] = semanticMode["id"];
      annotation.annotationDataContext["semanticModeLabel"] = semanticMode["label"];
    }

    return this.endpoint.create(annotation)
      .onValue(regionIri => this.onCreated(regionIri, annotation));
  }

  update(annotation: OARegionAnnotation) {
    return this.endpoint.update(annotation)
      .onValue(regionIri => this.onUpdated(regionIri, annotation));
  }

  remove(annotation: OARegionAnnotation) {
    return this.endpoint.remove(annotation)
      .onValue(() => {this.onRemoved(Rdf.iri(annotation['@id']), annotation); });
  }

  userAuthorize = this.endpoint.userAuthorize ? (action: any, annotation: OARegionAnnotation) => {
    return this.endpoint.userAuthorize(action, annotation);
  } : undefined;
}

export type c = ImageRegionEditorComponentMirador;
export const c = ImageRegionEditorComponentMirador;
export const f = React.createFactory(c);
export default c;
