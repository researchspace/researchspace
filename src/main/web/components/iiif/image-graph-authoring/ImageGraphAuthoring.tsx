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
import { DiagramModel, AuthoringState, sameElement, ElementTypeIri } from 'ontodia';

import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { Cancellation } from 'platform/api/async/Cancellation';
import { listen, trigger, BuiltInEvents } from 'platform/api/events';

import * as OntodiaEvents from 'platform/components/3-rd-party/ontodia/OntodiaEvents';

import { rso } from 'platform/data/vocabularies';

import { ImageRegionEditorComponentMirador } from '../ImageRegionEditor';

import {
  OntodiaAnnotationEndpoint,
  OntodiaAnnotationEndpointFields,
  MiradorRegions,
} from './OntodiaAnnotationEndpoint';
import { Spinner } from 'platform/components/ui/spinner';

export interface ImageGraphAuthoringConfig {
  /**
   * Unique ID of the component.
   */
  id?: string;
  /**
   * Pattern to generate the image ID from the image IRI
   *
   * @example
   * BIND(REPLACE(str(?imageIRI), "^.+/[A-Z0]*([1-9][0-9]*)_.*$", "$1") AS ?imageID)
   */
  imageIdPattern: string;
  /**
   * URL of IIIF Server
   */
  iiifServerUrl: string;
  /**
   * Repositories to be used to query images.
   */
  repositories?: Array<string>;
  /**
   * ID of Ontodia component to be used as an endpoint.
   */
  ontodiaId: string;
  /**
   * Field definitions to be used to create regions.
   */
  fields: OntodiaAnnotationEndpointFields;

  /**
   * Template that is used when there are no images in the corresponding Knowledge Map
   */
  noImagesTemplate?: string;

  /**
   * Use details sidebar instead of built-in mirador details view
   */
  useDetailsSidebar?: boolean;
}

export interface State {
  key?: number;
  isLoading?: boolean;
}

