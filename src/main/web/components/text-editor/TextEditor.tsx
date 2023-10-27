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
import { FormControl, FormGroup } from 'react-bootstrap';
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

  /**
   * @default false
   */
  readonly?: boolean;

  /**
   * ID of the <semantic-link iri='http://help.researchspace.org/resource/Storage'>
   * storage</semantic-link> to load text document content.
   */
  storage: string;

  resourceTemplates: Array<ResourceTemplateConfig>

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
  generateIriQuery?: string

  /**
   * SPARQL construct query to generate additional meta-data which will be stored toghether with the file meta-data.
   *
   * Also the query can use some variables which will be bound with values at runtime:
   * * __contextUri__ - see `contextUri` property
   * * __resourceIri__ - IRI generated with `generateIdQuery`
   * * __mediaType__ - Medai type: jpg, pdf. By default = 'auto'
   * * __fileName__ - Name of the file
   */
  resourceQuery?: string

}

interface TextEditorState {
  value: Slate.Value
  title: string
  documentIri?: string
  fileName?: string
  anchorBlock?: Slate.Block
  availableTemplates: { [objectIri: string]: ResourceTemplateConfig[] }
  loading: boolean
  saving: boolean
}

const plugins = [
  {
    queries: {
      isEmptyFirstParagraph: (editor: Slate.Editor, node: Slate.Block) =>
        editor.value.document.nodes.size === 1 &&
        node.type === Block.empty &&
        node.text === ''
      ,
    },
  },
  PlaceholderPlugin({
    placeholder: 'Write your narrative',
    when: 'isEmptyFirstParagraph',
  }),
];

export class TextEditor extends Component<TextEditorProps, TextEditorState> {
  private editorRef: React.RefObject<Editor>;
  private readonly cancellation = new Cancellation();
  private templateSelection = this.cancellation.derive();

