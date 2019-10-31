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

import * as classnames from 'classnames';
import * as Kefir from 'kefir';
import * as React from 'react';
import { Button } from 'react-bootstrap';
import * as Immutable from 'immutable';
import * as Slate from 'slate';
import {
  Editor, RenderNodeProps, RenderMarkProps, RenderAttributes, findDOMRange
} from 'slate-react';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';

import { TemplateItem } from 'platform/components/ui/template';
import { TargetedPopover } from 'platform/components/ui/TargetedPopover';

import * as Schema from '../model/AnnotationSchema';
import {
  TextEditorState, TextEditorStateProps, AnnotationBodyType, TextAnnotationTemplateBindings,
  WorkspacePermissions, WorkspaceHandlers
} from '../model/ComponentModel';
import {
  AnnotationData, NodeData, ANNOTATION_POINT_TYPE, ANNOTATION_RANGE_TYPE
} from '../model/EditorModel';
import * as EditorModel from '../model/EditorModel';
import { BLOCK_TAGS, INLINE_TAGS, MARK_TAGS, SLATE_HTML } from '../model/TextSerialization';

import * as styles from './TextAnnotationEditor.scss';

export interface TextAnnotationEditorProps {
  className?: string;
  editorState: TextEditorState;
  onEditorStateChange: (newState: TextEditorState) => void;
  annotationTypes: ReadonlyMap<string, AnnotationBodyType>;
  tooltipTemplate?: string;
  permissions: WorkspacePermissions;
  handlers: WorkspaceHandlers;
}

interface State {
  selectionTopOffset?: number;
}

const EMPTY_SET = new Set<string>();

export class TextAnnotationEditor extends Component<TextAnnotationEditorProps, State> {
  editor: Editor;

  private debounceTooltip: Cancellation = new Cancellation();
  private sideline: HTMLElement | null | undefined;

  constructor(props: TextAnnotationEditorProps, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    const {editorState, onEditorStateChange} = this.props;
    onEditorStateChange(EditorState.set(editorState, {owner: this}));
  }

  onChange = (change: { operations: Immutable.List<Slate.Operation>, value: Slate.Value }) => {
    const {editorState, onEditorStateChange} = this.props;
    const nextState = editorState.set({value: change.value});
    onEditorStateChange(nextState);
  }

  render() {
    const {className, editorState, permissions} = this.props;
    const {selectionTopOffset} = this.state;
    return (
      <div className={classnames(styles.component, className)}>
        <div className={styles.textEditor}>
          <Editor
            ref={this.onEditorMount}
            spellCheck={false}
            value={editorState.value}
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
            onClick={this.onTextClick}
            onDragStart={this.ignoreIfReadonly}
            onCut={this.ignoreIfReadonly}
            onPaste={this.ignoreIfReadonly}
            onSelect={this.onSelect}
            renderNode={this.renderNode}
            renderMark={this.renderMark}
          />
          <div className={styles.addAnnotationSideline} ref={this.onSidelineMount}>
            {(permissions.create && selectionTopOffset > 0) ? (
              <Button className={styles.addAnnotationButton}
                style={{top: selectionTopOffset}}
                title='Add annotation'
                onClick={this.onAddAnnotationClick}>
                <span className={styles.addAnnotationIcon} />
              </Button>
            ) : null}
          </div>
        </div>
        {this.renderTooltip()}
      </div>
    );
  }

  private onSidelineMount = (sideline: HTMLElement | null) => {
    this.sideline = sideline;
  }

  private renderTooltip() {
    const {editorState, tooltipTemplate, annotationTypes, permissions} = this.props;
    const {tooltip} = editorState as EditorState;
    if (!(tooltip && tooltipTemplate)) {
      return null;
    }
    const anno = tooltip.annotations.length > 0 ? tooltip.annotations[0] : undefined;
    const bodyType = anno.bodyType ? annotationTypes.get(anno.bodyType.value) : undefined;
    return (
      <div style={{position: 'fixed', left: 0, top: 0}}>
        <TargetedPopover key={`${tooltip.left};${tooltip.top}`}
          id='text-annotation-editor-tooltip'
          hideTimeout={500}
          targetLeft={tooltip.left}
          targetTop={tooltip.top}
          popoverSide='top'
          arrowAlignment='center'
          onHide={tooltip.hovering ? undefined : this.onTooltipHide}>
          <TemplateItem
            componentProps={{onClick: this.onTooltipClick}}
            template={{
              source: tooltipTemplate,
              options: TextAnnotationTemplateBindings.compute(anno, bodyType, permissions),
            }}
          />
        </TargetedPopover>
      </div>
    );
  }