/**
 * Mirador component that uses Ontodia in authoring mode as an endpoint to read and write images
 * and regions.
 *
 * @example
 *
 * <div style='height: calc(100vh - 159.5px)'>
 *    <div style='height: 50%'>
 *      <ontodia id='ontodia-component' authoring-mode=true post-saving=none>
 *       <semantic-form new-subject-template='http://www.example.com/entity/digitalimageregion/{{UUID}}'
 *          fields='[ {
 *             "iri" : "http://www.example.com/fieldDefinition/is%20primary%20area%20of",
 *             "selectPattern" : "SELECT ?value ?label WHERE {\n  $subject <http://www.ics.forth.gr/isl/CRMdig/L49_is_primary_area_of> ?value.\n}",
 *             "minOccurs" : "1",
 *             "domain" : [ "http://www.researchspace.org/ontology/EX_Digital_Image_Region" ],
 *             "range" : [ "http://www.researchspace.org/ontology/EX_Digital_Image" ],
 *             "defaultValues" : [ ],
 *             "maxOccurs" : "1",
 *             "id" : "isPrimaryAreaOf",
 *             "label" : "is primary area of",
 *             "insertPattern" : "INSERT { $subject <http://www.ics.forth.gr/isl/CRMdig/L49_is_primary_area_of> $value } WHERE {}",
 *             "order" : 0
 *           }, {
 *             "iri" : "http://www.example.com/fieldDefinition/region%20type",
 *             "selectPattern" : "SELECT ?value WHERE {\n  $subject a ?value.\n}",
 *             "minOccurs" : "1",
 *             "xsdDatatype" : "http://www.w3.org/2001/XMLSchema#anyURI",
 *             "domain" : [ "http://www.researchspace.org/ontology/EX_Digital_Image_Region" ],
 *             "range" : [ "http://www.w3.org/2000/01/rdf-schema#Class" ],
 *             "defaultValues" : [ ],
 *             "id" : "type",
 *             "label" : "region type",
 *             "insertPattern" : "INSERT {\n  $subject a $value .\n  $subject a crmdig:D35_Area .\n} WHERE {}",
 *             "order" : 0
 *           }, {
 *             "iri" : "http://www.example.com/fieldDefinition/region%20label",
 *             "selectPattern" : "SELECT ?value WHERE {\n  $subject <http://www.researchspace.org/ontology/displayLabel> ?value.\n}",
 *             "minOccurs" : "1",
 *             "xsdDatatype" : "http://www.w3.org/2001/XMLSchema#string",
 *             "domain" : [ "http://www.researchspace.org/ontology/EX_Digital_Image_Region" ],
 *             "range" : [ ],
 *             "defaultValues" : [ ],
 *             "maxOccurs" : "1",
 *             "id" : "label",
 *             "label" : "region label",
 *             "insertPattern" : "INSERT { $subject <http://www.researchspace.org/ontology/displayLabel> $value} WHERE {}",
 *             "order" : 0
 *           }, {
 *             "iri" : "http://www.example.com/fieldDefinition/region%20value",
 *             "selectPattern" : "SELECT ?value WHERE {\n  $subject <http://www.w3.org/1999/02/22-rdf-syntax-ns#value>?value.\n}",
 *             "minOccurs" : "1",
 *             "xsdDatatype" : "http://www.w3.org/2001/XMLSchema#string",
 *             "domain" : [ "http://www.researchspace.org/ontology/EX_Digital_Image_Region" ],
 *             "range" : [ ],
 *             "defaultValues" : [ ],
 *             "maxOccurs" : "1",
 *             "id" : "value",
 *             "label" : "region value",
 *             "insertPattern" : "INSERT { $subject <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> $value} WHERE {}",
 *             "order" : 0
 *           }, {
 *             "iri" : "http://www.example.com/fieldDefinition/region%20viewport",
 *             "selectPattern" : "SELECT ?value WHERE {\n  $subject <http://www.researchspace.org/ontology/viewport> ?value.\n}",
 *             "xsdDatatype" : "http://www.w3.org/2001/XMLSchema#string",
 *             "domain" : [ "http://www.researchspace.org/ontology/EX_Digital_Image_Region" ],
 *             "range" : [ ],
 *             "defaultValues" : [ ],
 *             "maxOccurs" : "1",
 *             "id" : "viewport",
 *             "label" : "region viewport",
 *             "insertPattern" : "INSERT { $subject <http://www.researchspace.org/ontology/viewport> $value} WHERE {}",
 *             "order" : 0
 *           }, {
 *             "iri" : "http://www.example.com/fieldDefinition/region%20bounding%20box",
 *             "selectPattern" : "SELECT ?value WHERE {\n  $subject <http://www.researchspace.org/ontology/boundingBox> ?value.\n}",
 *             "minOccurs" : "1",
 *             "xsdDatatype" : "http://www.w3.org/2001/XMLSchema#string",
 *             "domain" : [ "http://www.researchspace.org/ontology/EX_Digital_Image_Region" ],
 *             "range" : [ ],
 *             "defaultValues" : [ ],
 *             "maxOccurs" : "1",
 *             "id" : "boundingBox",
 *             "label" : "region bounding box",
 *             "insertPattern" : "INSERT { $subject <http://www.researchspace.org/ontology/boundingBox> $value} WHERE {}",
 *             "order" : 0
 *           } ]'>
 *        <ontodia-entity-metadata entity-type-iri='http://www.researchspace.org/ontology/EX_Digital_Image_Region'
 *          type-iri='http://www.example.com/fieldDefinition/region%20type'
 *          label-iri='http://www.example.com/fieldDefinition/region%20label'>
 *        </ontodia-entity-metadata>
 *
 *          <semantic-form-text-input for="label"></semantic-form-text-input>
 *          <semantic-form-hidden-input for="value"></semantic-form-hidden-input>
 *          <semantic-form-hidden-input for="viewport"></semantic-form-hidden-input>
 *          <semantic-form-hidden-input for="boundingBox"></semantic-form-hidden-input>
 *
 *          <button name="submit" class="btn btn-sm btn-success">Save</button>
 *          <button name="reset" class="btn btn-sm btn-default">Reset</button>
 *          <button name="cancel" class="btn btn-sm btn-danger pull-right">Cancel</button>
 *        </semantic-form>
 *      </ontodia>
 *    </div>
 *
 *    <div style='height: 50%'>
 *      <rs-image-graph-authoring iiif-server-url="http://example.com/IIIF"
 *         image-id-pattern='BIND(REPLACE(str(?imageIRI), "^.+/[A-Z0]*([1-9][0-9]*)_.*$", "$1") AS ?imageID)'
 *         ontodia-id='ontodia-component'
 *         fields='{
 *           "boundingBox": "http://www.example.com/fieldDefinition/region%20bounding%20box",
 *           "value": "http://www.example.com/fieldDefinition/region%20value",
 *           "viewport": "http://www.example.com/fieldDefinition/region%20viewport",
 *           "isPrimaryAreaOf": "http://www.example.com/fieldDefinition/is%20primary%20area%20of"
 *         }'>
 *      </rs-image-graph-authoring>
 *    </div>
 * </div>
 */
export class ImageGraphAuthoringComponent extends Component<ImageGraphAuthoringConfig, State> {

  static defaultProps = {
    noImagesTemplate: '<p>No images found in the corresponding Knowledge Map.</p>',
  };

  private readonly cancellation = new Cancellation();

  private readonly annotationEndpoint: OntodiaAnnotationEndpoint;

  private miradorInstance: Mirador.Instance;

  constructor(props: ImageGraphAuthoringConfig, context: any) {
    super(props, context);
    this.state = {
      key: 0,
      isLoading: true,
    };
    this.annotationEndpoint = new OntodiaAnnotationEndpoint(
      {
        miradorId: props.id,
        ontodiaId: props.ontodiaId,
        fields: props.fields,
      },
      {}
    );
  }

