/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import { Component } from 'react';

import { refresh, navigateToResource } from 'platform/api/navigation';
import { listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { RedirectActionPerform } from './RedirectActionEvents';
import { addNotification } from 'platform/components/ui/notification';

export type RedirectActionType = 'reload' | 'redirect' | string;

export interface RedirectActionProps {
  /**
   * Unique id of the component that can be used by event emitters as a target.
   */
  id: string;

  /**
   * Defines which action will be performed once
   * 'RedirectActionPerform' event will be catched:
   * - 'reload' - the current page will be reloaded with provided query parameters
   * - 'redirect' - page will be redirecte to the IRI specified in the event
   * with provided query parameters
   * - '{..string IRI..} - It's possible to manually specifie resource IRI to redirect.
   */
  action: RedirectActionType;

  /**
   * Defines a set of query parameters which will be passed to the post action navigation.
   */
  queryParams?: {[key: string]: string};
}

/**
 * Component which provides redirect feature.
 * In response to the event (RedirectAction.perform)
 * component perform redirect/reload operation where
 * the IRI of the target resource can be passed via parameters
 * or together with event
 *
 * <semantic-form
 *   id='semantic-form-example'
 *   post-action='event'
 *   new-subject-template='http://example.com/person-name-{{UUID}}'
 *   fields='[
 *     {
 *       "id": "name",
 *       "label": "Name",
 *       "description": "",
 *       "xsdDatatype": "xsd:string",
 *       "minOccurs": "1",
 *       "maxOccurs": "1",
 *       "selectPattern": "SELECT $value WHERE {$subject rdfs:label $value}",
 *       "insertPattern": "INSERT {$subject rdfs:label $value}WHERE{}"
 *     }
 *   ]'>
 *   <semantic-form-text-input for='name'></semantic-form-text-input>
 *   <button name='submit'>Create</button>
 *   <button name='reset'>Reset</button>
 * </semantic-form>
 *
 * <mp-event-proxy id='form-resource-created' on-event-type='Form.ResourceUpdated'
 *   proxy-event-type='RedirectAction.perform' proxy-targets='["redirect-to-resource"]'>
 * </mp-event-proxy>
 *
 * <mp-event-target-redirect
 *   id='redirect-to-resource'
 *   action='redirect'
 * ></mp-event-target-redirect>
 */
export class RedirectAction extends Component<RedirectActionProps> {
  private cancellation = new Cancellation();

  constructor(props, context) {
    super(props, context);
    this.state = {
      refresh: false,
    };
  }

  componentDidMount() {
    const { id, action, queryParams } = this.props;

    this.cancellation.map(
      listen({eventType: RedirectActionPerform, target: id})
    ).observe({
      value: result => {
        if (action === 'redirect' && !result.data.iri) {
          addNotification({
            level: 'error',
            message: 'The component is working in the "redirect" mode' +
              ', but the catched event doesn\'t provide any IRI.',
          });
        }
        performRedirectAction(new Rdf.Iri(result.data.iri), action, queryParams);
      },
      error: () => {
        addNotification({
          level: 'error',
          message: `Something went wrong. Event wasn\'t properly handled.`,
        });
      }
    });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    return null;
  }
}

export default RedirectAction;

function performRedirectAction(
  subject: Rdf.Iri,
  action: RedirectActionType,
  queryParams?: {[key: string]: string}
) {
  if (action === 'reload') {
    refresh();
  } else if (action === 'redirect') {
    navigateToResource(
      subject,
      queryParams
    ).onValue(v => v);
  } else {
    navigateToResource(
      Rdf.iri(action),
      queryParams
    ).onValue(v => v);
  }
}
