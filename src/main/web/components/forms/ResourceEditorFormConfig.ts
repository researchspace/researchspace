/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
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
import { ReactNode } from 'react';

import { Rdf } from 'platform/api/rdf';
import { navigateToResource, refresh } from 'platform/api/navigation';
import { trigger } from 'platform/api/events';

import { LdpPersistenceConfig } from './persistence/LdpPersistence';
import { SparqlPersistenceConfig } from './persistence/SparqlPersistence';
import { RawSparqlPersistenceConfig } from './persistence/RawSparqlPersistence';
import { FieldDefinitionProp } from './FieldDefinition';
import { TriplestorePersistence } from './persistence/TriplestorePersistence';
import { CompositeValue } from './FieldValues';
import * as FormEvents from './FormEvents';

export type PostAction = 'none' | 'reload' | 'redirect' | 'event' | string | ((subject: Rdf.Iri) => void);

/**
 * @see getPostActionUrlQueryParams().
 */
export interface ResourceEditorFormProps {
  fields: ReadonlyArray<FieldDefinitionProp>;
  /**
   * IRI of instance described by the form.
   * This value will be passed down to all queries as $subject.
   */
  subject?: Rdf.Iri | string;
  /**
   * URI template to customize subject generation.
   *
   * The template allows to reference form values, e.g if there is field A that uniquely
   * identify record, we can specify subject template as `http://collection.bm.com/records/{{A}}`,
   * where A will be substituted with value of the field A.
   *
   * `{{UUID}}` placeholder allows to substitute a random UUID.
   */
  newSubjectTemplate?: string;
  initializeModel?: (model: CompositeValue) => CompositeValue;
  persistence?: TriplestorePersistenceConfig['type'] | TriplestorePersistenceConfig | TriplestorePersistence;
  children?: ReactNode;
  /**
   * Whether intermediate user inputs to the form should
   * be persisted on client-side persistence layer (such as local storage, cookies etc).
   * If undefined or false, the form will neither try persist change
   * nor try to recover on initalization form states from the persistence layer.
   */
  browserPersistence?: boolean;
  /**
   * Optional identifier to be used to recover cached
   * form states from the local storage. By default the current {@link ResourceContext} will
   * be used as identifier. However, if several forms being embedded on a page,
   * unique and static form idenfier need to be assigned manually.
   */
  formId?: string;
  /**
   * Optional post-action to be performed after saving the form.
   * Can be either "none", "reload" or "redirect" (redirects to the subject of the form)
   * or any IRI string to which the form will redirect.
   */
  postAction?: PostAction;
  debug?: boolean;
  /**
   * Used as source id for emitted events.
   */
  id?: string;
  /**
   * `true` if persisted component should be added to the default set of the current user
   *
   * @default false
   */
  addToDefaultSet?: boolean;
}

export type TriplestorePersistenceConfig = LdpPersistenceConfig | SparqlPersistenceConfig | RawSparqlPersistenceConfig;


const POST_ACTION_QUERY_PARAM_PREFIX = 'urlqueryparam';

/**
 * Extracts user-defined `urlqueryparam-<KEY>` query params from
 * a form configuration to provide them on post action navigation.
 */
export function getPostActionUrlQueryParams(props: ResourceEditorFormProps) {
  const params: { [paramKey: string]: string } = {};

  for (const key in props) {
    if (Object.hasOwnProperty.call(props, key)) {
      if (key.indexOf(POST_ACTION_QUERY_PARAM_PREFIX) === 0) {
        const queryKey = key.substring(POST_ACTION_QUERY_PARAM_PREFIX.length).toLowerCase();
        params[queryKey] = props[key];
      }
    }
  }

  return params;
}

/**
 * Performs either a reload (default) or a redirect after the form has been submited
 * and the data been saved. Alsow can trigger the events:
 * - FormEvents.FormResourceCreated
 * - FormEvents.FormResourceUpdate
 * if the action is 'event'
 * if the action is 'none' nothing happen
 */
export function performFormPostAction(parameters: {
  postAction: PostAction;
  subject: Rdf.Iri;
  eventProps: { isNewSubject: boolean; isRemovedSubject?: boolean; sourceId: string };
  queryParams?: { [paramKey: string]: string };
}) {
  const { postAction = 'reload', subject, eventProps, queryParams } = parameters;
  if (postAction === 'none') {
    return;
  }

  if (postAction === 'reload') {
    refresh();
  } else if (postAction === 'redirect') {
    navigateToResource(subject, queryParams).onValue((v) => v);
  } else if (postAction === 'event') {
    if (!eventProps.sourceId) {
      throw new Error("If you want use postAction 'event', you have to define the id as well.");
    }
    if (eventProps.isNewSubject) {
      trigger({
        eventType: FormEvents.FormResourceCreated,
        source: eventProps.sourceId,
        data: { iri: subject.value },
      });
    } else if (eventProps.isRemovedSubject) {
      trigger({
        eventType: FormEvents.FormResourceRemoved,
        source: eventProps.sourceId,
        data: { iri: subject.value },
      });
    } else {
      trigger({
        eventType: FormEvents.FormResourceUpdated,
        source: eventProps.sourceId,
        data: { iri: subject.value },
      });
    }
    return;
  } else if (typeof postAction === 'function') {
    postAction(subject);
  } else {
    navigateToResource(Rdf.iri(postAction), queryParams).onValue((v) => v);
  }
}