  static defaultProps: Partial<TextEditorProps> = {
    resourceTemplates: [],
    storage: 'runtime',
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
    `
  };

  state: TextEditorState = {
    value: Slate.Value.fromJS({
      document: {
        nodes: [
          {
            object: 'block' as const,
            type: Block.empty,
          },
        ],
      }
    }),
    title: 'Narrative Title',
    anchorBlock: null as Slate.Block,
    availableTemplates: {},
    loading: true,
    saving: false,
  };

  constructor(props: TextEditorProps, context) {
    super(props, context);
    this.editorRef = React.createRef<Editor>();
    this.state.loading = !!props.documentIri;
    this.state.documentIri = props.documentIri;
  }

  onChange = ({ value }: { value: Slate.Value }) => {
    this.setState({ value });
  }

  // + drag and drop
  getTypes = (iri: Rdf.Iri) => {
    return SparqlClient.select(
      `SELECT DISTINCT ?type WHERE { <${iri.value}> a ?type}`
    ).map(
      res => res.results.bindings.map(b => b['type'])
    );
  }

  findTemplatesForResource = (iri: Rdf.Iri) => {
    return this.getTypes(iri).map(
      types => this.props.resourceTemplates.filter(
        c => c.type === 'any' || _.find(types, t => t.value === c.type)
      )
    );
  }

  onResourceDrop = (node: Slate.Node) => (drop: Rdf.Iri) => {
    const editor = this.editorRef.current;
    editor
      .moveToRangeOfNode(node)
      .setBlocks({
        type: Block.embed, data: { attributes: { src: drop.value } }
      });

    this.templateSelection = this.cancellation.deriveAndCancel(this.templateSelection);
    this.templateSelection.map(
      this.findTemplatesForResource(drop)
    ).observe({
      value: configs => {
        const { availableTemplates } = this.state;
        availableTemplates[drop.value] = configs;
        const defaultTemplate = _.first(configs);
        this.setState(
          { availableTemplates },
          () => {
            editor
              .moveToRangeOfNode(node)
              .setBlocks({
                type: Block.embed,
                data: {
                  attributes: {
                    src: drop.value, type: RESOURCE_MIME_TYPE, template: defaultTemplate.id
                  }
                }
              });
          }
        );
      }
    });
  }

  // - drag and drop

  emptyBlock = (props: RenderNodeProps) => {
    return (
      <div {...props.attributes}>
      {
        this.props.readonly ? props.children :
        <DropArea
          shouldReactToDrag={iri => iri.value !== this.props.documentIri}
          dropMessage='Drop here to add item to the narrative.'
          onDrop={this.onResourceDrop(props.node)}
        >
          {props.children}
        </DropArea>
      }
      </div>
    );
  }

  renderTextBlock = (tag: string, props: RenderNodeProps): any => {
    const attributes = props.node.data.get('attributes', {});
    return React.createElement(tag, { ...props.attributes, ...attributes }, props.children);
  }

  renderBlock = (props: RenderNodeProps, editor: Slate.Editor, next: () => any): any => {
    const { node: { type }, attributes, children } = props;
    switch (type) {
      case Block.empty: return this.emptyBlock(props);
      case Block.embed:
        return <ResourceBlock {...attributes} {...props}
          resourceTemplates={this.props.resourceTemplates} />;
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
        return next();
    }
  }

  renderMark = (props: RenderMarkProps, _editor: Slate.Editor, next: () => any): any => {
    const { children, mark: { type }, attributes } = props;

    switch (type) {
      case MARK.strong:
      case MARK.em:
      case MARK.u:
      case MARK.s:
        return React.createElement(type, attributes, children);
      default: return next();
    }
  }

  private onKeyDown = (event: KeyboardEvent, editor: Slate.Editor, next: () => void) => {
    const { value } = editor;
    if (isHotkey('enter', event)) {
      if (
        value.selection.isCollapsed &&
        value.endBlock.type === Block.li &&
        value.endBlock.text === ''
      ) {
        // we are inside list and clicking enter on the empty li element
        editor
          .unwrapBlock(Block.ol)
          .unwrapBlock(Block.ul)
          .setBlocks(DEFAULT_BLOCK);
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
        editor
          .moveToEndOfBlock()
          .insertBlock(DEFAULT_BLOCK);
      } else {
        editor.moveToStartOfNextBlock();
      }
    } else {
      next();
    }
  }

  private onFocus = () => {
  }

  componentDidMount() {
    if (this.props.documentIri) {
      const documentIri = Rdf.iri(this.props.documentIri);
      this.cancellation.map(
        this.fetchDocument(documentIri)
      ).observe({
        value: this.onDocumentLoad,
        error: error => console.error(error)
      });
    }
  }

  componentDidUpdate() {
    // when slate Value is rendered we need to find top most block for sidebar positioning

    const { value, anchorBlock } = this.state;
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
    if (this.state.loading) {
      return <Spinner spinnerDelay={0} />;
    } else {
      return (
        <div className={styles.narrativeHolder}>
          {this.props.readonly ? null :
          <Toolbar
                  saving={this.state.saving}
                  value={this.state.value}
                  anchorBlock={this.state.anchorBlock}
                  editor={this.editorRef}
                  options={this.state.availableTemplates}
                  onDocumentSave={this.onDocumentSave}
          />
          }
            <div className={styles.sidebarAndEditorHolder}>
              <div className={styles.titleHolder}>
                {this.state.documentIri ? (
                <Draggable iri={this.state.documentIri}>
                  <span className={styles.draggableGripper} title='drag narrative'>
                    <i className='rs-icon rs-icon-drag_points'></i>
                  </span>
                </Draggable>
              ) : null}
              <FormGroup bsClass={`${styles.titleInput}`}>
                <FormControl
                  value={this.state.title} type='text' readOnly={this.props.readonly}
                  onChange={event => this.setState({title: (event.target as any).value})}
                  placeholder='Please enter document title'
                />
              </FormGroup>
              </div>
              <div className={styles.editorContainer}>
                <Editor
                  ref={this.editorRef}
                  readOnly={this.props.readonly}
                  spellCheck={false}
                  value={this.state.value}
                  renderMark={this.renderMark}
                  renderNode={this.renderBlock}
                  onKeyDown={this.onKeyDown}
                  onDrop={() => {/**/ } }
                  onFocus={this.onFocus}
                  schema={schema}
                  onChange={this.onChange}
                  plugins={plugins}
                />
              </div>
            </div>
        </div>
      );
    }
  }

  private onDocumentLoad = (payload: [string, string]) => {
    const [fileName, content] = payload;
    let htmlTitle: string;
    const slateHtml =
      new Html({
        rules: SLATE_RULES,
        defaultBlock: Block.p as any,
        parseHtml: (html: string) => {
          const parsed = new DOMParser().parseFromString(html, 'text/html');
          const { title, body } = parsed;
          htmlTitle = title;
          return body;
        }
      });

    const value = slateHtml.deserialize(content, { toJSON: true });

    // load templates for embeds
    const embeds =
      value.document.nodes
        .filter(
          n => n.object === 'block' && n.type === Block.embed
        ).reduce(
          (obj, n: Slate.BlockJSON) => {
            const iri = n.data.attributes.src;
            obj[iri] = this.findTemplatesForResource(Rdf.iri(iri));
            return obj;
          },
          {}
        ) as { string: Kefir.Property<any> };

    if (_.isEmpty(embeds)) {
      this.setState({
        value: Slate.Value.fromJS(value), fileName, loading: false, title: htmlTitle,
      });
    } else {
      Kefir.combine(
        embeds
      ).onValue(
        templates => this.setState({
          value: Slate.Value.fromJS(value), fileName, loading: false, title: htmlTitle,
          availableTemplates: templates
        })
      );
    }
  }

  private getFileManager(): FileManager {
    const { repository } = this.context.semanticContext;
    return new FileManager({ repository });
  }

  private fetchDocument(documentIri: Rdf.Iri): Kefir.Property<[string, string]> {
    return this.getFileManager().getFileResource(documentIri)
      .flatMap(resource => {
        const fileUrl = FileManager.getFileUrl(resource.fileName, this.props.storage);
        return requestAsProperty(
          http.get(fileUrl)
            .accept('text/html')
        ).map(
          response => ([resource.fileName, response.text] as [string, string])
        );
      })
      .toProperty();
  }

  private wrapInHtml(title: string, body: string) {
    return (
      `<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body>${body}</body>
</html>`
    );
  }


  private onDocumentSave = () => {
    this.setState({saving: true});
    const { value, title } = this.state;

    const html = new Html({ rules: SLATE_RULES });
    const content =
      this.wrapInHtml(title, html.serialize(value));

    const blob = new Blob([content]);
    const fileName =
      this.state.fileName || title.replace(/[^a-z0-9_\-]/gi, '_') + '.html';
    const file = new File([blob], fileName);

    const parsedResouercQuery =
      SparqlUtil.parseQuery(
        this.props.resourceQuery
      );
    const resourceQuery =
      SparqlUtil.serializeQuery(
        SparqlClient.setBindings(
          parsedResouercQuery, { '__label__': Rdf.literal(title) }
        )
      );

    this.cancellation.map(
      this.getFileManager().uploadFileAsResource({
        file,
        storage: this.props.storage,
        generateIriQuery: this.props.generateIriQuery,
        resourceQuery: resourceQuery,
        contextUri: 'http://www.researchspace.org/instances/narratives',
        fileNameHack: true
      })
    ).observe({
      value: resource => {
        this.setState({documentIri: resource.value, saving: false});
      },
      error: error => { console.log('error'); console.log(error) },
    });
  }
}

export default TextEditor;