  private onKeyDown = (event: Event, editor: Slate.Editor, next: () => void) => {
    const keyboarEvent = event as KeyboardEvent;
    const isCopyKeyCombination = (
      (keyboarEvent.ctrlKey || keyboarEvent.metaKey) &&
      keyboarEvent.keyCode === 67 /* "C" key */
    );
    if (!isCopyKeyCombination) {
      // ignore event
      event.preventDefault();
      return true;
    }
  }

  private onTextClick = (event: Event, editor: Slate.Editor, next: () => void) => {
    // click events on annotated text will be handled before and won't propagate here
    this.props.handlers.focusAnnotation(undefined);
  }

  private ignoreIfReadonly = (event: Event, editor: Slate.Editor, next: () => void) => {
    // ignore event
    event.preventDefault();
    return true;
  }

  private onEditorMount = (editor: Editor) => {
    this.editor = editor;
  }

  private renderNode = (props: RenderNodeProps, editor: Slate.Editor, next: () => any) => {
    const {node, attributes, children} = props;
    if (BLOCK_TAGS[node.type] || INLINE_TAGS[node.type]) {
      return React.createElement(
        node.type,
        {...NodeData.get(node.data, 'attributes'), ...attributes},
        children
      );
    } else if (node.object === 'inline' && node.type === AnnotationInline.TAG_NAME) {
      return (
        <AnnotationInline
          inline={node}
          attributes={attributes}
          getAnnotationType={this.getAnnotationType}
          onClick={this.onClickAnnotation}
          onStartHovering={this.onStartHoveringAnnotation}
          onStopHovering={this.onStopHoveringAnnotation}>
          {children}
        </AnnotationInline>
      );
    } else {
      return next();
    }
  }

  private renderMark = (props: RenderMarkProps, editor: Slate.Editor, next: () => any) => {
    const {mark, marks, attributes, children} = props;
    if (MARK_TAGS[mark.type]) {
      return React.createElement(
        mark.type,
        {...NodeData.get(mark.data, 'attributes'), ...attributes},
        children
      );
    } else if (mark.type === AnnotationMark.TAG_NAME) {
      return (
        <AnnotationMark
          mark={mark}
          marks={marks}
          attributes={attributes}
          getAnnotationType={this.getAnnotationType}
          onClick={this.onClickAnnotation}
          onStartHovering={this.onStartHoveringAnnotation}
          onStopHovering={this.onStopHoveringAnnotation}>
          {children}
        </AnnotationMark>
      );
    } else {
      return next();
    }
  }

  private onSelect = (event: Event, editor: Slate.Editor, next: () => void) => {
    next();

    const state = this.props.editorState as EditorState;

    if (!editor.value.selection.equals(state.markedSelection)) {
      this.debounceTooltip.cancelAll();
      this.debounceTooltip = new Cancellation();
      this.debounceTooltip.map(Kefir.later(0, true)).observe({
        value: () => {
          this.updateSelectionOffset(editor);
        }
      });
    }
  }

  private updateSelectionOffset(editor: Slate.Editor) {
    if (!this.sideline) {
      return;
    }
    const {start, end} = editor.value.selection;
    const range = Slate.Range.create({anchor: start, focus: end});
    // Return type in typings is wrong and should be Range, not Slate.Range:
    // https://docs.slatejs.org/slate-react/utils
    const domRange = findDOMRange(range) as any as Range;
    const rect = domRange.getBoundingClientRect();
    const selectionTop = rect.top + rect.height / 2;
    const sidelineTop = this.sideline.getBoundingClientRect().top;
    const selectionTopOffset = selectionTop - sidelineTop;
    this.setState({selectionTopOffset});
  }

