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

import { Component, createFactory, createElement, MouseEvent, KeyboardEvent } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import * as classnames from 'classnames';
import * as Kefir from 'kefir';
import * as assign from 'object-assign';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import {
  Editor as EditorComponent, EditorState, RichUtils, CompositeDecorator, ContentState, Entity, Modifier,
  SelectionState, AtomicBlockUtils, ContentBlock, convertToRaw, convertFromRaw, convertFromHTML,
} from 'draft-js';
import 'draft-js/dist/Draft.css';

import { SparqlClient } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { constructUrlForResource } from 'platform/api/navigation';
import { getLabel } from 'platform/api/services/resource-label';
import { DragAndDropApi } from 'platform/components/dnd';
import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';

import {RdfaLink} from '../../services/LDPAnnotationService';

import {AutoCompletionInput} from 'platform/components/ui/inputs';

import '../../scss/annotation-component.scss';


const Button = createFactory(ReactBootstrap.Button);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);
const ButtonGroup = createFactory(ReactBootstrap.ButtonGroup);
const Popover = createFactory(ReactBootstrap.Popover);
const Overlay = createFactory(ReactBootstrap.Overlay);

const Modal = createFactory(ReactBootstrap.Modal);
const ModalHeader = createFactory(ReactBootstrap.ModalHeader);
const ModalTitle = createFactory(ReactBootstrap.ModalTitle);
const ModalBody = createFactory(ReactBootstrap.ModalBody);
const ModalFooter = createFactory(ReactBootstrap.ModalFooter);
const Radio = createFactory(ReactBootstrap.Radio);
const FormGroup = createFactory(ReactBootstrap.FormGroup);
const ControlLabel = createFactory(ReactBootstrap.ControlLabel);

const Editor = createFactory(EditorComponent);



function findEntityStrategy(entityType: string) {
  return (contentBlock, callback) => {
    contentBlock.findEntityRanges((character) => {
      const entityKey = character.getEntity();
      return entityKey !== null && Entity.get(entityKey).getType() === entityType;
    }, callback);
  };
}

const Link = (props) => {
  const {url} = Entity.get(props.entityKey).getData();
  if (props.blockProps.parentEditor.props.readOnly === true) {
    return D.a({
      href: url,
      target: '_blank',
    }, props.children);
  } else {
    return D.a({
      href: url,
      title: 'Ctrl-click to go to ' + url,
      onClick: (e: MouseEvent<any>) => {
        if (e.ctrlKey) {
          window.open(url, '_blank');
        }
      },
    }, props.children);
  }
};


interface DropTemplateConfigItem {
  // URI of type template could be applied to
  type: string
  // Human-readable description of template
  label: string
  template: string
}

type SemanticBlockAlignment = 'pull-left' | 'pull-right' | '';

interface SemanticBlockData {
  init: boolean
  iri: string
  href: string
  rel: string
  relBinding?: SparqlClient.Binding
  rdfaRelationQuery: any
  templates: DropTemplateConfigItem[]
  selectedTemplateIndex: number | 'inline'
  align: SemanticBlockAlignment
}

const findTemplatesForUri = (
  dropTemplateConfig: DropTemplateConfigItem[], uri: string
): Kefir.Property<DropTemplateConfigItem[]> => {
  const query = new SparqlJs.Parser().parse(`
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?type ?label ?lang WHERE {
      <${uri}> a ?type .
      OPTIONAL {
        ?type rdfs:label ?label .
        BIND(LANG(?label) AS ?lang)
      }
    }
  `);
  return SparqlClient.select(query).map((result: SparqlClient.SparqlSelectResult) => {
    const types = result.results.bindings;
    let possibleTemplates = [];
    dropTemplateConfig.map(configItem => {
      const {type} = configItem;
      if (type === 'any' || _.find(types, value => value['type'].value === type)) {
        possibleTemplates.push(configItem);
      }
    });
    return possibleTemplates;
  });
};


function selectTemplate(templates: DropTemplateConfigItem[], index: number | 'inline'): string {
  return index === 'inline' ?
    '<semantic-link uri="{{uri}}"></semantic-link>' :
    templates[index].template;
}


interface SemanticBlockProps {
  block?: ContentBlock
  entityKey?: string
  blockProps: {
    parentEditor?: AnnotationTextEditorComponent
    block?: boolean
  }
}
class SemanticBlock extends Component<SemanticBlockProps, {}> {
  constructor(props) {
    super(props);
  }

