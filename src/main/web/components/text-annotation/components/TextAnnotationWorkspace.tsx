/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as React from 'react';

import { Cancellation, requestAsProperty } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { listen, trigger } from 'platform/api/events';
import * as http from 'platform/api/http';
import { Rdf } from 'platform/api/rdf';
import { VocabPlatform } from 'platform/api/rdf/vocabularies';

import { FileManager } from 'platform/api/services/file-manager';
import { Util as SecurityUtil, Permissions } from 'platform/api/services/security';

import * as Forms from 'platform/components/forms';
import { ErrorNotification, addNotification } from 'platform/components/ui/notification';
import { OverlayDialog, getOverlaySystem } from 'platform/components/ui/overlay';
import { Spinner } from 'platform/components/ui/spinner';

import * as Schema from '../model/AnnotationSchema';
import * as EditorModel from '../model/EditorModel';
import { TextEditorState, WorkspaceHandlers, AnnotationBodyType, WorkspacePermissions, SidebarTab } from '../model/ComponentModel';

import { AnnotationEditForm } from './AnnotationEditForm';
import { AnnotationSidebar } from './AnnotationSidebar';
import { TextAnnotationEditor, makeIntitialEditorState } from './TextAnnotationEditor';
import { TextAnnotationType, extractAnnotationType } from './TextAnnotationType';
import { FocusAnnotation, AnnotationFocused } from '../TextAnnotationEvents';

import { componentHasType } from 'platform/components/utils';

import * as styles from './TextAnnotationWorkspace.scss';

export interface TextAnnotationWorkspaceProps {
  /**
   * Unique identifier for the workspace instance. Required for event bus
   * integration — used as `target` for incoming events and `source` for
   * outgoing events. When omitted, no events are listened to or emitted.
   */
  id?: string;
  /**
   * Text document IRI to load in the annotation editor.
   * All annotations attached to this document are loaded as well.
   */
  documentIri: string;
  /**
   * ID of the <semantic-link iri='http://help.researchspace.org/resource/Storage' class='text-link-action' target='_blank'>
   * storage</semantic-link> to load text document content.
   */
  storage: string;
  /**
   * IRI template for generating annotation IRIs. See <code>new-subject-template</code>
   * attribute at
   * <semantic-link iri='http://help.researchspace.org/resource/SemanticForm' class='text-link-action' target='_blank'></semantic-link>
   * for syntax.
   */
  annotationSubjectTemplate: string;
  /**
   * Tooltip template to render when hovered over annotation in the editor.
   *
   * See `AnnotationTemplateBindings` for template bindings.
   */
  annotationTooltip: string;
  /**
   * Fallback template to render annotations with unknown type in the sidebar.
   *
   * See `AnnotationTemplateBindings` for template bindings.
   */
  fallbackTemplate?: string;
  /**
   * JSON array of custom sidebar tab definitions. Each tab references a
   * <code>&lt;template id="sidebar-{key}"&gt;</code> child for its content.
   *
   * Example: <code>[{"key": "iiif", "label": "IIIF"}, {"key": "metadata", "label": "Metadata"}]</code>
   *
   * Templates receive <code>{{iri}}</code> binding set to the document IRI.
   */
  sidebarTabs?: string | Array<{ key: string; label: string; iconUrl?: string }>;
  /**
   * Key of the custom sidebar tab to select by default (e.g. <code>"iiif"</code>).
   * If not set, the Annotations tab is selected.
   */
  defaultSidebarTab?: string;
}

interface State {
  annotationTypes?: ReadonlyMap<string, AnnotationBodyType>;
  customTabs?: ReadonlyArray<SidebarTab>;
  loadingDocument?: boolean;
  loadingError?: any;
  permissions?: WorkspacePermissions;
  editorState?: TextEditorState;
  highlightedAnnotations?: ReadonlySet<string>;
  focusedAnnotation?: Rdf.Iri;
  editedAnnotation?: Rdf.Iri;
}

export class TextAnnotationWorkspace extends Component<TextAnnotationWorkspaceProps, State> {
  static readonly defaultProps: Partial<TextAnnotationWorkspaceProps> = {
    fallbackTemplate: '<div>Unknown type for annotation: {{iri.value}}</div>',
  };

  private readonly cancellation = new Cancellation();
  private persistingAnnotation = new Cancellation();

  private handlers: WorkspaceHandlers;