  private onAddAnnotationClick = () => {
    const {handlers: {beginAddingAnnotation}} = this.props;
    beginAddingAnnotation();
    this.setState({selectionTopOffset: 0});
  }

  private getAnnotationType = (bodyType: Rdf.Iri | undefined): AnnotationBodyType | undefined => {
    if (!bodyType) {
      return undefined;
    }
    return this.props.annotationTypes.get(bodyType.value);
  }

  private onClickAnnotation = (data: AnnotationData) => {
    this.props.handlers.focusAnnotation(AnnotationData.get(data, 'iri'));
  }

  private onStartHoveringAnnotation = (hoverState: HoverState) => {
    const {editorState, onEditorStateChange, handlers} = this.props;

    const hovered = new Set<string>(hoverState.iris.map(iri => iri.value));
    handlers.highlightAnnotations(hovered);

    const annotations = editorState.annotations.filter(anno => hovered.has(anno.iri.value));
    const highlightedDoc = EditorModel.highlightAnnotations(
      editorState.value.document, hovered
    );
    const nextState = EditorState.set(editorState, {
      value: EditorModel.setValueProps(editorState.value, {document: highlightedDoc}),
      tooltip: {...hoverState, annotations},
    });
    onEditorStateChange(nextState);
  }

  private onStopHoveringAnnotation = () => {
    const {editorState, onEditorStateChange, handlers} = this.props;

    handlers.highlightAnnotations(EMPTY_SET);
    const unhighlightedDoc = EditorModel.highlightAnnotations(
      editorState.value.document, EMPTY_SET
    );
    const previousState = editorState as EditorState;
    if (previousState.tooltip) {
      const nextState = EditorState.set(previousState, {
        value: EditorModel.setValueProps(editorState.value, {document: unhighlightedDoc}),
        tooltip: {...previousState.tooltip, hovering: false},
      });
      onEditorStateChange(nextState);
    }
  }

  private onTooltipHide = () => {
    const {editorState, onEditorStateChange} = this.props;
    const nextState = EditorState.set(editorState, {tooltip: undefined});
    onEditorStateChange(nextState);
  }

  private onTooltipClick = (e: React.MouseEvent<HTMLElement>) => {
    const {handlers} = this.props;
    const target = e.target;
    if (target instanceof HTMLButtonElement) {
      const iri = target.getAttribute('data-annotation');
      if (iri) {
        if (target.name === 'edit') {
          handlers.beginEditingAnnotation(Rdf.iri(iri));
        } else if (target.name === 'delete') {
          handlers.deleteAnnotation(Rdf.iri(iri));
        }
      }
    }
  }
}

interface AdditionalEditorState {
  readonly owner: TextAnnotationEditor | undefined;
  readonly markedSelection: Slate.Selection | undefined;
  readonly tooltip: TooltipState | undefined;
}

interface HoverState {
  readonly left: number;
  readonly top: number;
  readonly hovering: boolean;
  readonly iris: ReadonlyArray<Rdf.Iri>;
}

interface TooltipState extends HoverState {
  readonly annotations: ReadonlyArray<Schema.Annotation>;
}

class EditorState implements TextEditorState, AdditionalEditorState {
  readonly value: Slate.Value;
  readonly annotations: ReadonlyArray<Schema.Annotation>;
  readonly owner: TextAnnotationEditor | undefined;
  readonly markedSelection: Slate.Selection | undefined;
  readonly tooltip: TooltipState | undefined;

  private constructor(props: TextEditorStateProps & Partial<AdditionalEditorState>) {
    this.value = props.value;
    this.annotations = props.annotations;
    this.owner = props.owner;
    this.markedSelection = props.markedSelection;
    this.tooltip = props.tooltip;
  }

  static create(props: TextEditorStateProps & Partial<AdditionalEditorState>) {
    return new EditorState(props);
  }

