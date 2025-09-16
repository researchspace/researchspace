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

export * from './FieldDefinition';
export * from './FieldMapping';
export * from './FieldValues';
export { readyToSubmit, fieldInitialState, generateSubjectByTemplate, wasIriGeneratedByTemplate } from './FormModel';
export * from './ResourceEditorForm';
export * from './ResourceEditorFormConfig';
export * from './SemanticForm';
export { queryValues } from './QueryValues';
export { type ValuePatch, applyValuePatch, computeValuePatch } from './Serialization';

export * from './inputs';
export * from './static';

export {
  type GenerateFormFromFieldsParams,
  type InputOverride,
  type InputOverrideTarget,
  type FieldInputElement,
  generateFormFromFields,
} from './auto-form/FormGenerator';
export * from './persistence/PersistenceUtils';
export * from './persistence/TriplestorePersistence';
export { LdpPersistence, type LdpPersistenceConfig } from './persistence/LdpPersistence';
export { RawSparqlPersistence, type RawSparqlPersistenceConfig } from './persistence/RawSparqlPersistence';
