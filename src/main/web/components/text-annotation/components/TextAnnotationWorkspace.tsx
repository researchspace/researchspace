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

import * as _ from 'lodash';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as React from 'react';
import Html from 'slate-html-serializer';

import { Cancellation, requestAsProperty } from 'platform/api/async';
import { Component } from 'platform/api/components';
import * as http from 'platform/api/http';
import { Rdf } from 'platform/api/rdf';
import { VocabPlatform } from 'platform/api/rdf/vocabularies';

import { SparqlUtil } from 'platform/api/sparql';
import { SparqlClient } from 'platform/api/sparql';

import { FileManager } from 'platform/api/services/file-manager';
import { Util as SecurityUtil, Permissions } from 'platform/api/services/security';

import * as Forms from 'platform/components/forms';
import { ErrorNotification, addNotification } from 'platform/components/ui/notification';
import { OverlayDialog, getOverlaySystem } from 'platform/components/ui/overlay';
import { Spinner } from 'platform/components/ui/spinner';

import * as Schema from '../model/AnnotationSchema';
import { TextEditorState, WorkspaceHandlers, AnnotationBodyType, WorkspacePermissions } from '../model/ComponentModel';

import { AnnotationEditForm } from './AnnotationEditForm';
import { AnnotationSidebar } from './AnnotationSidebar';
import { TextAnnotationEditor, makeIntitialEditorState, makeEmptyEditorState } from './TextAnnotationEditor';
import { extractAnnotationType } from './TextAnnotationType';

import * as styles from './TextAnnotationWorkspace.scss';

import { SLATE_RULES } from '../../text-editor/Serializer';
import { ResourceTemplateConfig } from '../../text-editor/Config';
import { WorkspaceLayoutNode, WorkspaceLayout, WorkspaceLayoutType } from 'ontodia';
import { Range } from 'slate';
import { extractTextFragment } from '../model/EditorModel';

export interface TextAnnotationWorkspaceProps {
  /**
   * Text document IRI to load in the annotation editor.
   * All annotations attached to this document are loaded as well.
   */
  documentIri: string;
  /**
   * ID of the <semantic-link iri='http://help.metaphacts.com/resource/Storage'>
   * storage</semantic-link> to load text document content.
   */
  storage: string;

  /**
   * @default 'html'
   */
  editorType?: 'text' | 'html';

  /**
   * @default 'annotation'
   */
  mode?: 'annotation' | 'edit';

  /**
   * IRI template for generating annotation IRIs. See <code>new-subject-template</code>
   * attribute at
   * <semantic-link iri='http://help.metaphacts.com/resource/SemanticForm'></semantic-link>
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

  // Narratives
  resourceTemplates?: any;
  /* file upload config */
  /**
   * SPARQL select query to generate a unique IRI for the file to be uploaded.
   * The must have exactly one projection variable *?newId* with the IRI.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'xw
   * * __fileName__ - Name of the file
   */
  generateIriQuery?: string;

  /**
   * SPARQL construct query to generate additional meta-data which will be stored toghether with the file meta-data.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __resourceIri__ - IRI generated with `generateIdQuery`
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'
   * * __fileName__ - Name of the file
   */
  resourceQuery?: string;
}

interface State {
  annotationTypes?: ReadonlyMap<string, AnnotationBodyType>;
  loadingDocument?: boolean;
  loadingError?: any;
  permissions?: WorkspacePermissions;
  editorState?: TextEditorState;
  highlightedAnnotations?: ReadonlySet<string>;
  focusedAnnotation?: Rdf.Iri;
  editedAnnotation?: Rdf.Iri;

  title?: string;
  fileName?: string;
  saving?: boolean;
  documentIri?: string;
}