  static set(
    base: TextEditorStateProps & Partial<AdditionalEditorState>,
    override: Partial<TextEditorStateProps> & Partial<AdditionalEditorState>
  ): EditorState {
    const baseProps: TextEditorStateProps & Partial<AdditionalEditorState> = {
      value: base.value,
      annotations: base.annotations,
      owner: base.owner,
      markedSelection: base.markedSelection,
      tooltip: base.tooltip,
    };
    return new EditorState({...baseProps, ...override});
  }

  set(props: Partial<TextEditorStateProps>): TextEditorState {
    return EditorState.set(this, props);
  }

  addAnnotation(annotationIri: Rdf.Iri): EditorState {
    const {document, selection} = this.value;
    const {start, end} = selection;

    let nextDocument: Slate.Document;
    let selector: Schema.AnnotationSelector;
    let selectedText: string | undefined;

    if (selection.isExpanded) {
      const nodeKeyToPath = document.getKeysToPathsTable() as { [key: string]: Slate.Path };
      const range = Slate.Range.create({
        anchor: selection.start,
        focus: selection.end,
      });
      nextDocument = EditorModel.addMarksAtRange(
        document,
        nodeKeyToPath,
        range,
        ANNOTATION_RANGE_TYPE,
        AnnotationData.create({iri: annotationIri, bodyType: undefined})
      );
      selector = {
        type: 'range',
        start: {
          type: 'point',
          xPath: findXPathAt(document, start.path),
          offset: start.offset,
        },
        end: {
          type: 'point',
          xPath: findXPathAt(document, end.path),
          offset: end.offset,
        },
      };
      selectedText = EditorModel.extractTextFragment(document, range);
    } else {
      nextDocument = EditorModel.insertInlineAtPoint(
        document,
        selection.start,
        ANNOTATION_POINT_TYPE,
        AnnotationData.create({iri: annotationIri, bodyType: undefined})
      );
      selector = {
        type: 'point',
        xPath: findXPathAt(document, start.path),
        offset: start.offset,
      };
    }

    const annotation: Schema.Annotation = {iri: annotationIri, selector, selectedText};
    const annotations = EditorModel.sortAnnotationsByFirstOccurence(
      nextDocument, [...this.annotations, annotation]
    );

    return EditorState.set(this, {
      value: EditorModel.setValueProps(this.value, {
        document: nextDocument,
      }),
      annotations,
    });
  }

  updateAnnotation(
    target: Rdf.Iri,
    change: (anno: Schema.Annotation) => Schema.Annotation
  ): EditorState {
    let changed: Schema.Annotation | undefined;
    const annotations = this.annotations.map((anno): Schema.Annotation => {
      if (anno.iri.equals(target)) {
        changed = change(anno);
        return changed;
      }
      return anno;
    });
    if (!changed) {
      return this;
    }
    const value = EditorModel.setValueProps(this.value, {
      document: EditorModel.updateAnnotation(this.value.document, target, changed),
    });
    return EditorState.set(this, {value, annotations});
  }

  deleteAnnotation(annotationIri: Rdf.Iri): EditorState {
    if (this.annotations.find(anno => anno.iri.equals(annotationIri))) {
      const value = EditorModel.setValueProps(this.value, {
        document: EditorModel.deleteAnnotation(this.value.document, annotationIri),
      });
      const annotations = this.annotations
        .filter(anno => !anno.iri.equals(annotationIri));
      return EditorState.set(this, {value, annotations, tooltip: undefined});
    }
    return this;
  }
}

function findXPathAt(document: Slate.Document, path: Slate.Path) {
  const parentNode = document.getAncestors(path).last();
  if (!(parentNode.object === 'block' || parentNode.object === 'inline')) {
    throw new Error(`Unexpected parent node type: ${parentNode.object}`);
  }
  const xpath = NodeData.get(parentNode.data, 'xpath');
  if (!xpath) {
    throw new Error(`Failed to find XPath at selected node`);
  }
  return xpath;
}