  componentWillMount() {
    this.props.blockProps.parentEditor.notifyMount(this.getEntityKey(), this);
  }

  componentDidMount() {
    if (this.getData().init) {
      this.setData({init: false});
      this.showModal();
    }
  }

  showModal(newValue = true) {
    this.props.blockProps.parentEditor.showModalFor(this, newValue);
  }
  hideModal() { this.showModal(false); }

  getEntityKey(): string {
    return this.props.block ?
      this.props.block.getEntityAt(0) :
      this.props.entityKey;
  }
  getData(): SemanticBlockData {
    return Entity.get(this.getEntityKey()).getData() as SemanticBlockData;
  }
  setData(data) {
    Entity.mergeData(this.getEntityKey(), data);
    this.forceUpdate();
  }
  setDataRdfaRelation(newRelation: SparqlClient.Binding) {
    if (newRelation) {
      this.setData({
        rel: newRelation[this.getData().rdfaRelationQuery.uriBindingName].value,
        relBinding: newRelation,
      });
    }
  }

  renderTemplate() {
    const {iri, templates, selectedTemplateIndex} = this.getData();
    return createElement(TemplateItem, {template: {
      source: selectTemplate(templates, selectedTemplateIndex),
      options: {iri: Rdf.iri(iri)},
    }});
  }

  PropertiesButtonSize = 16;

  renderPropertiesButton() {
    const {rel} = this.getData();
    return D.div({
      className: classnames({
        'semantic-inline--rdfa-set': rel !== null,
        'semantic-inline--rdfa-unset': rel === null,
      }),
      style: {
        position: 'absolute',
        top: 0, right: 0, width: this.PropertiesButtonSize, height: this.PropertiesButtonSize,
        zIndex: 5, cursor: 'pointer',
      },
      onClickCapture: (e: MouseEvent<any>) => {
        e.stopPropagation();
        this.showModal();
      },
    });
  }

  renderAsBlock() {
    if (this.props.blockProps.parentEditor.props.readOnly === true) {
      return this.renderTemplate();
    }
    return D.div({className: 'semantic-block__container'},
      D.div({className: 'semantic-block__shield'}),
      this.renderPropertiesButton(),
      this.renderTemplate()
    );
  }

  // Hack: draft-js become crazy if any DOM element appears inside inline text block
  // so we need to indicate and setup props of semantic-inline by background and click position
  isInsidePropertiesButton(e: MouseEvent<HTMLAnchorElement>): boolean {
    const box = (e.target as HTMLAnchorElement).getBoundingClientRect();
    const [x, y] = [e.clientX, e.clientY];
    return box.right - x < this.PropertiesButtonSize && y - box.top < this.PropertiesButtonSize;
  }

  renderAsInline() {
    const {iri, href, rel} = this.getData();
    return D.a(
      {
        className: classnames({
          'semantic-inline--rdfa-set': rel !== null,
          'semantic-inline--rdfa-unset': rel === null,
        }),
        href: href,
        title: 'Ctrl-click to go to page for ' + iri,
        onMouseDownCapture: (e: MouseEvent<HTMLAnchorElement>) => {
          if (this.isInsidePropertiesButton(e)) {
            e.stopPropagation();
          }
        },
        onClickCapture: (e: MouseEvent<HTMLAnchorElement>) => {
          if (this.isInsidePropertiesButton(e)) {
            e.stopPropagation();
            this.showModal();
          }
        },
        onClick: (e: MouseEvent<any>) => {
          if (e.ctrlKey) {
            window.open(href, '_blank');
          }
        },
      },
      this.props.children
    );
  }

  render() {
    if (this.props.block) {
      return this.renderAsBlock();
    } else {
      return this.renderAsInline();
    }
  }
}



function makeSelection(
  blockStart: string, offsetStart: number, blockEnd: string, offsetEnd: number, hasFocus?: boolean
): SelectionState {
  return new SelectionState({
    anchorKey: blockStart,
    anchorOffset: offsetStart,
    focusKey: blockEnd,
    focusOffset: offsetEnd,
    isBackward: false,
    hasFocus: hasFocus === undefined ? false : hasFocus,
  });
}
function makeBlockInnerSelection(blockKey: string, start: number, end?: number): SelectionState {
  return makeSelection(blockKey, start, blockKey, end === undefined ? start : end);
}

