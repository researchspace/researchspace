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
import * as React from 'react';
import { Component, Children, ReactElement, ReactNode, cloneElement } from 'react';
import { Modal } from 'react-bootstrap';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { getLabel } from 'platform/api/services/resource-label';

import { componentHasType } from 'platform/components/utils';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue } from '../FieldValues';
import {
  ResourceEditorForm,
  ResourceEditorFormProps,
  performFormPostAction,
  getPostActionUrlQueryParams,
} from '../ResourceEditorForm';
import { trigger } from 'platform/api/events';
import * as FormEvents from 'platform/components/forms/FormEvents';

export interface NestedModalFormProps {
  subject?: Rdf.Iri
  definition: FieldDefinition;
  onSubmit: (value: AtomicValue) => void;
  onCancel: () => void;
  children: ReactElement<ResourceEditorFormProps> | undefined;
}

export class NestedModalForm extends Component<NestedModalFormProps, {}> {
  private readonly cancellation = new Cancellation();

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const { definition, onSubmit, onCancel, children, subject } = this.props;
    const propsOverride: Partial<ResourceEditorFormProps> = {
      id: children.props.id,
      browserPersistence: false,
      subject: subject || Rdf.iri(''),
      postAction: (subject: Rdf.Iri) => {
        if (children.props.postAction) {
          performFormPostAction({
            postAction: children.props.postAction,
            subject: subject,
            eventProps: { isNewSubject: true, sourceId: children.props.id },
            queryParams: getPostActionUrlQueryParams(children.props),
          });
        }
        this.cancellation.map(getLabel(subject)).observe({
          value: (label) => {
            onSubmit(FieldValue.fromLabeled({ value: subject, label }));
          },
        });
      },
    };
    return (
      <Modal bsSize="large" show={true} onHide={onCancel}>
        <Modal.Header closeButton={true}>
          <Modal.Title>{
            (subject ? `Create New ` : 'Edit ') +
                        `${getPreferredLabel(definition.label) || definition.id || 'Value'}`
          }</Modal.Title>
        </Modal.Header>
        <Modal.Body>{cloneElement(children, propsOverride)}</Modal.Body>
      </Modal>
    );
  }
}

export function tryExtractNestedForm(children: ReactNode): ReactElement<ResourceEditorFormProps> | undefined {
  if (Children.count(children) !== 1) {
    return undefined;
  }
  const child = Children.only(children);
  return componentHasType(child, ResourceEditorForm) ? child : undefined;
}