export class TextAnnotationWorkspace extends Component<TextAnnotationWorkspaceProps, State> {
  static readonly defaultProps: Partial<TextAnnotationWorkspaceProps> = {
    fallbackTemplate: '<div>Unknown type for annotation: {{iri.value}}</div>',
    resourceQuery: `
      PREFIX mp: <http://www.researchspace.org/resource/system/>
      PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
      PREFIX crmdig: <http://www.ics.forth.gr/isl/CRMdig/>
      PREFIX rso: <http://www.researchspace.org/ontology/>

      CONSTRUCT {
        ?__resourceIri__ a crm:E33_Linguistic_Object,
                crmdig:D1_Digital_Object,
                rso:Semantic_Narrative.

        ?__resourceIri__ mp:fileName ?__fileName__.
        ?__resourceIri__ mp:mediaType "text/html".
        ?__resourceIri__ rdfs:label ?__label__ .
      } WHERE {}
    `,
    generateIriQuery: `
      SELECT ?resourceIri WHERE {
        BIND(URI(CONCAT(STR(?__contextUri__), "/", ?__fileName__)) as ?resourceIri)
      }
    `,
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

      changeTitle: this.onChangeTitle,
      saveDocument: this.onSaveDocument,
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

    const annotationTypes = extractAnnotationTypes(this.props.children);
    this.setState({ annotationTypes });

    if (this.props.documentIri) {
      this.fetchDataForExistingDocument(Rdf.iri(this.props.documentIri), annotationTypes);
    } else {
      this.cancellation.map(fetchPermissions({ container: VocabPlatform.FormContainer })).observe({
        value: (permissions) => {
          this.setState({
            loadingDocument: false,
            permissions,
            editorState: makeEmptyEditorState(),
            title: 'New Narrative',
            saving: false,
          });
        },
      });
    }
  }

