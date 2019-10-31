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
import { createElement } from 'react';
import * as PropTypes from 'prop-types';
import { Button, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import HTML5Backend from 'react-dnd-html5-backend';
import * as _ from 'lodash';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { navigateToResource, refresh } from 'platform/api/navigation';
import { invalidateAllCaches } from 'platform/api/services/cache';
import { Alert, AlertType, AlertConfig } from 'platform/components/ui/alert';
import { Spinner } from 'platform/components/ui/spinner/Spinner';
import {
  LdpAnnotationService, Annotation, RdfaLink,
} from '../../services/LDPAnnotationService';

import Editor, { Editable, createEmptyState } from 'ory-editor-core';
import { layoutMode, editMode } from 'ory-editor-core/lib/actions/display';
import { HTMLRenderer } from 'ory-editor-renderer';
import Trash from './Trash';

import slate from 'ory-editor-plugins-slate';
import image from 'ory-editor-plugins-image';
import video from 'ory-editor-plugins-video';
import divider from 'ory-editor-plugins-divider';
import spacer from 'ory-editor-plugins-spacer';

import 'ory-editor-core/lib/index.css';
import 'ory-editor-ui/lib/index.css';
import 'ory-editor-plugins-slate/lib/index.css';
import 'ory-editor-plugins-parallax-background/lib/index.css';
import 'ory-editor-plugins-image/lib/index.css';

import { ResourceComponent, ResourcePlugin, NativeResourcePlugin } from './ResourcePlugin';
import { ModeToggle } from './ModeToggle';
import { PluginToolbar } from './PluginToolbar';
import { ResourceState } from './SemanticNarrativeResource';

import './SemanticNarrativeEditor.scss';

interface Props {
  /**
   * IRI of semantic narrative
   */
  iri?: string
  /**
   * If set, editor will create new semantic narrative annotating annotationTarget IRI
   * can not be set simultaneously with iri
   */
  annotationTarget?: string
  /**
   * View or edit semantic narrative. For view iri should be set
   */
  readOnly?: boolean
  /**
   * Action after submit: reload (default), redirect (to created resource) or custom IRI
   */
  postAction?: string

  metadata?: string
  rdfaRelationQueryConfig: any
  dropTemplateConfig: Array<any>
}

export type SemanticNarrativeEditorProps = Props;

interface State {
  target?: Rdf.Iri
  label?: string
  alert?: AlertConfig
  editor?: Editor
  state?: any
  isSaving?: boolean
}


/**
 * Workaround for React-DnD blocking non-React-DnD drag events. See here:
 * https://github.com/react-dnd/react-dnd-html5-backend/issues/7#issuecomment-262267786
 */
const ModifiedBackend = (...args: any[]) => {
  const backendConstructor = HTML5Backend as any;
  const instance = new backendConstructor(...args);

  function shouldIgnoreTarget(e: DragEvent) {
    let target = e.target;
    while (target instanceof Element) {
      if (target.classList.contains(ResourceComponent.className)) {
        return true;
      }
      const className = target.getAttribute('class');
      if (className && className.match(/\bory-/g)) {
        return false;
      }
      target = target.parentElement;
    }
    return true;
  }

  const listeners = [
    'handleTopDragStart',
    'handleTopDragStartCapture',
    'handleTopDragEndCapture',
    'handleTopDragEnter',
    'handleTopDragEnterCapture',
    'handleTopDragLeaveCapture',
    'handleTopDragOver',
    'handleTopDragOverCapture',
    'handleTopDrop',
    'handleTopDropCapture',
  ];

  listeners.forEach(name => {
    const original = instance[name];
    instance[name] = (e, ...extraArgs) => {
      if (!shouldIgnoreTarget(e)) {
        original(e, ...extraArgs);
      }
    };
  });

  return instance;
};

const CLASS_NAME = 'semantic-narrative-editor';

/**
 * @example
 * <rs-semantic-narrative-editor annotation-target="http://example.com/anno-target">
 * </rs-semantic-narrative-editor>
 */
export class SemanticNarrativeEditor extends Component<Props, State> {
  plugins: any;
  startSavingTime: number;

  constructor(props: Props, context: any) {
    super(props, context);
    if (props.readOnly === true && props.iri === undefined) {
      throw 'readOnly can be used only with iri';
    }
    this.state = {
      isSaving: false
    };
    this.onSubmit = this.onSubmit.bind(this);
    this.plugins = {
      content: [slate(), divider, spacer, image, video, ResourcePlugin],
      layout: [],
      native: NativeResourcePlugin,
    };
  }

  static readonly childContextTypes = {
    ...Component.childContextTypes,
    editorProps: PropTypes.any,
  };
  getChildContext() {
    return {
      ...super.getChildContext(),
      editorProps: this.props,
    };
  }

  private isEditMode() { return this.props.iri ? true : false; }

  private performPostAction(createdResource: string) {
    this.resetIsSaving();
    if (this.props.postAction === 'reload') {
      refresh();
    } else if (!this.props.postAction || this.props.postAction === 'redirect') {
      navigateToResource(Rdf.iri(createdResource), {}, 'assets').onValue(v => v);
    } else {
      navigateToResource(Rdf.iri(this.props.postAction)).onValue(v => v);
    }
  }

  componentDidMount() {
    if ((window as any).__singletonEditor === undefined) {
      (window as any).__singletonEditor = new Editor({
        plugins: this.plugins,
        editables: [],
        defaultPlugin: slate(),
        dragDropBackend: ModifiedBackend,
      });
    }

    this.loadData(this.props);
    window.addEventListener('mp-dragstart', this.onSomewhereDragStart);
    window.addEventListener('mp-dragend', this.onSomewhereDragEnd);
  }

  componentWillReceiveProps(props: Props) {
    if (!_.isEqual(props, this.props)) {
      this.loadData(props);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('mp-dragstart', this.onSomewhereDragStart);
    window.removeEventListener('mp-dragend', this.onSomewhereDragEnd);
  }

  private onSomewhereDragStart = () => {
    this.state.editor.store.dispatch(layoutMode());
  }

  private onSomewhereDragEnd = () => {
    this.state.editor.store.dispatch(editMode());
  }

  private loadData = (props: Props) => {

    const editor = (window as any).__singletonEditor;

    // set editMode as default
    if (!props.readOnly) {
      editor.store.dispatch(editMode());
    }
    if (props.annotationTarget && this.props.iri) {
      throw `Wrong configuration: Only annotationTarget or iri can be set at the same time.`;
    } else if (props.iri) {
      LdpAnnotationService.getAnnotation(
        Rdf.iri(props.iri.replace(/<|>/g, ''))
      ).onValue((annotation: Annotation) => {
        let content = createEmptyState();
        try {
          content = JSON.parse(annotation.html);
        } catch (e) {
          throw 'Error while parsing annotation.html';
        }
        editor.trigger.editable.add(content);
        this.setState({
          target: annotation.target,
          label: annotation.label,
          editor: editor,
          state: content,
        });
      });
    } else {
      const content = createEmptyState();
      editor.trigger.editable.add(content);
      this.setState({
        target: props.annotationTarget ?
          Rdf.iri(props.annotationTarget.replace(/<|>/g, '')) :
          undefined,
        editor: editor,
        state: content,
      });
    }

  }

  traverseState(item: object, callback: (link: RdfaLink) => void) {
    if (item['cells'] !== undefined) {
      for (const cell of item['cells']) {
        this.traverseState(cell, callback);
      }
    }
    if (item['rows'] !== undefined) {
      for (const row of item['rows']) {
        this.traverseState(row, callback);
      }
    }
    if (item['content'] !== undefined && item['content']['plugin']['name'] === 'metaphactory/content/resource') {
      const predicate = item['content']['state']['relBinding'] !== undefined ?
        Rdf.iri(item['content']['state']['relBinding']['iri']['value']) :
        Rdf.iri(this.props.rdfaRelationQueryConfig.defaultValue);
      const object = Rdf.iri(item['content']['state']['resourceIri']['value']);
      callback({predicate, object});
    }
  }

  collectRdfa(state: ResourceState): RdfaLink[] {
    let result = [];
    this.traverseState(state, (link: RdfaLink) => {
      result.push(link);
    });
    return result;
  }

  resetIsSaving() {
    this.setState({isSaving: false});
  }

  onSubmit() {
    this.setState({isSaving: true});
    this.startSavingTime = new Date().getTime();
    const annotation: Annotation = {
      target: this.state.target,
      label: this.state.label,
      html: JSON.stringify(this.state.state),
      rdfa: this.collectRdfa(this.state.state),
      metadata: this.props.metadata,
    };

    invalidateAllCaches();

    if (this.isEditMode()) {
      LdpAnnotationService.updateAnnotation(
        Rdf.iri(this.props.iri.replace(/<|>/g, '')),
        annotation
      ).onValue(annotationUri => {
        setTimeout(() => {
          this.performPostAction(annotationUri.value);
        }, Math.max(0, 1200 - (new Date().getTime() - this.startSavingTime)));
      }).onError(err => {
        this.setState({alert: { alert: AlertType.DANGER, message: err.response.text }});
        this.resetIsSaving();
      });
    } else {
      LdpAnnotationService.addAnnotation(
        annotation
      ).onValue(annotationUri => {
        setTimeout(() => {
          this.performPostAction(annotationUri.value);
        }, Math.max(0, 1200 - (new Date().getTime() - this.startSavingTime)));
      }).onError(err => {
        this.setState({alert: { alert: AlertType.DANGER, message: err.response.text }});
        this.resetIsSaving();
      });
    }
  }

  render() {
    if (this.state.state === undefined || this.state.editor === undefined) {
      return <Spinner />;
    }

    if (this.props.readOnly === true) {
      return <div>
        <h1>{this.state.label}</h1>
        <HTMLRenderer plugins={this.plugins} state={this.state.state}/>
      </div>;
    }

    const {editor, state, isSaving} = this.state;
    return (
      <div className={CLASS_NAME}>
        <div className='semantic-narrative-editor__title-and-toolbars'>
          <FormGroup className='form-inline'>
            <ControlLabel style={{marginRight: 12, marginTop: 10, float: 'left'}}>Title</ControlLabel>
            <FormControl type='text' placeholder='Title'
              value={this.state.label ? this.state.label : ''}
              style={{width: 350}}
              onChange={(e) => {
                const newValue = (e.target as any).value;
                this.setState({label: newValue});
              }}
            />
            <Button bsSize='small' bsStyle='success' className='pull-right' onClick={this.onSubmit}>
              {isSaving && <span>Saving... <i className="fa fa-refresh fa-spin fa-fw"></i></span>}
              {!isSaving && (this.isEditMode() ? 'Update Page' : 'Save Page')}
            </Button>
          </FormGroup>

          <div className='semantic-narrative-editor__toolbars'>
            <div className='semantic-narrative-editor__toolbar semantic-narrative-editor__toolbar--first' data-flex-layout='row'>
              <div className='semantic-narrative-editor__toolbar-title-holder'>
                <div className='semantic-narrative-editor__toolbar-title'>Mode</div>
              </div>
              <ModeToggle editor={editor} />
            </div>
            <div className='semantic-narrative-editor__toolbar' data-flex-layout='row'>
              <div className='semantic-narrative-editor__toolbar-title-holder'>
                <div className='semantic-narrative-editor__toolbar-title'>Add</div>
              </div>
              <PluginToolbar editor={editor} />
            </div>
          </div>
        </div>
        <Editable id={state.id}
          editor={editor}
          onChange={s => {
            this.setState({state: s});
          }}
        />
        <Trash editor={editor} />
        {createElement(Alert, this.state.alert ? this.state.alert : {
          alert: AlertType.NONE,
          message: '',
        })}
      </div>
    );
  }
}

export default SemanticNarrativeEditor;
