/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import { ReactNode } from 'react';
import * as Immutable from 'immutable';
import { ElementTypeIri, CancellationToken } from 'ontodia';

import { Rdf } from 'platform/api/rdf';
import { FieldDefinition, FieldMapping, mapChildToComponent } from 'platform/components/forms';

import {
  FieldConfigurationContext,
  EntityMetadata,
  assertFieldConfigurationItem,
  isObjectProperty,
} from './FieldConfigurationCommon';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

export interface OntodiaEntityMetadataProps {
  /**
   * Iri of the type to be configured. For example, 'http://xmlns.com/foaf/0.1/person'
   */
  entityTypeIri: string;

  /**
   * Ordered list of fields to be used for this entity. Automatically generated forms will honor
   * the order of the fields specified here.
   */
  fields: ReadonlyArray<string>;

  enableDefaultFields?: boolean;

  /**
   * Field Iri for entity label override
   */
  labelIri?: string;

  /**
   * Field Iri for entity image override
   */
  imageIri?: string;

  /**
   * Subject template override for generating Iri of new entities
   */
  newSubjectTemplate?: string;

  /**
   * Semantic form override. If developer wants to override auto-generated form,
   * it should be placed inside <ontodia-entity-metadata>.
   */
  children?: JSX.Element;
}

/**
 * @example
 * <ontodia-entity-metadata
 *   entity-type-iri='http://example.com/Company'
 *   fields='["field-iri-1", "field-iri-2", ...]'
 *   label-iri='http://www.example.com/fields/companyName'
 *   image-iri='http://www.example.com/fields/hasType'
 *   new-subject-template='http://www.example.com/company/{{UUID}}'
 *   force-iris='["datatype-field-1", ...]'>
 *
 *   <semantic-form-text-input for='http://www.example.com/fields/companyName'>
 *   </semantic-form-text-input>
 *
 *   <semantic-form-composite-input
 *     for='http://www.example.com/fields/companyAddress'
 *     fields='...'>
 *     <!-- inputs for addressCountry, addressCity, etc) -->
 *   </semantic-form-composite-input>
 *
 *   <semantic-form-errors></semantic-form-errors>
 *   <button name="reset" class="btn btn-default">Reset</button>
 *   <button name="submit" class="btn btn-action">Save</button>
 * </ontodia-entity-metadata>
 */
export class OntodiaEntityMetadata extends React.Component<OntodiaEntityMetadataProps, {}> {
  render(): null {
    return null;
  }

  static SPARQL_QUERY = SparqlUtil.Sparql`
      SELECT ?field WHERE {
        ?field <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.researchspace.org/resource/system/fields/Field>;
        <http://www.researchspace.org/resource/system/fields/category> <http://www.researchspace.org/resource/system/category/knowledge_map> .
      }`
  static knowledgeMapCategoryKPs = OntodiaEntityMetadata.getFieldsIrisForDefaultCategory();

  static getRequiredFields(props: OntodiaEntityMetadataProps, ct: CancellationToken): Promise<Rdf.Iri[]> {
    const fieldIris: Rdf.Iri[] = [];
    if (props.labelIri) {
      fieldIris.push(Rdf.iri(props.labelIri));
    }
    if (props.imageIri) {
      fieldIris.push(Rdf.iri(props.imageIri));
    }
    if (props.fields) {
      for (const otherField of props.fields) {
        fieldIris.push(Rdf.iri(otherField));
      }
    }
    return Promise.all([Promise.resolve(fieldIris),Promise.resolve(this.knowledgeMapCategoryKPs)]).
            then(results => {
                return [].concat(results[0],results[1]);
           });
  }

  static getFieldsIrisForDefaultCategory(): Promise<Rdf.Iri[]> {    
    return new Promise((resolve) => {
      SparqlClient.select(OntodiaEntityMetadata.SPARQL_QUERY)
      .onValue((fr) => { 
          let iris = [];
          fr.results.bindings.map(binding => iris.push(binding.field));
          resolve(iris);    
      })
      .onError((err) => console.error('Error during resource form query execution ',err))
    });    
  }

