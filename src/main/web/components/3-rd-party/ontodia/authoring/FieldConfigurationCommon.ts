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

import { ReactNode } from 'react';
import { ElementTypeIri, CancellationToken } from 'ontodia';

import { Rdf } from 'platform/api/rdf';
import { xsd } from 'platform/api/rdf/vocabularies';

import * as Forms from 'platform/components/forms';

import { FormBasedPersistenceProps } from './FormBasedPersistence';

export interface FieldConfiguration {
  readonly authoringMode: boolean;
  readonly enforceConstraints: boolean;
  readonly metadata: Map<ElementTypeIri, EntityMetadata> | undefined;
  readonly persistence: OntodiaPersistenceMode | undefined;
  readonly allFields: ReadonlyArray<Forms.FieldDefinition>;
  readonly datatypeFields: ReadonlyMap<string, Forms.FieldDefinition>;
  readonly inputOverrides: ReadonlyArray<Forms.InputOverride>;
}

export type OntodiaPersistenceMode = FormBasedPersistenceProps;

export interface FieldConfigurationItem {
  getRequiredFields?(props: any, ct: CancellationToken): Promise<ReadonlyArray<Rdf.Iri>>;
  configure(props: any, context: FieldConfigurationContext): Promise<void>;
}

export interface FieldConfigurationContext {
  readonly fieldByIri: Immutable.Map<string, Forms.FieldDefinition>;
  readonly typeIri: string;
  readonly datatypeFields: ReadonlyArray<string>;
  readonly defaultLabelIri?: string;
  readonly defaultImageIri?: string;
  readonly defaultSubjectTemplate?: string;

  readonly cancellationToken: CancellationToken;
  readonly collectedMetadata: Map<ElementTypeIri, EntityMetadata>;
  readonly collectedInputOverrides: Forms.InputOverride[];
}

export interface EntityMetadata {
  readonly entityType: ElementTypeIri;
  readonly fields: ReadonlyArray<Forms.FieldDefinition>;
  readonly fieldByIri: Immutable.Map<string, Forms.FieldDefinition>;
  readonly datatypeFields: Immutable.Set<string>;
  readonly typeField: Forms.FieldDefinition;
  readonly labelField: Forms.FieldDefinition;
  readonly imageField?: Forms.FieldDefinition;
  readonly newSubjectTemplate: string;
  readonly formChildren: ReactNode;
}

export function assertFieldConfigurationItem(item: FieldConfigurationItem) {
  if (typeof item.configure !== 'function') {
    throw new Error('Invalid field configuration item');
  }
}

export function isObjectProperty(field: Forms.FieldDefinition, metadata: EntityMetadata) {
  const isImageField = metadata.imageField && metadata.imageField.iri === field.iri;
  const isForceField = metadata.datatypeFields.has(field.iri);
  return !isImageField && !isForceField && (!field.xsdDatatype || xsd.anyURI.equals(field.xsdDatatype));
}
