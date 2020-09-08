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

import * as _ from 'lodash';
import * as Kefir from 'kefir';
import { Editor, RenderMarkProps, RenderNodeProps } from 'slate-react';
import { Panel, FormControl, FormGroup } from 'react-bootstrap';
import PlaceholderPlugin from 'slate-react-placeholder';
import * as Slate from 'slate';
import isHotkey from 'is-hotkey';
import Html from 'slate-html-serializer';
import * as React from 'react';

import { Rdf } from 'platform/api/rdf';
import * as http from 'platform/api/http';
import { SparqlUtil } from 'platform/api/sparql';

import { SparqlClient } from 'platform/api/sparql';
import { Cancellation, requestAsProperty } from 'platform/api/async';
import { FileManager } from 'platform/api/services/file-manager';

import { Component } from 'platform/api/components';
import { DropArea } from 'platform/components/dnd/DropArea';
import { Draggable } from 'platform/components/dnd';
import { Spinner } from 'platform/components/ui/spinner';

import { MARK, Block, schema, DEFAULT_BLOCK, Inline, RESOURCE_MIME_TYPE } from './EditorSchema';
import { ResourceTemplateConfig } from './Config';
import { SLATE_RULES } from './Serializer';
import { Toolbar } from './Toolbar';
import { ExternalLink } from './ExternalLink';
import { InternalLink } from './InternalLink';
import * as styles from './TextEditor.scss';
import { ResourceBlock } from './ResourceBlock';

interface TextEditorProps {
  /**
   * Text document IRI to load.
   */
  documentIri?: string;

  value: Slate.Value;

  title: string;
  onChange: (x: any) => void;
  onChangeTitle: (title: string) => void;
  onSave: () => void;
  onSelect: (event: Event, editor: Slate.Editor, next: () => void) => void;
  renderMark: (props: RenderMarkProps, editor: Slate.Editor, next: () => any) => any;
  renderNode: (props: RenderNodeProps, editor: Slate.Editor, next: () => any) => any;
  saving?: boolean;

  resourceTemplates: Array<ResourceTemplateConfig>;

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

  availableTemplates?: { [objectIri: string]: ResourceTemplateConfig[] };
}

interface TextEditorState {
  anchorBlock?: Slate.Block;
  availableTemplates: { [objectIri: string]: ResourceTemplateConfig[] };
}

const plugins = [
  {
    queries: {
      isEmptyFirstParagraph: (editor: Slate.Editor, node: Slate.Block) =>
        editor.value.document.nodes.size === 1 && node.type === Block.empty && node.text === '',
    },
  },
  PlaceholderPlugin({
    placeholder: 'Enter narrative',
    when: 'isEmptyFirstParagraph',
  }),
];

export class TextEditor extends Component<TextEditorProps, TextEditorState> {
  private editorRef: React.RefObject<Editor>;
  private readonly cancellation = new Cancellation();
  private templateSelection = this.cancellation.derive();