  static getFieldsForCategory(): Promise<string[]> {    
    return new Promise((resolve) => {
      SparqlClient.select(OntodiaEntityMetadata.SPARQL_QUERY)
      .onValue((fr) => { 
          let iris = [];
          fr.results.bindings.map(binding => iris.push(binding.field.value.toString()));
          resolve(iris);    
      })
      .onError((err) => console.error('Error during resource form query execution ',err))
      });
    //return Promise.resolve(iris);
  }

  static async configure(props: OntodiaEntityMetadataProps, context: FieldConfigurationContext): Promise<void> {
    extractAuthoringMetadata(props, context);
  }
}

assertFieldConfigurationItem(OntodiaEntityMetadata);

function extractAuthoringMetadata(props: OntodiaEntityMetadataProps, context: FieldConfigurationContext) {
  const { fieldByIri: allFieldByIri, typeIri, datatypeFields } = context;
  const {
    entityTypeIri,
    fields,
    labelIri = context.defaultLabelIri,
    imageIri = context.defaultImageIri,
    newSubjectTemplate = context.defaultSubjectTemplate,
  } = props;

  Promise.all([Promise.resolve(fields), OntodiaEntityMetadata.getFieldsForCategory()])
    .then(results => {
        const extendedFields = [].concat(results[0],results[1]);

        if (typeof entityTypeIri !== 'string') {
          throw new Error(`Missing 'entity-type-iri' property for <ontodia-entity-metadata>`);
        }
        if (!fields) {
          throw new Error(`Missing 'fields' property for <ontodia-entity-metadata>`);
        }
        if (typeof labelIri !== 'string') {
          throw new Error(`Missing 'label-iri' property for <ontodia-entity-metadata>`);
        }

        const labelField = allFieldByIri.get(labelIri);
        const typeField = allFieldByIri.get(typeIri);
        const imageField = allFieldByIri.get(imageIri);

        if (!typeField) {
          throw new Error(`<ontodia-entity-metadata> for <${entityTypeIri}>: missing type field <${typeIri}>`);
        }
        if (!labelField) {
          throw new Error(`<ontodia-entity-metadata> for <${entityTypeIri}>: missing label field <${labelIri}>`);
        }

        const mappedFields = extendedFields.map((fieldIri) => {
          const field = allFieldByIri.get(fieldIri);
          if (!field) {
            throw new Error(`<ontodia-entity-metadata> for <${entityTypeIri}>: missing field <${labelIri}>`);
          }
          return field;
        });

        const headFields = [typeField, labelField];
        if (imageField) {
          headFields.push(imageField);
        }

        const entityFields = [...headFields, ...mappedFields];
        const fieldByIri = Immutable.Map(entityFields.map((f) => [f.iri, f] as [string, FieldDefinition]));

        const metadata: EntityMetadata = {
          entityType: entityTypeIri as ElementTypeIri,
          fields: entityFields,
          fieldByIri,
          datatypeFields: Immutable.Set<string>(datatypeFields.filter((fieldIri) => fieldByIri.has(fieldIri))),
          typeField,
          labelField,
          imageField,
          newSubjectTemplate,
          formChildren: props.children,
        };

        validateFormFieldsDatatype(metadata.formChildren, metadata);

        context.collectedMetadata.set(metadata.entityType, metadata);

    });
  }

function validateFormFieldsDatatype(children: ReactNode | undefined, metadata: EntityMetadata) {
  if (!children) {
    return;
  }
  React.Children.forEach(children, (child) => {
    const mapping = mapChildToComponent(child);
    if (!mapping || FieldMapping.isComposite(mapping)) {
      return;
    }
    if (FieldMapping.isInput(mapping)) {
      const field = metadata.fieldByIri.get(mapping.element.props.for);
      if (isObjectProperty(field, metadata)) {
        throw new Error(`XSD Datatype of the field <${field.iri}> isn't literal`);
      }
    } else if (FieldMapping.isOtherElement(mapping)) {
      validateFormFieldsDatatype(mapping.children, metadata);
    }
  });
}

export default OntodiaEntityMetadata;