interface AnnotationSemanticEditorComponentProps {
  show: boolean
  editor: AnnotationTextEditorComponent
  semanticToEdit?: SemanticBlock
}

interface AnnotationSemanticEditorComponentState {
  waitingForSemanticWithEntityKey?: string
  selectedRdfaRelItem?: SparqlClient.Binding
}

class AnnotationSemanticEditorComponent extends
  Component<AnnotationSemanticEditorComponentProps, AnnotationSemanticEditorComponentState> {
  constructor(props) {
    super(props);
    this.state = {
      waitingForSemanticWithEntityKey: null,
      selectedRdfaRelItem: null,
    };
  }

  notifyMount(entityKey: string, ptr: SemanticBlock) {
    if (entityKey === this.state.waitingForSemanticWithEntityKey) {
      this.props.editor.changeCurrentSemanticBlock(ptr);
      this.setState({waitingForSemanticWithEntityKey: null});
    }
  }

  changeTemplateFromBlockToInline() {
    let data = this.props.semanticToEdit.getData();
    data.selectedTemplateIndex = 'inline';
    const newInlineEntityKey = Entity.create('SEMANTIC-INLINE', 'MUTABLE', data);
    this.setState({waitingForSemanticWithEntityKey: newInlineEntityKey}, () => {
      const {editor} = this.props;
      const {block} = this.props.semanticToEdit.props;
      const initialState = editor.state.editorState;
      const labelStream = Kefir.zip([
        getLabel(Rdf.iri(data.iri)).take(1),
        constructUrlForResource(Rdf.iri(data.iri)).take(1),
      ]);
      const onGotLabel = ([label, url]) => {
        labelStream.offValue(onGotLabel);
        Entity.mergeData(newInlineEntityKey, {href: url.valueOf()});

        const selection = makeBlockInnerSelection(block.getKey(), 0, block.getLength());
        const modifiedBlockContent = Modifier.setBlockType(initialState.getCurrentContent(), selection, 'unstyled');
        const afterSetTextContent = Modifier.replaceText(modifiedBlockContent, selection, label, null, newInlineEntityKey);

        const newEditorState = EditorState.set(initialState, {currentContent: afterSetTextContent});
        const selectionFinal = makeBlockInnerSelection(block.getKey(), 0);
        const newEditorStateWithSelection = EditorState.forceSelection(newEditorState, selectionFinal);
        editor.onChange(newEditorStateWithSelection);
      };
      labelStream.onValue(onGotLabel);
    });
  }

  changeTemplateFromInlineToBlock(newIndex) {
    let data = this.props.semanticToEdit.getData();
    data.selectedTemplateIndex = newIndex;
    const newBlockEntityKey = Entity.create('SEMANTIC-BLOCK', 'IMMUTABLE', data);
    this.setState({waitingForSemanticWithEntityKey: newBlockEntityKey}, () => {
      const {editor} = this.props;
      const {entityKey} = this.props.semanticToEdit.props;
      const initialState = editor.state.editorState;

      let insertIntoBlock = null;
      let insertAtOffset = null;
      initialState.getCurrentContent().getBlockMap().valueSeq().forEach((block: ContentBlock) => {
        block.findEntityRanges((character) => character.getEntity() === entityKey, (start, end) => {
          insertIntoBlock = block.getKey();
          insertAtOffset = end;
        });
      });
      if (insertIntoBlock === null || insertAtOffset === null) {
        throw 'Can not find anything that has entityKey=' + entityKey;
      }

      const selection = makeBlockInnerSelection(insertIntoBlock, insertAtOffset);
      const withDropSelection = EditorState.forceSelection(initialState, selection);
      const afterInsertBlock = AtomicBlockUtils.insertAtomicBlock(withDropSelection, newBlockEntityKey, ' ');

      let withoutEntityRangesContent = afterInsertBlock.getCurrentContent();
      afterInsertBlock.getCurrentContent().getBlockMap().valueSeq().forEach((block: ContentBlock) => {
        let ranges = [];
        block.findEntityRanges((character) => character.getEntity() === entityKey, (start, end) => {
          ranges.push([start, end]);
        });
        ranges.reverse().forEach(([start, end]) => {
          const selection = makeBlockInnerSelection(block.getKey(), start, end);
          withoutEntityRangesContent = Modifier.removeRange(withoutEntityRangesContent, selection, 'forward');
        });
      });

      const newEditorState = EditorState.set(afterInsertBlock, {currentContent: withoutEntityRangesContent});
      const newEditorStateWithSelection = EditorState.forceSelection(newEditorState, selection);
      editor.onChange(newEditorStateWithSelection);
    });
  }

  changeTemplate(newIndex: number | 'inline') {
    const {semanticToEdit} = this.props;
    const prevIndex = semanticToEdit.getData().selectedTemplateIndex;
    if (prevIndex !== newIndex) {
      if (newIndex === 'inline') {
        this.changeTemplateFromBlockToInline();
      } else if (prevIndex === 'inline') {
        this.changeTemplateFromInlineToBlock(newIndex);
      } else {
        semanticToEdit.setData({selectedTemplateIndex: newIndex});
        this.forceUpdate();
      }
    }
  }

  changeAlign(newAlign: SemanticBlockAlignment) {
    const {semanticToEdit} = this.props;
    semanticToEdit.setData({align: newAlign});
    this.forceUpdate();
  }

  hideModal() {
    this.props.editor.hideModal();
  }

  render() {
    const {show, semanticToEdit} = this.props;
    if (semanticToEdit === null || this.state.waitingForSemanticWithEntityKey !== null) {
      return Modal(
        {
          show: show,
          onHide: () => this.hideModal(),
        },
        ModalBody({}, createElement(Spinner))
      );
    }

    const {templates, selectedTemplateIndex, iri, rel, relBinding, rdfaRelationQuery, align} = semanticToEdit.getData();
    return Modal(
      {
        show: show,
        onHide: () => this.hideModal(),
      },
      ModalHeader({}, ModalTitle({},
        'Set properties for block ',
        createElement(ResourceLinkComponent, {uri: iri}), '   ',
        Button({
          onClick: () => {
            const {editor, semanticToEdit} = this.props;
            editor.hideModal();
            editor.removeBlock(semanticToEdit);
          },
        }, 'Remove')
      )),
      ModalBody({},
        'Display Entity as:',
        FormGroup({},
          Radio({
            name: 'semantic-template',
            value: 'inline',
            checked: selectedTemplateIndex === 'inline',
            onChange: () => this.changeTemplate('inline'),
          }, 'link'),
          ...templates.map(({type, label}, index) => Radio({
            name: 'semantic-template',
            value: index,
            checked: selectedTemplateIndex === index,
            onChange: () => this.changeTemplate(index),
          }, label))
        ),
        'Semantic Relation:',
        FormGroup({},
                  createElement(AutoCompletionInput, assign(
            rdfaRelationQuery,
            {
              autoload: true,
              value: relBinding,
              actions: {
                onSelected: (item: SparqlClient.Binding) => {
                  semanticToEdit.setDataRdfaRelation(item);
                  this.forceUpdate();
                },
              },
            }
          ))
        ),
        'Align:',
        FormGroup({},
          ButtonGroup({},
            Button({active: align === 'pull-left', onClick: () => this.changeAlign('pull-left')}, 'Left'),
            Button({active: align === '', onClick: () => this.changeAlign('')}, 'Center'),
            Button({active: align === 'pull-right', onClick: () => this.changeAlign('pull-right')}, 'Right')
          )
        )
      ),
      ModalFooter({}, Button({
        onClick: () => this.hideModal(),
      }, 'OK'))
    );
  }
}