export function makeIntitialEditorState(params: {
  sourceHtml: string;
  annotations: ReadonlyArray<Schema.Annotation>;
}): TextEditorState {
  const rawValue = SLATE_HTML.deserialize(params.sourceHtml);
  let {document} = rawValue;
  document = EditorModel.assignXPaths(document);
  document = EditorModel.mergeInAnnotations(document, params.annotations);
  document = EditorModel.updateAnnotationLevels(document);

  const annotations = EditorModel.sortAnnotationsByFirstOccurence(document, params.annotations);

  return EditorState.create({
    value: Slate.Value.create({document}),
    annotations,
  });
}

interface AnnotationMarkProps {
  mark: Slate.Mark;
  marks: Immutable.Set<Slate.Mark>;
  attributes: RenderAttributes;
  getAnnotationType: (bodyType: Rdf.Iri | undefined) => AnnotationBodyType | undefined;
  onClick: (data: AnnotationData) => void;
  onStartHovering: (tooltip: HoverState) => void;
  onStopHovering: () => void;
}

class AnnotationMark extends React.Component<AnnotationMarkProps, {}> {
  static readonly TAG_NAME = 'rs-annotation-range';

  render() {
    const {mark, children, attributes, getAnnotationType} = this.props;
    const {iri, bodyType, level, highlighted} = AnnotationData.asProps(mark.data);
    const type = getAnnotationType(bodyType);
    const BORDER_OFFSET = 3;
    return (
      <span {...attributes}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        style={{
          paddingBottom: 1 + (typeof level === 'number' ? level : 0) * BORDER_OFFSET,
          borderBottom: '2px solid',
          borderColor: TextAnnotationTemplateBindings.getAccentColor(type),
          backgroundColor: highlighted
            ? TextAnnotationTemplateBindings.getAccentColor(type, 0.3) : undefined,
        }}>
        {children}
      </span>
    );
  }

  private onClick = (e: React.MouseEvent<{}>) => {
    // prevent event bubbling to handle click on non-annotated text
    e.stopPropagation();
    this.props.onClick(this.props.mark.data);
  }

  private onMouseEnter = (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    this.props.onStartHovering({
      left: (rect.left + rect.right) / 2,
      top: rect.top,
      hovering: true,
      iris: this.props.marks
        .filter(mark => mark.type === ANNOTATION_RANGE_TYPE)
        .map(mark => AnnotationData.get(mark.data, 'iri'))
        .toArray()
    });
  }

  private onMouseLeave = () => {
    this.props.onStopHovering();
  }
}

interface AnnotationInlineProps {
  inline: Slate.Inline;
  attributes: RenderAttributes;
  getAnnotationType: (bodyType: Rdf.Iri | undefined) => AnnotationBodyType | undefined;
  onClick: (data: AnnotationData) => void;
  onStartHovering: (tooltip: HoverState) => void;
  onStopHovering: () => void;
}

class AnnotationInline extends React.Component<AnnotationInlineProps, {}> {
  static readonly TAG_NAME = 'rs-annotation-point';

  render() {
    const {inline, children, attributes, getAnnotationType} = this.props;
    const {iri, highlighted, bodyType} = AnnotationData.asProps(inline.data);
    const type = getAnnotationType(bodyType);
    const backgroundColor = TextAnnotationTemplateBindings.getAccentColor(
      type, highlighted ? 1 : 0.5
    );
    const className = attributes.className
      ? `${attributes.className} ${styles.pointAnnotation}`
      : styles.pointAnnotation;
    return (
      <span {...attributes}
        className={className}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        style={{backgroundColor}}>
        {children}
      </span>
    );
  }

  private onClick = (e: React.MouseEvent<{}>) => {
    // prevent event bubbling to handle click on non-annotated text
    e.stopPropagation();
    this.props.onClick(this.props.inline.data);
  }

  private onMouseEnter = (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    this.props.onStartHovering({
      left: (rect.left + rect.right) / 2,
      top: rect.top,
      hovering: true,
      iris: [AnnotationData.get(this.props.inline.data, 'iri')],
    });
  }

  private onMouseLeave = () => {
    this.props.onStopHovering();
  }
}

export default TextAnnotationEditor;