  constructor(props: TextAnnotationWorkspaceProps, context: any) {
    super(props, context);
    this.handlers = {
      highlightAnnotations: this.onHighlightAnnotations,
      focusAnnotation: this.onFocusAnnotation,
      beginAddingAnnotation: this.onBeginAddingAnnotation,
      beginEditingAnnotation: this.onBeginEditingAnnotation,
      cancelEditingAnnotation: this.onCancelEditingAnnotation,
      persistAnnotation: this.onPersistAnnotation,
      deleteAnnotation: this.onDeleteAnnotation,
    };
    this.state = {
      loadingDocument: true,
      highlightedAnnotations: new Set<string>(),
    };
  }

  private getFileManager() {
    const { repository } = this.context.semanticContext;
    return new FileManager({ repository });
  }

  componentDidMount() {
    if (typeof this.props.annotationTooltip !== 'string') {
      throw new Error(`Missing required property 'annotation-tooltip'`);
    }

    // Subscribe to incoming FocusAnnotation events when id is provided
    if (this.props.id) {
      this.cancellation
        .map(listen({ eventType: FocusAnnotation, target: this.props.id }))
        .observe({
          value: (event) => {
            if (event.data && event.data.annotationIri) {
              const iri = Rdf.iri(event.data.annotationIri);
              this.onFocusAnnotation(iri);
              this.onHighlightAnnotations(new Set([iri.value]));
            }
          },
        });
    }

    const annotationTypes = extractAnnotationTypes(this.props.children);
    const customTabs = this.parseSidebarTabs();
    this.setState({ annotationTypes, customTabs });

    const documentIri = Rdf.iri(this.props.documentIri);

    this.cancellation
      .map(
        Kefir.combine({
          document: this.fetchDocument(documentIri),
          annotations: Schema.fetchAnnotations(
            documentIri,
            this.context.semanticContext,
            makeTypeSelector(annotationTypes)
          ),
          permissions: fetchPermissions({ container: VocabPlatform.FormContainer }),
        })
      )
      .observe({
        value: ({ document, annotations, permissions }) => {
          this.setState({
            loadingDocument: false,
            permissions,
            editorState: makeIntitialEditorState({ sourceHtml: document, annotations }),
          });
        },
        error: (loadingError) => this.setState({ loadingDocument: false, loadingError }),
      });
  }

  private fetchDocument(documentIri: Rdf.Iri): Kefir.Property<string> {
    return this.getFileManager()
      .getFileResource(documentIri)
      .flatMap((resource) => {
        const fileUrl = FileManager.getFileUrl(resource.fileName, this.props.storage);
        return requestAsProperty(http.get(fileUrl).accept('text/html'));
      })
      .map((response) => response.text)
      .toProperty();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
    this.persistingAnnotation.cancelAll();
  }

  render() {
    const documentIri = Rdf.iri(this.props.documentIri);
    const { annotationTypes, loadingDocument, loadingError } = this.state;
    if (!annotationTypes || loadingDocument) {
      return <Spinner spinnerDelay={0} />;
    } else if (loadingError) {
      return <ErrorNotification title={`Error loading document ${documentIri}`} errorMessage={loadingError} />;
    }

    const { permissions, editorState, highlightedAnnotations, focusedAnnotation, customTabs } = this.state;
    return (
      <div className={styles.component}>
        <TextAnnotationEditor
          className={styles.editorPanel}
          editorState={editorState}
          onEditorStateChange={this.onEditorStateChange}
          annotationTypes={annotationTypes}
          tooltipTemplate={this.props.annotationTooltip}
          permissions={permissions}
          handlers={this.handlers}
        />
        <AnnotationSidebar
          className={styles.annotationsPanel}
          annotationTypes={annotationTypes}
          fallbackTemplate={this.props.fallbackTemplate}
          annotations={editorState.annotations}
          highlightedAnnotations={highlightedAnnotations}
          focusedAnnotation={focusedAnnotation}
          permissions={permissions}
          handlers={this.handlers}
          customTabs={customTabs || []}
          documentIri={documentIri}
          templateScope={this.appliedTemplateScope}
          defaultTab={this.props.defaultSidebarTab}
        />
      </div>
    );
  }

  private onEditorStateChange = (newState: TextEditorState) => {
    this.setState({ editorState: newState });
  };

