/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

import * as React from 'react';

import { Component, ComponentProps } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import * as Forms from 'platform/components/forms';
import { componentHasType } from 'platform/components/utils';

import { AnnotationBodyType } from '../model/ComponentModel';

export interface TextAnnotationTypeOptions {
  /**
   * RDF type of the described annotation body.
   * (Must be an IRI string value.)
   */
  rdfType: string;

  /**
   * Annotation type label to show to user.
   */
  label: string;

  /**
   * Annotation accent color to highlight annotations in the text editor and the sidebar.
   */
  color?: string;

  /**
   * Annotatio type icon URL to display in tab headers, etc.
   */
  iconUrl?: string;

  /**
   * Template to visualize annotation body.
   *
   * See `AnnotationTemplateBindings` for template bindings.
   */
  template: string;
}

export interface TextAnnotationTypeProps extends TextAnnotationTypeOptions, ComponentProps {
  /**
   * CompositeInput to edit described annotation body.
   */
  children: React.ReactElement<Forms.CompositeInputProps>;
}

export class TextAnnotationType extends Component<TextAnnotationTypeProps, {}> {
  render() {
    return null;
  }
}

export default TextAnnotationType;

export function extractAnnotationType(child: React.ReactNode): AnnotationBodyType {
  const COMPONENT_TAG = '<rs-text-annotation-type>';
  if (!componentHasType(child, TextAnnotationType)) {
    throw new Error(
      `<rs-text-annotation-workspace> should contain only ${COMPONENT_TAG} children`
    );
  }
  const props = child.props as TextAnnotationTypeProps;
  if (!props.rdfType) {
    throw new Error(
      `<rs-text-annotation-workspace> should contain only ${COMPONENT_TAG} children`
    );
  }

  if (!props.label) {
    throw new Error(`${COMPONENT_TAG} must set "label" attribute`);
  }

  let template = props.template;
  if (!template && props.markupTemplateScope) {
    const partial = props.markupTemplateScope.getPartial('annotation');
    if (partial) {
      template = partial.source;
    }
  }
  if (!template) {
    throw new Error(
      `${COMPONENT_TAG} must set "template" attribute or define <template id="annotation">`
    );
  }

  if (!(typeof props.children === 'object' &&
    componentHasType(props.children, Forms.CompositeInput)
  )) {
    throw new Error(
      `${COMPONENT_TAG} must have a single <semantic-form-composite-input> as child`
    );
  }

  return {
    iri: Rdf.iri(props.rdfType),
    label: props.label,
    color: props.color,
    iconUrl: props.iconUrl,
    template,
    templateScope: props.markupTemplateScope,
    input: props.children,
  };
}