  static defaultProps: Partial<TextEditorProps> = {
    resourceTemplates: [],
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

  state: TextEditorState = {
    anchorBlock: null as Slate.Block,
    availableTemplates: {},
  };

  constructor(props: TextEditorProps, context) {
    super(props, context);
    this.editorRef = React.createRef<Editor>();
    this.state.availableTemplates = this.props.availableTemplates || {};
  }

  onChange = (value) => {
    this.props.onChange(value);
  };

  // + drag and drop
  getTypes = (iri: Rdf.Iri) => {
    return SparqlClient.select(`SELECT DISTINCT ?type WHERE { <${iri.value}> a ?type}`).map((res) =>
      res.results.bindings.map((b) => b['type'])
    );
  };

  findTemplatesForResource = (iri: Rdf.Iri) => {
    return this.getTypes(iri).map((types) =>
      this.props.resourceTemplates.filter((c) => c.type === 'any' || _.find(types, (t) => t.value === c.type))
    );
  };

  onResourceDrop = (node: Slate.Node) => (drop: Rdf.Iri) => {
    const editor = this.editorRef.current;
    editor.moveToRangeOfNode(node).setBlocks({
      type: Block.embed,
      data: { attributes: { src: drop.value } },
    });

    this.templateSelection = this.cancellation.deriveAndCancel(this.templateSelection);
    this.templateSelection.map(this.findTemplatesForResource(drop)).observe({
      value: (configs) => {
        const { availableTemplates } = this.state;
        availableTemplates[drop.value] = configs;
        const defaultTemplate = _.first(configs);
        this.setState({ availableTemplates }, () => {
          editor.moveToRangeOfNode(node).setBlocks({
            type: Block.embed,
            data: {
              attributes: {
                src: drop.value,
                type: RESOURCE_MIME_TYPE,
                template: defaultTemplate.id,
              },
            },
          });
        });
      },
    });
  };

  // - drag and drop

  emptyBlock = (props: RenderNodeProps) => {
    return (
      <div {...props.attributes}>
        <DropArea
          shouldReactToDrag={(iri) => iri.value !== this.props.documentIri}
          dropMessage="Drop here to add item to the narrative."
          onDrop={this.onResourceDrop(props.node)}
        >
          {props.children}
        </DropArea>
      </div>
    );
  };

  renderTextBlock = (tag: string, props: RenderNodeProps): any => {
    const attributes = props.node.data.get('attributes', {});
    return React.createElement(tag, { ...props.attributes, ...attributes }, props.children);
  };

  renderBlock = (props: RenderNodeProps, editor: Slate.Editor, next: () => any): any => {
    const {
      node: { type },
      attributes,
      children,
    } = props;
    switch (type) {
      case Block.empty:
        return this.emptyBlock(props);
      case Block.embed:
        return <ResourceBlock {...attributes} {...props} resourceTemplates={this.props.resourceTemplates} />;
      case Block.p:
      case Block.h1:
      case Block.h2:
      case Block.h3:
        return this.renderTextBlock(type, props);
      case Block.ol:
      case Block.ul:
      case Block.li:
        return React.createElement(type, attributes, children);

      case Inline.externalLink:
        return <ExternalLink {...props} editor={editor} />;
      case Inline.internalLink:
        return <InternalLink {...props} editor={editor} />;

      default:
        return this.props.renderNode(props, editor, next);
    }
  };

  renderMark = (props: RenderMarkProps, editor: Slate.Editor, next: () => any): any => {
    const {
      children,
      mark: { type },
      attributes,
    } = props;

    switch (type) {
      case MARK.strong:
      case MARK.em:
      case MARK.u:
      case MARK.s:
        return React.createElement(type, attributes, children);
      default:
        return this.props.renderMark(props, editor, next);
    }
  };

  private onKeyDown = (event: KeyboardEvent, editor: Slate.Editor, next: () => void) => {
    const { value } = editor;
    if (isHotkey('enter', event)) {
      if (value.selection.isCollapsed && value.endBlock.type === Block.li && value.endBlock.text === '') {
        // we are inside list and clicking enter on the empty li element
        editor.unwrapBlock(Block.ol).unwrapBlock(Block.ul).setBlocks(DEFAULT_BLOCK);
      } else if (
        value.selection.isCollapsed &&
        value.selection.start.isAtEndOfNode(value.endBlock) &&
        value.endBlock.type !== Block.li
      ) {
        editor.insertBlock(DEFAULT_BLOCK);
      } else {
        next();
      }
    } else if (isHotkey('tab', event)) {
      event.preventDefault();
      if (value.selection.end.isInNode(value.document.nodes.last())) {
        editor.moveToEndOfBlock().insertBlock(DEFAULT_BLOCK);
      } else {
        editor.moveToStartOfNextBlock();
      }
    } else {
      next();
    }
  };

  private onFocus = () => {};

  componentDidUpdate() {
    // when slate Value is rendered we need to find top most block for sidebar positioning

    const { anchorBlock } = this.state;
    const { value } = this.props;
    let topAnchor = value.anchorBlock;
    if (value.anchorBlock?.type === Block.li) {
      topAnchor = value.document.getFurthestBlock(value.anchorBlock.key);
    }

    if (anchorBlock !== topAnchor) {
      this.setState({ anchorBlock: topAnchor });
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    return (
      <div className={styles.narrativeHolder}>
        <Toolbar
          saving={this.props.saving}
          value={this.props.value}
          anchorBlock={this.state.anchorBlock}
          editor={this.editorRef}
          options={this.state.availableTemplates}
          onDocumentSave={this.props.onSave}
        />
        <div className={styles.sidebarAndEditorHolder}>
          <div className={styles.titleHolder}>
            {this.props.documentIri ? (
              <Draggable iri={this.props.documentIri}>
                <span className={styles.draggableGripper}></span>
              </Draggable>
            ) : null}
            <FormGroup bsClass={`form-group ${styles.titleInput}`}>
              <FormControl
                value={this.props.title}
                type="text"
                onChange={(event) => this.props.onChangeTitle((event.target as any).value)}
                placeholder="Please enter document title"
              />
            </FormGroup>
          </div>
          <div className={styles.editorContainer}>
            <Editor
              ref={this.editorRef}
              spellCheck={false}
              value={this.props.value}
              renderMark={this.renderMark}
              renderNode={this.renderBlock}
              onKeyDown={this.onKeyDown}
              onDrop={() => {
                /**/
              }}
              onFocus={this.onFocus}
              onChange={this.onChange}
              onSelect={this.props.onSelect}
              plugins={plugins}
              schema={schema}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default TextEditor;
