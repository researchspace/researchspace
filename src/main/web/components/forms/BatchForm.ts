/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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

import { Component, Children, ReactElement, cloneElement, MouseEvent } from 'react';

import { Cancellation } from 'platform/api/async';
import { trigger, listen } from 'platform/api/events';

import { CompositeValue, FieldValue } from './FieldValues';
import * as FormEvents from './FormEvents';
import { SparqlPersistenceConfig, SparqlPersistence } from './persistence/SparqlPersistence';
import { Rdf } from 'platform/api/rdf';

export interface BatchFormConfig {
  id: string;
  subjects: string[];
  persistence: SparqlPersistenceConfig;
  targetForm: string;
}

export class BatchForm extends Component<BatchFormConfig> {

  private readonly cancellation = new Cancellation();

  componentDidMount() {
    this.cancellation.map(
      listen({
        target: this.props.id,
        eventType: FormEvents.FormCurrentValue,
      })
    ).observe({
      value: (event) => this.batchPersist(event.data.value)
    });
  }

  render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    return cloneElement(child, {onClick: this.onClick});
  }

  private onClick = (_e: MouseEvent<HTMLElement>) => {
    trigger({
      source: this.props.id,
      targets: [this.props.targetForm],
      eventType: FormEvents.FormGetValue,
    });
  }

  private batchPersist = (value: CompositeValue) => {
    // TODO, don't hard-code default repository
    const persistence = new SparqlPersistence(this.props.persistence);
    this.props.subjects.forEach(
      subject => {
        persistence.persist(
          FieldValue.empty,
          CompositeValue.set(value, {subject: Rdf.iri(subject)})
        ).onValue(() => {
          console.log(`${subject} persisted`);
        });
      }
    );
  }
}

export default BatchForm;
