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
import * as uuid from 'uuid';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { getLabel } from 'platform/api/services/resource-label';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue } from '../FieldValues';

import {
  ResourceEditorFormProps,
  performFormPostAction,
  getPostActionUrlQueryParams,
} from '../ResourceEditorFormConfig';
import { elementHasInputType, InputKind } from './InputCommpons';
import { ModuleRegistry } from 'platform/api/module-loader';
import { TemplateContext } from 'platform/api/components';
import { CapturedContext } from 'platform/api/services/template';
import {UtilsFunctionRegistry,  callFunctionsAndBuildJson } from '../UtilsFunctionRegistry';

export interface NestedModalFormProps {
  subject?: Rdf.Iri
  title?: string
  definition: FieldDefinition;
  onSubmit: (value: AtomicValue) => void;
  onCancel: () => void;
  children: ReactElement<ResourceEditorFormProps> | undefined;
  parent: React.RefObject<HTMLElement>;
  modalId?: string,
  /* specify parent iri */
  parentIri?: string,
  /* An array of function registry keys to be called to obtain 
     specific values to be passed forward to the nested modal */
  passValuesFor?: string[]
}

export class NestedModalForm extends Component<NestedModalFormProps, {}> {
  private readonly cancellation = new Cancellation();

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  
  render() {
    const { definition, title, onSubmit, onCancel, children, subject, parent, modalId, parentIri, passValuesFor } = this.props;
    
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

    const modalTitle = title ?? `${getPreferredLabel(definition.label) || definition.id || 'Value'}`
    return (
      <Modal
        id={modalId}
        show={true}
        onHide={onCancel}
        container={
          // restrict nested form backdrop to semantic form that is closest ancestor of parent input element
          parent.current.closest('.semantic-form')
        }
      >
        <Modal.Header closeButton={true}>
          <Modal.Title>{
            <span>{(subject ? '' : 'New ') + `${modalTitle}`}</span>
          }</Modal.Title>
        </Modal.Header>
        <Modal.Body>{cloneElement(children, propsOverride)}</Modal.Body>
      </Modal>
    );
  }
}

export async function tryExtractNestedForm(
  children: ReactNode, templateContext: TemplateContext, nestedFormTemplate?: string,  
  parentIri?: Rdf.Iri,
  passValuesFor?: string[]
): Promise<ReactElement<ResourceEditorFormProps> | undefined> {
  if (React.Children.count(children) === 1) {
    return Promise.resolve(getNestedForm(children));
  } else if (nestedFormTemplate) {
    const template = await templateContext.templateScope.compile(nestedFormTemplate);
    // see TemplateItem#compileTemplate, here we need to do the same to make sure that we propagate the context properly
    const capturer = CapturedContext.inheritAndCapture(templateContext.templateDataContext);
    // Always create a unique viewId
    const baseData = { viewId: uuid.v4() };
    let templateData = baseData;
   
    if (passValuesFor && passValuesFor.length > 0 && parentIri) {
      console.log("inin");
      const meta = await callFunctionsAndBuildJson(
        passValuesFor,
        UtilsFunctionRegistry,
        parentIri
      );
      templateData = { ...baseData, ...meta,...{parentIri: parentIri.toString()} };
    }

    const parsedTemplate = await ModuleRegistry.parseHtmlToReact(
      template(templateData, {
        capturer,
        parentContext: templateContext.templateDataContext
      })
    );

    return getNestedForm(parsedTemplate);
  } else {
    return Promise.resolve(undefined);
  }
}

function getNestedForm(children: ReactNode) {
  if (Children.count(children) !== 1) {
    return undefined;
  }
  const child = Children.only(children);
  return elementHasInputType(child, InputKind.SemanticForm) ? child as ReactElement<ResourceEditorFormProps> : undefined;
}