const AnnotationSemanticEditor = createFactory(AnnotationSemanticEditorComponent);



interface Props {
  readOnly: boolean
  annotationIri?: Rdf.Iri
  initText?: string
  rdfaRelationQueryConfig?: any
  dropTemplateConfig?: Array<DropTemplateConfigItem>
}

interface State {
  editorState: EditorState
  urlValue: string
  showURLInput: boolean

  showSemanticModalEditor: boolean
  semanticToEdit: SemanticBlock

  anchorKey: string
  anchorOffset: number
  focusKey: string
  focusOffset: number
}

class AnnotationTextEditorComponent extends Component<Props, State> {
  decorators: CompositeDecorator;

  constructor(props) {
    super(props);

    this.decorators = new CompositeDecorator([{
      strategy: findEntityStrategy('LINK'),
      component: Link,
      props: {
        blockProps: {
          parentEditor: this,
        },
      },
    }, {
      strategy: findEntityStrategy('SEMANTIC-INLINE'),
      component: SemanticBlock,
      props: {
        blockProps: {
          parentEditor: this,
        },
      },
    }]);

    const initState = props.initText ?
      convertFromRaw(JSON.parse(props.initText)) :
      ContentState.createFromBlockArray(convertFromHTML(''));
    this.state = {
      editorState: EditorState.createWithContent(initState, this.decorators),
      urlValue: '',
      showURLInput: false,
      showSemanticModalEditor: false,
      semanticToEdit: null,

      anchorKey: null,
      anchorOffset: null,
      focusKey: null,
      focusOffset: null,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.initText !== nextProps.initText) {
      let initState = ContentState.createFromBlockArray(convertFromHTML(nextProps.initText ? nextProps.initText : ''));
      try {
        initState = convertFromRaw(JSON.parse(nextProps.initText));
      } catch (e) { }
      this.setState(state => {
        const editorState = EditorState.createWithContent(initState, this.decorators);
        return {editorState};
      });
    }
  }