  componentDidMount() {
    const { ontodiaId } = this.props;
    this.cancellation
      .map(
        listen({
          eventType: BuiltInEvents.ComponentLoaded,
          source: ontodiaId,
        })
      )
      .observe({
        value: () => this.setState({ isLoading: false }),
      });
    this.cancellation
      .map(
        listen({
          eventType: OntodiaEvents.DiagramChanged,
          source: ontodiaId,
        })
      )
      .observe({
        value: ({ data: { model, authoringState } }) => {
          const { miradorRegions } = this.annotationEndpoint;
          const newMiradorRegions = this.findRegionsOnDiagram(model as DiagramModel, authoringState as AuthoringState);
          const shouldUpdate = this.shouldUpdate(miradorRegions, newMiradorRegions);
          if (shouldUpdate) {
            this.annotationEndpoint.setMiradorRegions(newMiradorRegions);
            if (Object.keys(miradorRegions).length !== Object.keys(newMiradorRegions).length) {
              this.setState(({ key }: State): State => ({ key: key + 1 }));
            } else if (this.miradorInstance) {
              this.miradorInstance.viewer.workspace.windows.forEach((window) => {
                window.eventEmitter.publish(`removeTooltips.${window.id}`);
                window.eventEmitter.publish(`updateAnnotationList.${window.id}`);
              });
            }
          }
        },
      });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
    this.unsubscribeFromMiradorEvents();
  }

  private findRegionsOnDiagram(model: DiagramModel, authoringState: AuthoringState): MiradorRegions {
    const newRegions = {};
    model.elements.forEach((element) => {
      if (element.data.types.indexOf(rso.EX_Digital_Image.value as ElementTypeIri) >= 0) {
        if (!newRegions[element.iri]) {
          newRegions[element.iri] = [];
        }
      }
      if (element.data.types.indexOf(rso.EX_Digital_Image_Region.value as ElementTypeIri) >= 0) {
        const event = authoringState.elements.get(element.iri);
        if (event && event.deleted) {
          return;
        }
        element.links.forEach((link) => {
          if (link.typeId === this.props.fields.isPrimaryAreaOf && link.sourceId === element.id) {
            const region = {
              region: element.data,
              isNew: Boolean(event),
            };
            if (newRegions[link.data.targetId]) {
              newRegions[link.data.targetId].push(region);
            } else {
              newRegions[link.data.targetId] = [region];
            }
          }
        });
      }
    });
    return newRegions;
  }

  private shouldUpdate(miradorRegions: MiradorRegions, newMiradorRegions: MiradorRegions): boolean {
    if (Object.keys(miradorRegions).length !== Object.keys(newMiradorRegions).length) {
      return true;
    }
    for (const imageIri in miradorRegions) {
      if (!miradorRegions.hasOwnProperty(imageIri)) {
        continue;
      }
      const regions = miradorRegions[imageIri];
      const newRegions = newMiradorRegions[imageIri];
      if (!newRegions || regions.length !== newRegions.length) {
        return true;
      }
      for (const { region } of regions) {
        const isChanged = !newRegions.some(({ region: newRegion }) => {
          return sameElement(region, newRegion);
        });
        if (isChanged) {
          return true;
        }
      }
    }
    return false;
  }

  private onMiradorInitialized = (miradorInstance: Mirador.Instance) => {
    this.unsubscribeFromMiradorEvents();

    this.miradorInstance = miradorInstance;
    this.subscribeOnMiradorEvents();
  };

  private unsubscribeFromMiradorEvents() {
    if (this.miradorInstance) {
      this.miradorInstance.eventEmitter.unsubscribe('windowUpdated');
    }
  }

  private subscribeOnMiradorEvents() {
    this.miradorInstance.eventEmitter.subscribe('windowUpdated', this.windowUpdateHandler);
  }

  private windowUpdateHandler = (event, data) => {
    if (data.canvasID) {
      trigger({
        eventType: OntodiaEvents.FocusOnElement,
        source: this.props.id,
        targets: [this.props.ontodiaId],
        data: { iri: data.canvasID },
      });
    }
  };

  render() {
    const { key, isLoading } = this.state;
    const { miradorRegions } = this.annotationEndpoint;

    if (isLoading) {
      return <Spinner />;
    }

    if (!Object.keys(miradorRegions).length) {
      return <TemplateItem template={{source: this.props.noImagesTemplate}} />;
    }

    const images = {
      ['http://www.researchspace.org/ontology/Image_Graph_Authoring']: Object.keys(miradorRegions),
    };
    return (
      <ImageRegionEditorComponentMirador
        key={key}
        {...this.props}
        imageOrRegion={images}
        annotationEndpoint={this.annotationEndpoint}
        onMiradorInitialized={this.onMiradorInitialized}
      />
    );
  }
}

export default ImageGraphAuthoringComponent;
