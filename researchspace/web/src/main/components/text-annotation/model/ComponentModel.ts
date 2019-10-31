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

import * as Kefir from 'kefir';
import * as React from 'react';
import * as Slate from 'slate';
import { rgb } from 'd3-color';

import { Rdf } from 'platform/api/rdf';
import * as TemplateService from 'platform/api/services/template';
import * as Forms from 'platform/components/forms';

import * as Schema from './AnnotationSchema';

export interface TextEditorStateProps {
  readonly value: Slate.Value;
  readonly annotations: ReadonlyArray<Schema.Annotation>;
}

export interface TextEditorState extends TextEditorStateProps {
  set(props: Partial<TextEditorStateProps>): TextEditorState;
  addAnnotation(annotationIri: Rdf.Iri): TextEditorState;
  updateAnnotation(
    target: Rdf.Iri,
    change: (anno: Schema.Annotation) => Schema.Annotation
  ): TextEditorState;
  deleteAnnotation(annotationIri: Rdf.Iri): TextEditorState;
}

export interface WorkspacePermissions {
  readonly userIri: Rdf.Iri | undefined;
  readonly create: boolean;
  readonly updateOwner: boolean;
  readonly updateAny: boolean;
  readonly deleteOwner: boolean;
  readonly deleteAny: boolean;
}

export interface WorkspaceHandlers {
  highlightAnnotations: (highlighted: ReadonlySet<string>) => void;
  focusAnnotation: (focused: Rdf.Iri | undefined) => void;
  beginAddingAnnotation: () => void;
  beginEditingAnnotation: (iri: Rdf.Iri) => void;
  cancelEditingAnnotation: () => void;
  persistAnnotation: (
    target: Rdf.Iri,
    bodyType: Rdf.Iri,
    modelWithOnlyBody: Forms.CompositeValue
  ) => Kefir.Property<void>;
  deleteAnnotation: (iri: Rdf.Iri) => Kefir.Property<void>;
}

export interface AnnotationBodyType {
  readonly iri: Rdf.Iri;
  readonly label: string;
  readonly color: string;
  readonly iconUrl: string | undefined;
  readonly template: string;
  readonly templateScope: TemplateService.TemplateScope | undefined;
  readonly input: React.ReactElement<Forms.CompositeInputProps>;
}

export interface TextAnnotationTemplateBindings {
  /** IRI of the annotation */
  iri: Rdf.Iri;
  /** Type of the annotation (if known) */
  type: Rdf.Iri | undefined;
  /** Accent color for annotation type (user-defined or computed from type IRI) */
  color: string;
  /** User-defined icon URL for annotation type */
  iconUrl: string | undefined;
  /** True if allowed to edit the annotation; otherwise false */
  allowEdit: boolean;
  /** True if allowed to delete the annotation; otherwise false */
  allowDelete: boolean;
}
export namespace TextAnnotationTemplateBindings {
  export function getAccentColor(bodyType: AnnotationBodyType | undefined, opacity = 1) {
    const baseColor = bodyType && bodyType.color
      ? bodyType.color
      : Schema.mapIriToColor(bodyType ? bodyType.iri : undefined);
    if (opacity === 1) {
      return baseColor;
    }
    const parsed = rgb(baseColor);
    parsed.opacity = opacity;
    return parsed.toString();
  }

  export function compute(
    anno: Schema.Annotation,
    bodyType: AnnotationBodyType | undefined,
    permissions: WorkspacePermissions
  ): TextAnnotationTemplateBindings {
    const sameAuthor = anno.author && Schema.sameIri(permissions.userIri, anno.author);
    const allowEdit = sameAuthor ? permissions.updateOwner : permissions.updateAny;
    const allowDelete = sameAuthor ? permissions.deleteOwner : permissions.deleteAny;
    return {
      iri: anno.iri,
      type: bodyType ? bodyType.iri : undefined,
      color: getAccentColor(bodyType),
      iconUrl: bodyType ? bodyType.iconUrl : undefined,
      allowEdit,
      allowDelete,
    };
  }
}