  getValue(): string { return JSON.stringify(convertToRaw(this.state.editorState.getCurrentContent())); }
  isEmpty(): boolean { return !this.state.editorState.getCurrentContent().hasText(); }

  getSemanticItemsData(editorState: EditorState): SemanticBlockData[] {
    const blocks = editorState.getCurrentContent().getBlockMap().valueSeq();
    let result = [];
    const semanticInlineStrategy = findEntityStrategy('SEMANTIC-INLINE');
    blocks.forEach(block => {
      if (block.getType() === 'atomic') {
        result.push(Entity.get(block.getEntityAt(0)).getData());
      } else {
        semanticInlineStrategy(block, (start, end) => {
          result.push(Entity.get(block.getEntityAt(start)).getData());
        });
      }
    });
    return result;
  }

  allRdfaRelationsAreSet(): boolean {
    return _.every(this.getSemanticItemsData(this.state.editorState).map(data => {
      return data.rel !== null;
    }));
  }

  getRdfaLinks(): RdfaLink[] {
    return this.getSemanticItemsData(this.state.editorState).map(data => {
      const {rel, iri} = data;
      return {
        predicate: Rdf.iri(rel),
        object: Rdf.iri(iri),
      };
    });
  }

  onChange = (editorState: EditorState) => {
    // Every atomic block should contain entity at offset 0 or change will be discarded
    const blocks = editorState.getCurrentContent().getBlockMap().valueSeq();
    if (_.some(
      blocks.map(block => block.getType() === 'atomic' && block.getEntityAt(0) === null).toJS()
    )) {
      return;
    }

    this.setState(state => {
      const selection = editorState.getSelection();
      return {
        editorState,
        anchorKey: selection.getAnchorKey(),
        anchorOffset: selection.getAnchorOffset(),
        focusKey: selection.getFocusKey(),
        focusOffset: selection.getFocusOffset(),
      };
    });
  }

