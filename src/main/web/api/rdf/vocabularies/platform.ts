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

import * as Rdf from '../core/Rdf';

namespace platform {
  export const _NAMESPACE = 'http://www.researchspace.org/resource/system/';
  export const _NAMESPACE_VOCABULARY_RESOURCE_TYPE = 'http://www.researchspace.org/resource/system/vocab/resource_type/'
  export const SyntheticJsonDatatype = Rdf.iri(_NAMESPACE + 'syntheticJson');

  // LDP
  export const UserSetContainer = Rdf.iri(_NAMESPACE + 'userSetContainer');
  export const SetContainer = Rdf.iri(_NAMESPACE + 'setContainer');
  export const VisibilityContainer = Rdf.iri(_NAMESPACE + 'visibilityContainer');
  export const FieldDefinitionContainer = Rdf.iri(_NAMESPACE + 'fieldDefinitionContainer');
  export const FormContainer = Rdf.iri(_NAMESPACE + 'formContainer');
  export const OntologyContainer = Rdf.iri(_NAMESPACE + 'ontologyContainer');
  export const OntodiaDiagramContainer = Rdf.iri(_NAMESPACE + 'ontodiaDiagramContainer');
  export const QueryContainer = Rdf.iri(_NAMESPACE + 'queryContainer');
  export const QueryTemplateContainer = Rdf.iri(_NAMESPACE + 'queryTemplateContainer');
  export const PersistedComponentContainer = Rdf.iri(_NAMESPACE + 'persistedComponentContainer');
  export const WorkflowContainer = Rdf.iri(_NAMESPACE + 'workflowContainer');
  export const WorkflowDefinitionContainer = Rdf.iri(_NAMESPACE + 'workflowDefinitionContainer');

  export const RootContainer = Rdf.iri(_NAMESPACE + 'rootContainer');

  export const Set = Rdf.iri(_NAMESPACE_VOCABULARY_RESOURCE_TYPE + 'set');
  export const SetItem = Rdf.iri(_NAMESPACE_VOCABULARY_RESOURCE_TYPE + 'set_item');

  // SET Container can have set-container of resources
  export const containerType = Rdf.iri(_NAMESPACE + 'containerType');
  export const setItem = Rdf.iri(_NAMESPACE + 'setItem');
  export const setItemIndex = Rdf.iri(_NAMESPACE + 'setItemIndex');
  export const clipboardItem = Rdf.iri(_NAMESPACE + 'clipboardItem');
  export const visibilityItem = Rdf.iri(_NAMESPACE + 'visibilityItem');

  /**
   * Specifies visibility of the resource.
   * Possible values are publicVisibility, privateVisibility, sharedVisibility and groupVisibility
   * from bellow.
   */
  export const visibility = Rdf.iri(_NAMESPACE + 'visibility');

  /**
   * Resource can be visible to everyone, including anonymous user.
   */
  export const publicVisibility = Rdf.iri(_NAMESPACE + 'visibilityPublic');

  /**
   * Resource can be visible only to the original author.
   */
  export const privateVisibility = Rdf.iri(_NAMESPACE + 'visibilityPrivate');

  /**
   * Resource can be visible to any logged-in user.
   */
  export const sharedVisibility = Rdf.iri(_NAMESPACE + 'visibilityShared');

  /**
   * Resource can be visible to any groups specified with visibleToGroups predicate.
   */
  export const groupVisibility = Rdf.iri(_NAMESPACE + 'visibilityGroup');

  /**
   * Specifies groups that resource is visible to in case of groupVisibility.
   */
  export const visibleToGroups = Rdf.iri(_NAMESPACE + 'visibleToGroups');

  // property which points to UI state for the saved query
  export const searchState = Rdf.iri(_NAMESPACE + 'searchState');
  export const searchResultCategory = Rdf.iri(_NAMESPACE + 'searchResultCategory');

  /** Resource type for an uplodaded file. */
  export const File = Rdf.iri(_NAMESPACE + 'File');
  export const fileName = Rdf.iri(_NAMESPACE + 'fileName');
  export const mediaType = Rdf.iri(_NAMESPACE + 'mediaType');
  export const fileContext = Rdf.iri(_NAMESPACE + 'fileContext');
}

export default platform;