  private onHighlightAnnotations = (highlighted: ReadonlySet<string>) => {
    this.setState((state): State => {
      const { editorState } = state;
      if (!editorState) {
        return { highlightedAnnotations: highlighted };
      }
      // Also update Slate annotation data so AnnotationMark renders with highlight
      const highlightedAnnotations = EditorModel.highlightAnnotations(
        editorState.value.annotations, highlighted
      );
      const nextEditorState = editorState.set({
        value: EditorModel.setValueProps(editorState.value, { annotations: highlightedAnnotations }),
      });
      return {
        highlightedAnnotations: highlighted,
        editorState: nextEditorState,
      };
    });
  };

  private onFocusAnnotation = (focused: Rdf.Iri | undefined) => {
    this.setState({ focusedAnnotation: focused }, () => {
      // Emit outgoing event so custom sidebar templates can react
      if (this.props.id) {
        trigger({
          eventType: AnnotationFocused,
          source: this.props.id,
          data: focused ? { annotationIri: focused.value } : {},
        });
      }

      // Scroll annotation into view within the editor panel (only if not already visible)
      if (focused) {
        // Wait a tick for the highlight to render
        setTimeout(() => {
          const editorPanel = document.querySelector('.TextAnnotationWorkspace--editorPanel');
          if (!editorPanel) { return; }

          // Find the annotation span by its data attribute
          const targetSpan = editorPanel.querySelector(
            `[data-annotation-iri="${CSS.escape(focused.value)}"]`
          ) as HTMLElement | null;

          if (!targetSpan) { return; }

          // Check if already visible within the editor panel scroll container
          const panelRect = editorPanel.getBoundingClientRect();
          const spanRect = targetSpan.getBoundingClientRect();
          const isVisible = spanRect.top >= panelRect.top && spanRect.bottom <= panelRect.bottom;
          if (!isVisible) {
            targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    });
  };

  private onBeginAddingAnnotation = () => {
    this.setState(
      (state): State => {
        // delete placeholder annotation only after adding a new one to keep
        // the same document structure for selection target
        const nextState = this.state.editorState
          .updateAnnotation(Schema.PLACEHOLDER_ANNOTATION, (anno) => {
            return { ...anno, iri: Schema.ANNOTATION_TO_DELETE };
          })
          .addAnnotation(Schema.PLACEHOLDER_ANNOTATION)
          .deleteAnnotation(Schema.ANNOTATION_TO_DELETE);
        return {
          editorState: nextState,
          editedAnnotation: Schema.PLACEHOLDER_ANNOTATION,
          focusedAnnotation: Schema.PLACEHOLDER_ANNOTATION,
          highlightedAnnotations: new Set([Schema.PLACEHOLDER_ANNOTATION.value]),
        };
      },
      () => {
        this.showOrHideAnnotationEditorModal();
      }
    );
  };

  private onBeginEditingAnnotation = (iri: Rdf.Iri) => {
    this.resetEditedAnnotation(iri);
  };

  private onCancelEditingAnnotation = () => {
    if (this.state.editedAnnotation) {
      this.resetEditedAnnotation(undefined);
    }
  };

  private resetEditedAnnotation = (iri: Rdf.Iri | undefined) => {
    this.setState(
      (state): State => {
        const { editorState, editedAnnotation } = state;
        const nextState = Schema.sameIri(editedAnnotation, Schema.PLACEHOLDER_ANNOTATION)
          ? editorState.deleteAnnotation(Schema.PLACEHOLDER_ANNOTATION)
          : editorState;
        const highlightedAnnotations = new Set<string>();
        if (iri) {
          highlightedAnnotations.add(iri.value);
        }
        return {
          editorState: nextState,
          editedAnnotation: iri,
          focusedAnnotation: iri,
          highlightedAnnotations,
        };
      },
      () => {
        this.showOrHideAnnotationEditorModal();
      }
    );
  };

  private showOrHideAnnotationEditorModal() {
    const { editedAnnotation } = this.state;
    if (editedAnnotation) {
      const annotation = this.state.editorState.annotations.find((anno) => Schema.sameIri(anno.iri, editedAnnotation));
      getOverlaySystem().show(
        'rs-text-annotation-workspace',
        <OverlayDialog
          show={true}
          title={editedAnnotation.equals(Schema.PLACEHOLDER_ANNOTATION) ? 'New annotation' : 'Edit annotation'}
          onHide={this.handlers.cancelEditingAnnotation}
        >
          <AnnotationEditForm
            subject={editedAnnotation}
            subjectTemplate={this.props.annotationSubjectTemplate}
            selectedText={annotation ? annotation.selectedText : undefined}
            annotationBodyType={annotation ? annotation.bodyType : undefined}
            annotationTypes={this.state.annotationTypes}
            handlers={this.handlers}
          />
        </OverlayDialog>
      );
    } else {
      getOverlaySystem().hide('rs-text-annotation-workspace');
    }
  }

  private onPersistAnnotation = (
    initialAnnotationIri: Rdf.Iri,
    bodyType: Rdf.Iri,
    modelWithOnlyBody: Forms.CompositeValue
  ): Kefir.Property<void> => {
    this.persistingAnnotation.cancelAll();
    this.persistingAnnotation = new Cancellation();

    const source = Rdf.iri(this.props.documentIri);

    const nextAnnotationIri = modelWithOnlyBody.subject;
    if (!initialAnnotationIri) {
      return Kefir.constantError<any>(new Error('Failed to find annotation to persist'));
    }

    const annotation = this.state.editorState.annotations.find((anno) => anno.iri.equals(initialAnnotationIri));
    const { selector, selectedText } = annotation;

    const targetModel =
      selector.type === 'range'
        ? Schema.createRangeTarget({ source, selector, selectedText })
        : Schema.createPointTarget({ source, selector });

    const createdByEvent = Schema.createProvenanceEvent({
      source,
      userIri: this.state.permissions.userIri,
      modifiedAt: Schema.getCurrentDateTime(),
    });

    let annotationModel = modelWithOnlyBody;
    annotationModel = Schema.addField(annotationModel, Schema.OAHasTarget, [targetModel]);
    annotationModel = Schema.addField(annotationModel, Schema.CrmdigL48iWasAnnotationCreatedBy, [createdByEvent]);

    return this.persistingAnnotation
      .map(this.getPersistence().persist(Forms.FieldValue.empty, annotationModel))
      .map(() => {
        this.setState(
          (state): State => {
            const nextState = state.editorState.updateAnnotation(initialAnnotationIri, (anno) => ({
              ...anno,
              iri: nextAnnotationIri,
              bodyType,
              // update annotation version to re-render template in sidebar
              renderVersion: (anno.renderVersion || 0) + 1,
            }));
            return {
              editorState: nextState,
              editedAnnotation: Schema.sameIri(state.editedAnnotation, initialAnnotationIri)
                ? undefined
                : state.editedAnnotation,
              highlightedAnnotations: new Set<string>(),
            };
          },
          () => {
            this.showOrHideAnnotationEditorModal();
          }
        );
      })
      .mapErrors<void>((error) => {
        addNotification(
          {
            level: 'error',
            message: 'Failed to create annotation',
          },
          error
        );
        return error;
      });
  };

  private onDeleteAnnotation = (iri: Rdf.Iri): Kefir.Property<void> => {
    if (!this.state.editorState.annotations.find((annotation) => annotation.iri.equals(iri))) {
      // annotation is not created yet
      return Kefir.constant(undefined);
    }
    const currentModel: Forms.CompositeValue = {
      type: 'composite',
      subject: iri,
      definitions: Immutable.Map(),
      fields: Immutable.Map(),
      errors: Forms.FieldError.noErrors,
    };

    const task = this.getPersistence()
      .persist(currentModel, Forms.FieldValue.empty)
      .map(() => {
        const nextState = this.state.editorState.deleteAnnotation(iri);
        this.setState({ editorState: nextState });
      });
    task.observe({
      error: (error) => {
        addNotification(
          {
            level: 'error',
            message: 'Failed to delete annotation',
          },
          error
        );
      },
    });
    return task;
  };

  private parseSidebarTabs(): ReadonlyArray<SidebarTab> {
    if (!this.props.sidebarTabs) {
      return [];
    }
    const scope = this.appliedTemplateScope;

    let tabDefs: Array<{ key: string; label: string; iconUrl?: string }>;
    try {
      tabDefs = typeof this.props.sidebarTabs === 'string'
        ? JSON.parse(this.props.sidebarTabs)
        : this.props.sidebarTabs;
    } catch (e) {
      throw new Error(`sidebarTabs prop contains invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!Array.isArray(tabDefs)) {
      throw new TypeError(`sidebarTabs prop must be a JSON array`);
    }

    return tabDefs.map((def, index) => {
      if (typeof def !== 'object' || def === null) {
        throw new Error(`sidebarTabs[${index}] must be an object`);
      }

      // Restrict key to safe identifier characters to prevent template-ID injection
      if (typeof def.key !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(def.key)) {
        throw new Error(
          `sidebarTabs[${index}].key must be a non-empty string containing only` +
          ` alphanumeric characters, hyphens, or underscores`
        );
      }

      if (typeof def.label !== 'string' || def.label.length === 0) {
        throw new Error(`sidebarTabs[${index}].label must be a non-empty string`);
      }

      // Only allow relative paths and http/https absolute URLs in iconUrl
      if (def.iconUrl !== undefined) {
        if (typeof def.iconUrl !== 'string' || !isSafeUrl(def.iconUrl)) {
          throw new Error(
            `sidebarTabs[${index}].iconUrl is not a safe URL — only http, https,` +
            ` and relative URLs are permitted`
          );
        }
      }

      const partial = scope ? scope.getPartial(`sidebar-${def.key}`) : undefined;
      if (!partial) {
        throw new Error(
          `Missing <template id="sidebar-${def.key}"> for sidebar tab "${def.label}"`
        );
      }
      return {
        key: def.key,
        label: def.label,
        iconUrl: def.iconUrl,
        template: partial.source,
      };
    });
  }

  private getPersistence() {
    const { semanticContext } = this.context;
    return new Forms.LdpPersistence({
      type: 'ldp',
      repository: semanticContext.repository,
    });
  }
}

/**
 * Returns true for relative URLs and absolute http/https URLs.
 * Blocks dangerous schemes such as javascript:, data:, vbscript:, etc.
 * 
 * Trim whitespace first — browsers strip it from src attributes, so
 * " javascript:..." would otherwise bypass the scheme check below.
 */
function isSafeUrl(url: string): boolean {

  const trimmed = url.trim();
  // Relative paths (no URI scheme present) are safe.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://');
}

function extractAnnotationTypes(children: React.ReactNode): ReadonlyMap<string, AnnotationBodyType> {
  const types = new Map<string, AnnotationBodyType>();
  React.Children.forEach(children, (child) => {
    if (!componentHasType(child, TextAnnotationType)) {
      return; // skip non-annotation-type children (e.g. sidebar tab templates)
    }
    const type = extractAnnotationType(child);
    types.set(type.iri.value, type);
  });
  return types;
}

function makeTypeSelector(
  typesMetadata: ReadonlyMap<string, AnnotationBodyType>
): (types: ReadonlyArray<Rdf.Iri>) => Rdf.Iri | undefined {
  return (types) => {
    for (const type of types) {
      if (typesMetadata.has(type.value)) {
        return type;
      }
    }
    return undefined;
  };
}

function fetchPermissions({ container = VocabPlatform.FormContainer }): Kefir.Property<WorkspacePermissions> {
  return Kefir.combine(
    {
      userIri: Kefir.fromPromise(SecurityUtil.getUser())
        .map((userInfo) => Rdf.iri(userInfo.userURI))
        .flatMapErrors<Rdf.Iri | undefined>(() => Kefir.constant(undefined)),
      formCreate: SecurityUtil.isPermitted('forms:ldp:create'),
      formUpdate: SecurityUtil.isPermitted('forms:ldp:update'),
      formDelete: SecurityUtil.isPermitted('forms:ldp:delete'),
      ldpCreate: SecurityUtil.isPermitted(Permissions.toLdp('container', container, 'create', 'any')),
      ldpUpdateAny: SecurityUtil.isPermitted(Permissions.toLdp('container', container, 'update', 'any')),
      ldpUpdateOwner: SecurityUtil.isPermitted(Permissions.toLdp('container', container, 'update', 'owner')),
      ldpDeleteAny: SecurityUtil.isPermitted(Permissions.toLdp('container', container, 'delete', 'any')),
      ldpDeleteOwner: SecurityUtil.isPermitted(Permissions.toLdp('container', container, 'delete', 'owner')),
    },
    (p): WorkspacePermissions => ({
      userIri: p.userIri,
      create: p.formCreate && p.ldpCreate,
      updateOwner: p.formUpdate && p.ldpUpdateOwner,
      updateAny: p.formUpdate && p.ldpUpdateAny,
      deleteOwner: p.formDelete && p.ldpDeleteOwner,
      deleteAny: p.formDelete && p.ldpDeleteAny,
    })
  ).toProperty();
}

export default TextAnnotationWorkspace;