  focus = () => (this.refs['editor'] as any).focus();
  onTab = (e) => this.onChange(RichUtils.onTab(e, this.state.editorState, 4));
  toggleBlockType = (blockType) => this.onChange(RichUtils.toggleBlockType(this.state.editorState, blockType));
  toggleInlineStyle = (inlineStyle) => this.onChange(RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle));
  handleKeyCommand = (command) => {
    const {editorState} = this.state;
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return true;
    }
    return false;
  }

  handleDrop = (selection: SelectionState, dataTransfer: Object, isInternal: any): boolean => {
    if ((dataTransfer as any).types.find(item => item === DragAndDropApi.DRAG_AND_DROP_FORMAT)) {
      const urlValue = (dataTransfer as any).data.getData(DragAndDropApi.DRAG_AND_DROP_FORMAT);
      this.insertSemanticBlock(selection, urlValue);
      return true;
    }
    return false;
  }

  removeBlock = (semanticBlock: SemanticBlock) => {
    const {editorState} = this.state;
    const contentState = editorState.getCurrentContent();
    const entityKey = semanticBlock.getEntityKey();
    let newContentState = contentState;
    let removeBlockKey = null;
    let selectionFinal = null;
    contentState.getBlockMap().valueSeq().forEach((block: ContentBlock) => {
      const blockKey = block.getKey();
      // atomic can be removed from next block (it always present in draft-js)
      if (removeBlockKey !== null) {
        const selection = makeSelection(removeBlockKey, 0, blockKey, 0);
        newContentState = Modifier.removeRange(newContentState, selection, 'forward');
        newContentState = Modifier.setBlockType(newContentState, makeBlockInnerSelection(removeBlockKey, 0), 'unstyled');
        selectionFinal = makeBlockInnerSelection(removeBlockKey, 0);
        removeBlockKey = null;
      }
      block.findEntityRanges((character) => character.getEntity() === entityKey, (start, end) => {
        if (block.getType() === 'atomic') {
          removeBlockKey = blockKey;
        } else {
          const selection = makeBlockInnerSelection(blockKey, start, end);
          newContentState = Modifier.removeRange(newContentState, selection, 'forward');
          selectionFinal = makeBlockInnerSelection(blockKey, start);
        }
      });
    });
    if (newContentState !== contentState) {
      let newEditorState = EditorState.set(editorState, {currentContent: newContentState});
      newEditorState = EditorState.forceSelection(newEditorState, selectionFinal);
      this.onChange(newEditorState);
    }
  }

  renderBlock = (contentBlock: ContentBlock) => {
    if (contentBlock.getType() === 'atomic') {
      const entity = Entity.get(contentBlock.getEntityAt(0));
      if (entity.getType() === 'SEMANTIC-BLOCK') {
        return {
          component: SemanticBlock,
          editable: false,
          props: {
            parentEditor: this,
            block: true,
          },
        };
      }
    }
  }

  renderBlockStyle = (contentBlock: ContentBlock) => {
    if (contentBlock.getType() === 'atomic') {
      const entity = Entity.get(contentBlock.getEntityAt(0));
      if (entity.getType() === 'SEMANTIC-BLOCK') {
        return (entity.getData() as SemanticBlockData).align;
      }
    }
  }

  notifyMount(entityKey: string, ptr: SemanticBlock) {
    (this.refs['semantic-editor'] as AnnotationSemanticEditorComponent).notifyMount(entityKey, ptr);
  }
  changeCurrentSemanticBlock(ptr: SemanticBlock) {
    this.setState({semanticToEdit: ptr});
  }
  showModalFor(ptr: SemanticBlock, show: boolean) {
    this.setState({
      showSemanticModalEditor: show,
      semanticToEdit: ptr,
    });
  }
  hideModal() {
    this.setState({
      showSemanticModalEditor: false,
      semanticToEdit: null,
    });
  }

  insertSemanticBlock = (selection: SelectionState, urlValue: string) => {
    findTemplatesForUri(this.props.dropTemplateConfig, urlValue).onValue(templates => {
      const data = {
        init: true,
        iri: urlValue,
        href: null,
        rel: this.props.rdfaRelationQueryConfig.defaultValue,
        relBinding: {
          'label': Rdf.literal(this.props.rdfaRelationQueryConfig.defaultValueLabel),
          'value': Rdf.iri(this.props.rdfaRelationQueryConfig.defaultValue),
        },
        rdfaRelationQuery: this.props.rdfaRelationQueryConfig,
        templates: templates,
        selectedTemplateIndex: 0,
        align: '',
      };
      const entityKey = Entity.create('SEMANTIC-BLOCK', 'IMMUTABLE', data);
      const withDropSelection = EditorState.forceSelection(this.state.editorState, selection);
      let afterInsertBlock = AtomicBlockUtils.insertAtomicBlock(withDropSelection, entityKey, ' ');
      this.onChange(afterInsertBlock);
    });
  }

  confirmUrl() {
    let {editorState, urlValue} = this.state;
    if (!/^(\w+:)?\/\//.test(urlValue)) {
      urlValue = 'http://' + urlValue;
    }
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const cursorKey = selection.getAnchorKey();
    const cursorOffset = selection.getAnchorOffset();
    const entityKey = contentState.getBlockForKey(cursorKey).getEntityAt(cursorOffset);

    let newEditorState;
    if (selection.isCollapsed() && entityKey !== null) {
      // we update href only if no selection and cursor in link
      Entity.mergeData(entityKey, {url: urlValue});
      newEditorState = editorState;
    } else {
      const newEntityKey = Entity.create('LINK', 'MUTABLE', {url: urlValue});
      const contentStateWithEntity = Modifier.applyEntity(contentState, selection, newEntityKey);
      newEditorState = EditorState.set(editorState, {currentContent: contentStateWithEntity});
    }

    this.onChange(newEditorState);
    this.hideLinkEditor();
  }

  hideLinkEditor() {
    this.setState({
      showURLInput: false,
      urlValue: '',
    }, () => {
      setTimeout(() => this.focus(), 0);
    });
  }

  showLinkEditor(currentUrl: string) {
    this.setState(state => {
      const showURLInput = !state.showURLInput;
      const urlValue = currentUrl;
      return {showURLInput, urlValue};
    }, () => {
      (this.refs['url-input'] as any).focus();
    });
  }

  removeLink() {
    const {editorState} = this.state;
    let selection = editorState.getSelection();

    if (selection.isCollapsed()) {
      const entityKey = this.getCurrentEntity();
      const contentState = editorState.getCurrentContent();
      const selectionKey = selection.getAnchorKey();
      const selectionOffset = selection.getAnchorOffset();
      const block = contentState.getBlockForKey(selectionKey);
      block.findEntityRanges((char) => {
        return char.getEntity() === entityKey;
      }, (start, end) => {
        if (start <= selectionOffset && selectionOffset <= end) {
          selection = makeSelection(selectionKey, start, selectionKey, end, editorState.getSelection().getHasFocus());
        }
      });
    }

    this.onChange(RichUtils.toggleLink(editorState, selection, null));
    // we need to set focus() in queue after last setState
    this.setState(state => state, () => {
      setTimeout(() => this.focus(), 0);
    });
  }

  getCurrentEntity(): string {
    const {editorState} = this.state;
    const selection = editorState.getSelection();
    const contentState = editorState.getCurrentContent();
    const startKey = selection.getStartKey();
    const startOffset = selection.getStartOffset();
    const entityKey = contentState.getBlockForKey(startKey).getEntityAt(startOffset);
    return entityKey;
  }

  renderLinkEditor(show: boolean, buttonRef: string, onConfirmUrl: Function) {
    return Overlay(
      {
        show: show,
        placement: 'bottom',
        container: document.body,
        target: () => this.refs[buttonRef],
      },
      Popover({id: 'popover'},
        D.div({className: 'input-group'},
          D.input({
            ref: 'url-input',
            className: 'form-control input-sm',
            type: 'text',
            value: this.state.urlValue,
            onChange: (e) => {
              const value = (e.target as any).value;
              this.setState({urlValue: value});
            },
            onKeyDown: (e: KeyboardEvent<any>) => {
              if (e.which === 13 && this.state.urlValue !== '') { // enter
                onConfirmUrl();
              } else if (e.which === 27) { // esc
                this.hideLinkEditor();
              }
            },
          }),
          D.span({className: 'input-group-btn'},
            Button({
              disabled: this.state.urlValue === '',
              bsSize: 'small',
              onClick: () => onConfirmUrl(),
            }, D.i({className: 'fa fa-check'})),
            Button({
              bsSize: 'small',
              onClick: () => this.hideLinkEditor(),
            }, D.i({className: 'fa fa-close'}))
          )
        )
      )
    );
  }

  renderToolbar() {
    const {editorState} = this.state;
    const currentEntity = this.getCurrentEntity();
    const currentUrl = currentEntity ? Entity.get(currentEntity).getData().url : '';
    const hasSelection = !editorState.getSelection().isCollapsed();
    const isCursorOnLink = currentUrl !== '';
    const shouldShowLinkButton = hasSelection || isCursorOnLink;

    return ButtonToolbar({className: 'annotation-text-editor-toolbar'},
      BlockStyleControls({
        editorState: editorState,
        onToggle: this.toggleBlockType,
      }),
      InlineStyleControls({
        editorState: editorState,
        onToggle: this.toggleInlineStyle,
      }),
      ButtonGroup(
        {},
        Button({
          ref: 'add-link-btn',
          bsSize: 'small',
          title: shouldShowLinkButton ? 'Add link' : 'Add link (select text or place cursor into link)',
          disabled: !shouldShowLinkButton,
          onClick: () => this.showLinkEditor(currentUrl),
        }, D.i({className: 'fa fa-link'})),
        this.renderLinkEditor(this.state.showURLInput, 'add-link-btn', () => this.confirmUrl()),
        Button({
          bsSize: 'small',
          title: 'Remove link',
          disabled: !isCursorOnLink,
          onClick: () => this.removeLink(),
        }, D.i({className: 'fa fa-unlink'}))
      )
    );
  }

  renderStatusBar() {
    const {editorState} = this.state;
    const text = editorState.getCurrentContent().getPlainText();
    let words = text.match(/[\w']+/g);
    if (words === null) {
      words = [];
    }
    return D.div({className: 'annotation-text-editor-statusbar'},
      words.length + ' word(s), ' + text.length + ' char(s)'
    );
  }

  render() {
    const {editorState, showSemanticModalEditor, semanticToEdit} = this.state;
    return D.div(
      {className: this.props.readOnly ? 'annotation-text-viewer-root' : 'annotation-text-editor-root'},
      this.props.readOnly ? null : this.renderToolbar(),
      D.div(
        {
          className: this.props.readOnly ? 'annotation-text-viewer' : 'annotation-text-editor',
          onClick: () => this.focus(),
        },
        Editor({
          ref: 'editor',
          readOnly: this.props.readOnly,
          blockRendererFn: this.renderBlock,
          blockStyleFn: this.renderBlockStyle,
          editorState: editorState,
          handleKeyCommand: this.handleKeyCommand,
          handleDrop: this.handleDrop.bind(this),
          onChange: this.onChange.bind(this),
          onTab: this.onTab.bind(this),
          spellCheck: true,
        }),
        AnnotationSemanticEditor({
          ref: 'semantic-editor',
          show: showSemanticModalEditor,
          editor: this,
          semanticToEdit: semanticToEdit,
        })
      ),
      this.props.readOnly ? null : this.renderStatusBar()
    );
  }
}


interface StyleButtonProps {
  active: boolean
  label: string
  title?: string
  style: any
  onToggle: (any) => void
}
const StyleButtonComponent = (props: StyleButtonProps) => Button(
  {
    bsSize: 'small',
    className: classnames({'annotation-text-editor-toolbar__toolbar__style-button': true, 'active': props.active}),
    title: props.title,
    onClick: () => {
      props.onToggle(props.style);
    },
  },
  (props.label.substr(0, 3) === 'fa-' ? D.i({className: 'fa ' + props.label}) : props.label)
);
const StyleButton = createFactory(StyleButtonComponent);


const BLOCK_TYPES = [
  {label: 'H1', style: 'header-one', title: 'Header 1'},
  {label: 'H2', style: 'header-two', title: 'Header 2'},
  {label: 'H3', style: 'header-three', title: 'Header 3'},
  {label: 'H4', style: 'header-four', title: 'Header 4'},
  {label: 'fa-quote-right', style: 'blockquote', title: 'Blockquote'},
  {label: 'fa-list-ul', style: 'unordered-list-item', title: 'Unordered list'},
  {label: 'fa-list-ol', style: 'ordered-list-item', title: 'Ordered list'},
];

const BlockStyleControls = (props) => {
  const {editorState} = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return ButtonGroup(
    {className: 'annotation-text-editor-toolbar__toolbar'},
    BLOCK_TYPES.map((type) =>
      StyleButton({
        key: type.label,
        active: type.style === blockType,
        label: type.label,
        title: type.title,
        style: type.style,
        onToggle: props.onToggle,
      })
    )
  );
};

const INLINE_STYLES = [
  {label: 'fa-bold', style: 'BOLD', title: 'Bold'},
  {label: 'fa-italic', style: 'ITALIC', title: 'Italic'},
  {label: 'fa-strikethrough', style: 'STRIKETHROUGH', title: 'Strikethrough'},
];

const InlineStyleControls = (props) => {
  const currentStyle = props.editorState.getCurrentInlineStyle();
  return ButtonGroup(
    {className: 'annotation-text-editor-toolbar__toolbar'},
    INLINE_STYLES.map(type =>
      StyleButton({
        key: type.label,
        active: currentStyle.has(type.style),
        label: type.label,
        title: type.title,
        style: type.style,
        onToggle: props.onToggle,
      })
    )
  );
};


export type component = AnnotationTextEditorComponent;
export const component = AnnotationTextEditorComponent;
export const factory = createFactory(AnnotationTextEditorComponent);
export default component;