  private fetchDataForExistingDocument(documentIri: Rdf.Iri, annotationTypes: ReadonlyMap<string, AnnotationBodyType>) {
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
        }).flatMap(({ document, annotations, permissions }) => {
          if (this.props.mode === 'edit') {
            const parsed = new DOMParser().parseFromString(document, 'text/html');
            const { title } = parsed;
            this.setState({ title });
          }

          console.log('initial annotations: ');
          console.log(annotations);
          this.setState({ permissions });

          return makeIntitialEditorState({
            mode: this.props.mode,
            sourceHtml: document,
            annotations,
            resourceTemplates: this.props.resourceTemplates,
          });
        })
      )
      .observe({
        value: (editorState) => {
          this.setState({
            loadingDocument: false,
            documentIri: documentIri.value,
            editorState,
          });
        },
        error: (loadingError) => this.setState({ loadingDocument: false, loadingError }),
      });
  }

  private fetchDocument = (documentIri: Rdf.Iri): Kefir.Property<string> => {
    return this.getFileManager()
      .getFileResource(documentIri)
      .flatMap((resource) => {
        this.setState({ fileName: resource.fileName });
        const fileUrl = FileManager.getFileUrl(resource.fileName, this.props.storage);
        return requestAsProperty(http.get(fileUrl).accept('text/html'));
      })
      .map((response) => response.text)
      .toProperty();
  };

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

    const { permissions, editorState, highlightedAnnotations, focusedAnnotation } = this.state;

    const textAnnotationEditor = (
      <TextAnnotationEditor
        className={styles.editorPanel}
        editorState={editorState}
        onEditorStateChange={this.onEditorStateChange}
        annotationTypes={annotationTypes}
        tooltipTemplate={this.props.annotationTooltip}
        permissions={permissions}
        handlers={this.handlers}
        mode={this.props.mode}
        resourceTemplates={this.props.resourceTemplates}
        title={this.state.title}
        documentIri={this.state.documentIri}
        saving={this.state.saving}
      />
    );
    const annotationSidebar = (
      <AnnotationSidebar
        className={styles.annotationsPanel}
        annotationTypes={annotationTypes}
        fallbackTemplate={this.props.fallbackTemplate}
        annotations={editorState.annotations}
        highlightedAnnotations={highlightedAnnotations}
        focusedAnnotation={focusedAnnotation}
        permissions={permissions}
        handlers={this.handlers}
      />
    );

    const layout: WorkspaceLayoutNode = {
      type: WorkspaceLayoutType.Row,
      children: [
        {
          type: WorkspaceLayoutType.Column,
          children: [
            {
              id: 'text',
              type: WorkspaceLayoutType.Component,
              content: textAnnotationEditor,
              className: 'test',
            },
          ],
          undocked: true,
        },
        {
          type: WorkspaceLayoutType.Column,
          children: [
            {
              id: 'annotation-sidbar',
              type: WorkspaceLayoutType.Component,
              content: annotationSidebar,
            },
          ],
          defaultSize: 300,
          defaultCollapsed: true,
        },
      ],
    };

    return (
      <div className={styles.component}>
        <WorkspaceLayout layout={layout} _onResize={() => window.dispatchEvent(new Event('resize'))} />
      </div>
    );
  }

  private onEditorStateChange = (newState: TextEditorState) => {
    this.setState({ editorState: newState });
  };

  private onHighlightAnnotations = (highlighted: ReadonlySet<string>) => {
    this.setState({ highlightedAnnotations: highlighted });
  };

  private onFocusAnnotation = (focused: Rdf.Iri | undefined) => {
    this.setState({ focusedAnnotation: focused });
  };

  private onBeginAddingAnnotation = () => {
    this.setState(
      (state): State => {
        // delete placeholder annotation only after adding a new one to keep
        // the same document structure for selection target
        const nextState = this.state.editorState
          .reCalculateXpath()
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
    this.setState(
      (state): State => {
        const nextState = this.state.editorState.reCalculateXpath();
        return {
          editorState: nextState,
        };
      },
      () => {
        this.resetEditedAnnotation(iri);
      }
    );
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

  /**
   * We persiste annotation and annotation target into two separate LDP containers
   * so when document is changed we can update only target and don't touch annotation
   */
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
    const { selector, selectedText, target } = annotation;

    const targetModel =
      selector.type === 'range'
        ? Schema.createRangeTarget({ source, target, selector, selectedText })
        : Schema.createPointTarget({ source, target, selector });

    const createdByEvent = Schema.createProvenanceEvent({
      source,
      userIri: this.state.permissions.userIri,
      modifiedAt: Schema.getCurrentDateTime(),
    });

    let annotationModel = modelWithOnlyBody;
    annotationModel = Schema.addField(annotationModel, Schema.OAHasTarget, [
      Forms.FieldValue.fromLabeled({ value: targetModel.subject }),
    ]);
    annotationModel = Schema.addField(annotationModel, Schema.CrmdigL48iWasAnnotationCreatedBy, [createdByEvent]);

    return this.persistingAnnotation
      .map(
        this.getPersistence()
          .persist(Forms.FieldValue.empty, targetModel)
          .flatMap(() => this.getPersistence().persist(Forms.FieldValue.empty, annotationModel))
      )
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

  private onUpdateSelector = (annotation: Schema.Annotation) => {
    const source = Rdf.iri(this.props.documentIri);
    const { selector, selectedText, target } = annotation;

    const targetModel =
      selector.type === 'range'
        ? Schema.createRangeTarget({ source, target, selector, selectedText })
        : Schema.createPointTarget({ source, target, selector });

    const task = this.cancellation.map(this.getPersistence().persist(Forms.FieldValue.empty, targetModel));
    task.observe({
      value: () => {
        /**/
      },
      error: (error) => {
        console.error(error);
        addNotification(
          {
            level: 'error',
            message: 'Failed to update annotations',
          },
          error
        );
      },
    });
    return task;
  };

  private onDeleteAnnotation = (iri: Rdf.Iri): Kefir.Property<void> => {
    const annotation = this.state.editorState.annotations.find((a) => a.iri.equals(iri));
    if (!annotation) {
      // annotation is not created yet
      return Kefir.constant(undefined);
    }

    const task = Kefir.combine([this.deleteEntity(iri), this.deleteEntity(annotation.target)])
      .toProperty()
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

  private deleteEntity = (iri: Rdf.Iri): Kefir.Property<void> => {
    const currentModel: Forms.CompositeValue = {
      type: 'composite',
      subject: iri,
      definitions: Immutable.Map(),
      fields: Immutable.Map(),
      errors: Forms.FieldError.noErrors,
    };
    return this.getPersistence().persist(currentModel, Forms.FieldValue.empty);
  };

  private getPersistence() {
    const { semanticContext } = this.context;
    return new Forms.LdpPersistence({
      type: 'ldp',
      repository: semanticContext.repository,
    });
  }

  private onChangeTitle = (title: string) => {
    this.setState({ title });
  };

  private onSaveDocument = (): void => {
    this.setState({ saving: true });
    let { editorState, title } = this.state;

    // update annotations
    //console.log(editorState.value.toJS( {preserveKeys: true} ))

    // we need to re-calculate xpaths before saving annotation
    editorState = editorState.reCalculateXpath();
    /*
     *     console.log(editorState.value.toJS( {preserveKeys: true} ))
     *     console.log(
     *       editorState.value.document.getInlines().toJS()
     *     )
     *     console.log(
     *       rangeAnnotations.toJS()
     *     )
     *     console.log(
     *       pointAnnotations.toJS()
     *     ) */

    /**
     * We manually traverse slate document tree and calculate selectors for all annotations.
     * Assumptions:
     *    * no nested blocks
     *    * point annotations are inline nodes
     *    * range annotations are marks
     */
    const pointLocations: { [key: string]: Schema.PointSelector } = {};
    const rangeLocations: { [key: string]: Schema.RangeSelector } = {};
    const slateRanges: { [key: string]: any } = {};
    editorState.value.document.nodes.forEach((n) =>
      n.nodes.forEach((nn) => {
        if (nn.object === 'text') {
          let offset = 0;
          nn.getLeaves().forEach((l) => {
            l.marks.forEach((m) => {
              if (m.type === 'rs-annotation-range') {
                const annotationIri = m.data.get('iri').value;
                const xPath = n.data.get('xpath');
                if (rangeLocations[annotationIri]) {
                  rangeLocations[annotationIri] = {
                    ...rangeLocations[annotationIri],
                    end: {
                      type: 'point',
                      xPath: xPath,
                      offset: offset + l.text.length,
                    },
                  };
                  slateRanges[annotationIri].focus = {
                    key: nn.key,
                    offset: offset + l.text.length,
                  };
                } else {
                  rangeLocations[annotationIri] = {
                    type: 'range',
                    start: {
                      type: 'point',
                      xPath: xPath,
                      offset: offset,
                    },
                    end: {
                      type: 'point',
                      xPath: xPath,
                      offset: offset + l.text.length,
                    },
                  };
                  slateRanges[annotationIri] = {
                    anchor: {
                      key: nn.key,
                      offset: offset,
                    },
                    focus: {
                      key: nn.key,
                      offset: offset + l.text.length,
                    },
                  };
                }
              }
            });
            offset += l.text.length;
          });
        } else if (nn.object === 'inline' && nn.type === 'rs-annotation-point') {
          pointLocations[nn.data.get('iri').value] = {
            type: 'point',
            xPath: n.data.get('xpath'),
            offset: n.getOffset(nn.key),
          };
        }
      })
    );

    console.log('points locations');
    console.log(pointLocations);

    console.log('range locations');
    console.log(rangeLocations);

    // checking newly computed selector with the saved one:
    //  * if there is no selector for stored annotation then we need to remove it
    //  * if selector changed then we need to update it in the database
    const annotationsToDelete: Array<Schema.Annotation> = [];
    const annotationsToUpdate: Array<Schema.Annotation> = [];
    editorState.annotations.forEach((annotation) => {
      const locations = annotation.selector.type === 'point' ? pointLocations : rangeLocations;
      const selector = locations[annotation.iri.value];
      if (selector) {
        if (!_.isEqual(annotation.selector, selector)) {
          const selectedText = extractTextFragment(
            editorState.value.document,
            Range.fromJS(slateRanges[annotation.iri.value])
          );
          annotationsToUpdate.push({ ...annotation, selector, selectedText });
        }
      } else {
        annotationsToDelete.push(annotation);
      }
    });

    console.log('annotations to delete');
    console.log(annotationsToDelete);
    console.log('annotations to update');
    console.log(annotationsToUpdate);

    // execute delete operation
    const deletions = annotationsToDelete.map((a) => this.onDeleteAnnotation(a.iri));
    const updates = annotationsToUpdate.map((a) => this.onUpdateSelector(a));

    // - update annotations

    const html = new Html({ rules: SLATE_RULES });
    const content = this.wrapInHtml(title, html.serialize(editorState.value));

    console.log('content');
    //    console.log(editorState.value.toJS( {preserveKeys: true} ))
    console.log(content);

    const blob = new Blob([content]);
    const fileName = this.state.fileName || title.replace(/[^a-z0-9_\-]/gi, '_') + '.html';
    const file = new File([blob], fileName);

    const parsedResouercQuery = SparqlUtil.parseQuery(this.props.resourceQuery);
    const resourceQuery = SparqlUtil.serializeQuery(
      SparqlClient.setBindings(parsedResouercQuery, { __label__: Rdf.literal(title) })
    );

    this.cancellation
      .map(
        Kefir.combine([
          this.getFileManager().uploadFileAsResource({
            file,
            storage: this.props.storage,
            generateIriQuery: this.props.generateIriQuery,
            resourceQuery: resourceQuery,
            contextUri: 'http://www.researchspace.org/instances/narratives',
            fileNameHack: true,
          }),
          ...deletions,
          ...updates,
        ]).toProperty()
      )
      .observe({
        value: ([resource]) => {
          this.setState({ documentIri: (resource as Rdf.Iri).value, saving: false });
        },
        error: (error) => {
          console.log('error');
          console.log(error);
        },
      });
  };

  private wrapInHtml(title: string, body: string) {
    return `
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body>${body}</body>
</html>
`;
  }
}

function extractAnnotationTypes(children: React.ReactNode): ReadonlyMap<string, AnnotationBodyType> {
  const types = new Map<string, AnnotationBodyType>();
  React.Children.forEach(children, (child) => {
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
