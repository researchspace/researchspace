/**
 * ResearchSpace
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

import { Children, ReactNode } from 'react';
import * as Immutable from 'immutable';
import { ElementTypeIri, CancellationToken } from 'ontodia';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import * as FieldService from 'platform/api/services/ldp-field';

import * as Forms from 'platform/components/forms';
import { isValidChild } from 'platform/components/utils';

import { observableToCancellablePromise } from '../AsyncAdapters';
import {
  EntityMetadata,
  FieldConfiguration,
  FieldConfigurationContext,
  FieldConfigurationItem,
  OntodiaPersistenceMode,
} from './FieldConfigurationCommon';

export interface OntodiaFieldConfigurationConfig {
  /**
   * Switches Ontodia to authoring mode.
   *
   * Authoring mode requires entity metadata to be specified (using semantic forms as children)
   * in order to work.
   */
  authoringMode?: boolean;

  /**
   * Defines persistence mode to use in authoring mode.
   * @default {type: "form"}
   */
  persistence?: OntodiaPersistenceMode;

  /**
   * Renders debug info into DOM when placed as stand-alone component and also to the console.
   * @default false
   */
  debug?: boolean;

  /**
   * Fields to be used in Ontodia instance. Could be populated inline or with backend helper.
   * @see Reading Field Definitions from the Database from Help:SemanticForm
   */
  fields?: ReadonlyArray<Forms.FieldDefinitionProp>;

  /**
   * Allows to fetch field definitions from the backend API.
   * @default true
   */
  allowRequestFields?: boolean;

  /**
   * Field that is used for entity type. In most cases field should use rdf:type as a property.
   */
  typeIri: string;

  /**
   * Default field to be used for entity label
   */
  defaultLabelIri?: string;

  /**
   * Default field to be used for entity image
   */
  defaultImageIri?: string;

  /**
   * Default template to create Iri for new entities.
   * @see new-subject-template from Help:SemanticForm
   */
  defaultSubjectTemplate?: string;

  /**
   * Forces certain fields of xsd:anyUri datatype to be treated as entity properties
   * to be modified inside entity form instead of object properties treated and modified
   * as an edge in the graph, like entity image Iri, or some vocabulary reference.
   */
  forceDatatypeFields?: ReadonlyArray<string>;

  /**
   * Allow user to persist changes only if there are no validation errors.
   *
   * @default false
   */
  enforceConstraints?: boolean;

  /**
   * Children can be either ontodia-entity-metadata or ontodia-field-input-override
   */
  readonly children: object;
}

export interface OntodiaFieldConfigurationProps extends OntodiaFieldConfigurationConfig {
  readonly children: ReactNode & object;
}

export class OntodiaFieldConfiguration extends Component<OntodiaFieldConfigurationProps, {}> {
  render(): null {
    return null;
  }
}

export async function extractFieldConfiguration(
  props: OntodiaFieldConfigurationProps | undefined,
  ct: CancellationToken
): Promise<FieldConfiguration> {
  const collectedMetadata = new Map<ElementTypeIri, EntityMetadata>();
  const collectedInputOverrides: Forms.InputOverride[] = [];

  let fieldByIri = Immutable.Map<string, Forms.FieldDefinition>();
  const datatypeFields = new Map<string, Forms.FieldDefinition>();

  if (!props) {
    return {
      authoringMode: false,
      enforceConstraints: false,
      metadata: undefined,
      persistence: undefined,
      allFields: [],
      datatypeFields,
      inputOverrides: collectedInputOverrides,
    };
  }

  const {
    typeIri,
    defaultLabelIri,
    defaultImageIri,
    defaultSubjectTemplate,
    allowRequestFields = true,
    fields: passedFields = [],
    forceDatatypeFields = [],
    enforceConstraints = false,
  } = props;
  if (typeof typeIri !== 'string') {
    throw new Error(`Missing 'typeIri' property for ontodia-field-configuration`);
  }

  type ConfigurationStep = {
    props: object;
    type: FieldConfigurationItem;
  };
  const steps = Children.toArray(props.children).filter(
    (child): child is ConfigurationStep => isValidChild(child) && isConfigurationItem(child.type)
  );

  const requestedFields: Rdf.Iri[] = [];
  const requestedFieldSet = new Set<string>();
  for (const field of passedFields) {
    // do not request fields that were passed manually in the props
    requestedFieldSet.add(field.iri);
  }

  if (!requestedFieldSet.has(typeIri)) {
    requestedFieldSet.add(typeIri);
    requestedFields.push(Rdf.iri(typeIri));
  }

  // find all required fields from each configuration item
  for (const step of steps) {
    if (step.type.getRequiredFields) {
      for (const fieldIri of await step.type.getRequiredFields(step.props, ct)) {
        if (requestedFieldSet.has(fieldIri.value)) {
          continue;
        }
        requestedFieldSet.add(fieldIri.value);
        requestedFields.push(fieldIri);
      }
    }
  }

  let allFields = passedFields;
  if (requestedFields.length > 0) {
    if (!allowRequestFields) {
      throw new Error(
        'Fetching following fields is disallowed by configuration:\n' +
          requestedFields.map((iri) => iri.toString()).join(',\n')
      );
    }
    const fetchedFields = await observableToCancellablePromise(
      FieldService.getGeneratedFieldDefinitions(requestedFields),
      ct
    );
    allFields = allFields.concat(fetchedFields);
  }

  fieldByIri = Immutable.Map(
    allFields.map((rawField) => {
      let field = Forms.normalizeFieldDefinition(rawField);
      // replace field ID by field IRI
      field = { ...field, id: field.iri };
      return [field.iri, field] as [string, Forms.FieldDefinition];
    })
  );

  for (const datatypeFieldIri of forceDatatypeFields) {
    datatypeFields.set(datatypeFieldIri, fieldByIri.get(datatypeFieldIri));
  }

  const context: FieldConfigurationContext = {
    fieldByIri,
    typeIri,
    defaultLabelIri,
    defaultImageIri,
    defaultSubjectTemplate,
    datatypeFields: forceDatatypeFields,
    cancellationToken: ct,
    collectedMetadata,
    collectedInputOverrides,
  };

  // execute configuration steps from each configuration item
  for (const step of steps) {
    await step.type.configure(step.props, context);
  }

  const finalConfig: FieldConfiguration = {
    authoringMode: props ? Boolean(props.authoringMode) : false,
    enforceConstraints,
    metadata: collectedMetadata.size > 0 ? collectedMetadata : undefined,
    persistence: props ? props.persistence : undefined,
    allFields: fieldByIri.valueSeq().toArray(),
    datatypeFields,
    inputOverrides: collectedInputOverrides,
  };
  if (props.debug) {
    console.log('Ontodia field configuration:', finalConfig);
  }
  return finalConfig;
}

function isConfigurationItem(type: unknown): type is FieldConfigurationItem {
  if (typeof type !== 'function') {
    return false;
  }
  return typeof (type as Partial<FieldConfigurationItem>).configure === 'function';
}

export default OntodiaFieldConfiguration;
