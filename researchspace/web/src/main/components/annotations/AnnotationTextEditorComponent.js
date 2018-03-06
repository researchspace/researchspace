Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var ReactBootstrap = require("react-bootstrap");
var classnames = require("classnames");
var Kefir = require("kefir");
var assign = require("object-assign");
var _ = require("lodash");
var sparqljs = require("sparqljs");
var draft_js_1 = require("draft-js");
require("draft-js/dist/Draft.css");
var sparql_1 = require("platform/api/sparql");
var rdf_1 = require("platform/api/rdf");
var components_1 = require("platform/api/navigation/components");
var navigation_1 = require("platform/api/navigation");
var resource_label_1 = require("platform/api/services/resource-label");
var dnd_1 = require("platform/components/dnd");
var template_1 = require("platform/components/ui/template");
var spinner_1 = require("platform/components/ui/spinner");
var inputs_1 = require("platform/components/ui/inputs");
require("../../scss/annotation-component.scss");
var Button = react_1.createFactory(ReactBootstrap.Button);
var ButtonToolbar = react_1.createFactory(ReactBootstrap.ButtonToolbar);
var ButtonGroup = react_1.createFactory(ReactBootstrap.ButtonGroup);
var Popover = react_1.createFactory(ReactBootstrap.Popover);
var Overlay = react_1.createFactory(ReactBootstrap.Overlay);
var Modal = react_1.createFactory(ReactBootstrap.Modal);
var ModalHeader = react_1.createFactory(ReactBootstrap.ModalHeader);
var ModalTitle = react_1.createFactory(ReactBootstrap.ModalTitle);
var ModalBody = react_1.createFactory(ReactBootstrap.ModalBody);
var ModalFooter = react_1.createFactory(ReactBootstrap.ModalFooter);
var Radio = react_1.createFactory(ReactBootstrap.Radio);
var FormGroup = react_1.createFactory(ReactBootstrap.FormGroup);
var ControlLabel = react_1.createFactory(ReactBootstrap.ControlLabel);
var Editor = react_1.createFactory(draft_js_1.Editor);
function findEntityStrategy(entityType) {
    return function (contentBlock, callback) {
        contentBlock.findEntityRanges(function (character) {
            var entityKey = character.getEntity();
            return entityKey !== null && draft_js_1.Entity.get(entityKey).getType() === entityType;
        }, callback);
    };
}
var Link = function (props) {
    var url = draft_js_1.Entity.get(props.entityKey).getData().url;
    if (props.blockProps.parentEditor.props.readOnly === true) {
        return react_1.DOM.a({
            href: url,
            target: '_blank',
        }, props.children);
    }
    else {
        return react_1.DOM.a({
            href: url,
            title: 'Ctrl-click to go to ' + url,
            onClick: function (e) {
                if (e.ctrlKey) {
                    window.open(url, '_blank');
                }
            },
        }, props.children);
    }
};
var findTemplatesForUri = function (dropTemplateConfig, uri) {
    var query = (new sparqljs.Parser()).parse("\n    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n    SELECT ?type ?label ?lang WHERE {\n      <" + uri + "> a ?type .\n      OPTIONAL {\n        ?type rdfs:label ?label .\n        BIND(LANG(?label) AS ?lang)\n      }\n    }\n  ");
    return sparql_1.SparqlClient.select(query).map(function (result) {
        var types = result.results.bindings;
        var possibleTemplates = [];
        dropTemplateConfig.map(function (configItem) {
            var type = configItem.type;
            if (type === 'any' || _.find(types, function (value) { return value['type'].value === type; })) {
                possibleTemplates.push(configItem);
            }
        });
        return possibleTemplates;
    });
};
function selectTemplate(templates, index) {
    return index === 'inline' ?
        '<semantic-link uri="{{uri}}"></semantic-link>' :
        templates[index].template;
}
var SemanticBlock = (function (_super) {
    tslib_1.__extends(SemanticBlock, _super);
    function SemanticBlock(props) {
        var _this = _super.call(this, props) || this;
        _this.PropertiesButtonSize = 16;
        return _this;
    }
    SemanticBlock.prototype.componentWillMount = function () {
        this.props.blockProps.parentEditor.notifyMount(this.getEntityKey(), this);
    };
    SemanticBlock.prototype.componentDidMount = function () {
        if (this.getData().init) {
            this.setData({ init: false });
            this.showModal();
        }
    };
    SemanticBlock.prototype.showModal = function (newValue) {
        if (newValue === void 0) { newValue = true; }
        this.props.blockProps.parentEditor.showModalFor(this, newValue);
    };
    SemanticBlock.prototype.hideModal = function () { this.showModal(false); };
    SemanticBlock.prototype.getEntityKey = function () {
        return this.props.block ?
            this.props.block.getEntityAt(0) :
            this.props.entityKey;
    };
    SemanticBlock.prototype.getData = function () {
        return draft_js_1.Entity.get(this.getEntityKey()).getData();
    };
    SemanticBlock.prototype.setData = function (data) {
        draft_js_1.Entity.mergeData(this.getEntityKey(), data);
        this.forceUpdate();
    };
    SemanticBlock.prototype.setDataRdfaRelation = function (newRelation) {
        if (newRelation) {
            this.setData({
                rel: newRelation[this.getData().rdfaRelationQuery.uriBindingName].value,
                relBinding: newRelation,
            });
        }
    };
    SemanticBlock.prototype.renderTemplate = function () {
        var _a = this.getData(), iri = _a.iri, templates = _a.templates, selectedTemplateIndex = _a.selectedTemplateIndex;
        return react_1.createElement(template_1.TemplateItem, { template: {
                source: selectTemplate(templates, selectedTemplateIndex),
                options: { iri: rdf_1.Rdf.iri(iri) },
            } });
    };
    SemanticBlock.prototype.renderPropertiesButton = function () {
        var _this = this;
        var rel = this.getData().rel;
        return react_1.DOM.div({
            className: classnames({
                'semantic-inline--rdfa-set': rel !== null,
                'semantic-inline--rdfa-unset': rel === null,
            }),
            style: {
                position: 'absolute',
                top: 0, right: 0, width: this.PropertiesButtonSize, height: this.PropertiesButtonSize,
                zIndex: 5, cursor: 'pointer',
            },
            onClickCapture: function (e) {
                e.stopPropagation();
                _this.showModal();
            },
        });
    };
    SemanticBlock.prototype.renderAsBlock = function () {
        if (this.props.blockProps.parentEditor.props.readOnly === true) {
            return this.renderTemplate();
        }
        return react_1.DOM.div({ className: 'semantic-block__container' }, react_1.DOM.div({ className: 'semantic-block__shield' }), this.renderPropertiesButton(), this.renderTemplate());
    };
    SemanticBlock.prototype.isInsidePropertiesButton = function (e) {
        var box = e.target.getBoundingClientRect();
        var _a = [e.clientX, e.clientY], x = _a[0], y = _a[1];
        return box.right - x < this.PropertiesButtonSize && y - box.top < this.PropertiesButtonSize;
    };
    SemanticBlock.prototype.renderAsInline = function () {
        var _this = this;
        var _a = this.getData(), iri = _a.iri, href = _a.href, rel = _a.rel;
        return react_1.DOM.a({
            className: classnames({
                'semantic-inline--rdfa-set': rel !== null,
                'semantic-inline--rdfa-unset': rel === null,
            }),
            href: href,
            title: 'Ctrl-click to go to page for ' + iri,
            onMouseDownCapture: function (e) {
                if (_this.isInsidePropertiesButton(e)) {
                    e.stopPropagation();
                }
            },
            onClickCapture: function (e) {
                if (_this.isInsidePropertiesButton(e)) {
                    e.stopPropagation();
                    _this.showModal();
                }
            },
            onClick: function (e) {
                if (e.ctrlKey) {
                    window.open(href, '_blank');
                }
            },
        }, this.props.children);
    };
    SemanticBlock.prototype.render = function () {
        if (this.props.block) {
            return this.renderAsBlock();
        }
        else {
            return this.renderAsInline();
        }
    };
    return SemanticBlock;
}(react_1.Component));
function makeSelection(blockStart, offsetStart, blockEnd, offsetEnd, hasFocus) {
    return new draft_js_1.SelectionState({
        anchorKey: blockStart,
        anchorOffset: offsetStart,
        focusKey: blockEnd,
        focusOffset: offsetEnd,
        isBackward: false,
        hasFocus: hasFocus === undefined ? false : hasFocus,
    });
}
function makeBlockInnerSelection(blockKey, start, end) {
    return makeSelection(blockKey, start, blockKey, end === undefined ? start : end);
}
var AnnotationSemanticEditorComponent = (function (_super) {
    tslib_1.__extends(AnnotationSemanticEditorComponent, _super);
    function AnnotationSemanticEditorComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            waitingForSemanticWithEntityKey: null,
            selectedRdfaRelItem: null,
        };
        return _this;
    }
    AnnotationSemanticEditorComponent.prototype.notifyMount = function (entityKey, ptr) {
        if (entityKey === this.state.waitingForSemanticWithEntityKey) {
            this.props.editor.changeCurrentSemanticBlock(ptr);
            this.setState(function (state) { state.waitingForSemanticWithEntityKey = null; return state; });
        }
    };
    AnnotationSemanticEditorComponent.prototype.changeTemplateFromBlockToInline = function () {
        var _this = this;
        var data = this.props.semanticToEdit.getData();
        data.selectedTemplateIndex = 'inline';
        var newInlineEntityKey = draft_js_1.Entity.create('SEMANTIC-INLINE', 'MUTABLE', data);
        this.setState(function (state) { state.waitingForSemanticWithEntityKey = newInlineEntityKey; return state; }, function () {
            var editor = _this.props.editor;
            var block = _this.props.semanticToEdit.props.block;
            var initialState = editor.state.editorState;
            var labelStream = Kefir.zip([
                resource_label_1.getLabel(rdf_1.Rdf.iri(data.iri)).take(1),
                navigation_1.constructUrlForResource(rdf_1.Rdf.iri(data.iri)).take(1),
            ]);
            var onGotLabel = function (_a) {
                var label = _a[0], url = _a[1];
                labelStream.offValue(onGotLabel);
                draft_js_1.Entity.mergeData(newInlineEntityKey, { href: url.valueOf() });
                var selection = makeBlockInnerSelection(block.getKey(), 0, block.getLength());
                var modifiedBlockContent = draft_js_1.Modifier.setBlockType(initialState.getCurrentContent(), selection, 'unstyled');
                var afterSetTextContent = draft_js_1.Modifier.replaceText(modifiedBlockContent, selection, label, null, newInlineEntityKey);
                var newEditorState = draft_js_1.EditorState.set(initialState, { currentContent: afterSetTextContent });
                var selectionFinal = makeBlockInnerSelection(block.getKey(), 0);
                var newEditorStateWithSelection = draft_js_1.EditorState.forceSelection(newEditorState, selectionFinal);
                editor.onChange(newEditorStateWithSelection);
            };
            labelStream.onValue(onGotLabel);
        });
    };
    AnnotationSemanticEditorComponent.prototype.changeTemplateFromInlineToBlock = function (newIndex) {
        var _this = this;
        var data = this.props.semanticToEdit.getData();
        data.selectedTemplateIndex = newIndex;
        var newBlockEntityKey = draft_js_1.Entity.create('SEMANTIC-BLOCK', 'IMMUTABLE', data);
        this.setState(function (state) { state.waitingForSemanticWithEntityKey = newBlockEntityKey; return state; }, function () {
            var editor = _this.props.editor;
            var entityKey = _this.props.semanticToEdit.props.entityKey;
            var initialState = editor.state.editorState;
            var insertIntoBlock = null;
            var insertAtOffset = null;
            initialState.getCurrentContent().getBlockMap().valueSeq().forEach(function (block) {
                block.findEntityRanges(function (character) { return character.getEntity() === entityKey; }, function (start, end) {
                    insertIntoBlock = block.getKey();
                    insertAtOffset = end;
                });
            });
            if (insertIntoBlock === null || insertAtOffset === null) {
                throw 'Can not find anything that has entityKey=' + entityKey;
            }
            var selection = makeBlockInnerSelection(insertIntoBlock, insertAtOffset);
            var withDropSelection = draft_js_1.EditorState.forceSelection(initialState, selection);
            var afterInsertBlock = draft_js_1.AtomicBlockUtils.insertAtomicBlock(withDropSelection, newBlockEntityKey, ' ');
            var withoutEntityRangesContent = afterInsertBlock.getCurrentContent();
            afterInsertBlock.getCurrentContent().getBlockMap().valueSeq().forEach(function (block) {
                var ranges = [];
                block.findEntityRanges(function (character) { return character.getEntity() === entityKey; }, function (start, end) {
                    ranges.push([start, end]);
                });
                ranges.reverse().forEach(function (_a) {
                    var start = _a[0], end = _a[1];
                    var selection = makeBlockInnerSelection(block.getKey(), start, end);
                    withoutEntityRangesContent = draft_js_1.Modifier.removeRange(withoutEntityRangesContent, selection, 'forward');
                });
            });
            var newEditorState = draft_js_1.EditorState.set(afterInsertBlock, { currentContent: withoutEntityRangesContent });
            var newEditorStateWithSelection = draft_js_1.EditorState.forceSelection(newEditorState, selection);
            editor.onChange(newEditorStateWithSelection);
        });
    };
    AnnotationSemanticEditorComponent.prototype.changeTemplate = function (newIndex) {
        var semanticToEdit = this.props.semanticToEdit;
        var prevIndex = semanticToEdit.getData().selectedTemplateIndex;
        if (prevIndex !== newIndex) {
            if (newIndex === 'inline') {
                this.changeTemplateFromBlockToInline();
            }
            else if (prevIndex === 'inline') {
                this.changeTemplateFromInlineToBlock(newIndex);
            }
            else {
                semanticToEdit.setData({ selectedTemplateIndex: newIndex });
                this.forceUpdate();
            }
        }
    };
    AnnotationSemanticEditorComponent.prototype.changeAlign = function (newAlign) {
        var semanticToEdit = this.props.semanticToEdit;
        semanticToEdit.setData({ align: newAlign });
        this.forceUpdate();
    };
    AnnotationSemanticEditorComponent.prototype.hideModal = function () {
        this.props.editor.hideModal();
    };
    AnnotationSemanticEditorComponent.prototype.render = function () {
        var _this = this;
        var _a = this.props, show = _a.show, semanticToEdit = _a.semanticToEdit;
        if (semanticToEdit === null || this.state.waitingForSemanticWithEntityKey !== null) {
            return Modal({
                show: show,
                onHide: function () { return _this.hideModal(); },
            }, ModalBody({}, react_1.createElement(spinner_1.Spinner)));
        }
        var _b = semanticToEdit.getData(), templates = _b.templates, selectedTemplateIndex = _b.selectedTemplateIndex, iri = _b.iri, rel = _b.rel, relBinding = _b.relBinding, rdfaRelationQuery = _b.rdfaRelationQuery, align = _b.align;
        return Modal({
            show: show,
            onHide: function () { return _this.hideModal(); },
        }, ModalHeader({}, ModalTitle({}, 'Set properties for block ', react_1.createElement(components_1.ResourceLinkComponent, { uri: iri }), '   ', Button({
            onClick: function () {
                var _a = _this.props, editor = _a.editor, semanticToEdit = _a.semanticToEdit;
                editor.hideModal();
                editor.removeBlock(semanticToEdit);
            },
        }, 'Remove'))), ModalBody({}, 'Display Entity as:', FormGroup.apply(void 0, [{},
            Radio({
                name: 'semantic-template',
                value: 'inline',
                checked: selectedTemplateIndex === 'inline',
                onChange: function () { return _this.changeTemplate('inline'); },
            }, 'link')].concat(templates.map(function (_a, index) {
            var type = _a.type, label = _a.label;
            return Radio({
                name: 'semantic-template',
                value: index,
                checked: selectedTemplateIndex === index,
                onChange: function () { return _this.changeTemplate(index); },
            }, label);
        }))), 'Semantic Relation:', FormGroup({}, react_1.createElement(inputs_1.AutoCompletionInput, assign(rdfaRelationQuery, {
            autoload: true,
            value: relBinding,
            actions: {
                onSelected: function (item) {
                    semanticToEdit.setDataRdfaRelation(item);
                    _this.forceUpdate();
                },
            },
        }))), 'Align:', FormGroup({}, ButtonGroup({}, Button({ active: align === 'pull-left', onClick: function () { return _this.changeAlign('pull-left'); } }, 'Left'), Button({ active: align === '', onClick: function () { return _this.changeAlign(''); } }, 'Center'), Button({ active: align === 'pull-right', onClick: function () { return _this.changeAlign('pull-right'); } }, 'Right')))), ModalFooter({}, Button({
            onClick: function () { return _this.hideModal(); },
        }, 'OK')));
    };
    return AnnotationSemanticEditorComponent;
}(react_1.Component));
var AnnotationSemanticEditor = react_1.createFactory(AnnotationSemanticEditorComponent);
var AnnotationTextEditorComponent = (function (_super) {
    tslib_1.__extends(AnnotationTextEditorComponent, _super);
    function AnnotationTextEditorComponent(props) {
        var _this = _super.call(this, props) || this;
        _this.onChange = function (editorState) {
            var blocks = editorState.getCurrentContent().getBlockMap().valueSeq();
            if (_.some(blocks.map(function (block) { return block.getType() === 'atomic' && block.getEntityAt(0) === null; }).toJS())) {
                return;
            }
            _this.setState(function (state) {
                state.editorState = editorState;
                var selection = editorState.getSelection();
                state.anchorKey = selection.getAnchorKey();
                state.anchorOffset = selection.getAnchorOffset();
                state.focusKey = selection.getFocusKey();
                state.focusOffset = selection.getFocusOffset();
                return state;
            });
        };
        _this.focus = function () { return _this.refs['editor'].focus(); };
        _this.onTab = function (e) { return _this.onChange(draft_js_1.RichUtils.onTab(e, _this.state.editorState, 4)); };
        _this.toggleBlockType = function (blockType) { return _this.onChange(draft_js_1.RichUtils.toggleBlockType(_this.state.editorState, blockType)); };
        _this.toggleInlineStyle = function (inlineStyle) { return _this.onChange(draft_js_1.RichUtils.toggleInlineStyle(_this.state.editorState, inlineStyle)); };
        _this.handleKeyCommand = function (command) {
            var editorState = _this.state.editorState;
            var newState = draft_js_1.RichUtils.handleKeyCommand(editorState, command);
            if (newState) {
                _this.onChange(newState);
                return true;
            }
            return false;
        };
        _this.handleDrop = function (selection, dataTransfer, isInternal) {
            if (dataTransfer.types.find(function (item) { return item === dnd_1.DragAndDropApi.DRAG_AND_DROP_FORMAT; })) {
                var urlValue = dataTransfer.data.getData(dnd_1.DragAndDropApi.DRAG_AND_DROP_FORMAT);
                _this.insertSemanticBlock(selection, urlValue);
                return true;
            }
            return false;
        };
        _this.removeBlock = function (semanticBlock) {
            var editorState = _this.state.editorState;
            var contentState = editorState.getCurrentContent();
            var entityKey = semanticBlock.getEntityKey();
            var newContentState = contentState;
            var removeBlockKey = null;
            var selectionFinal = null;
            contentState.getBlockMap().valueSeq().forEach(function (block) {
                var blockKey = block.getKey();
                if (removeBlockKey !== null) {
                    var selection = makeSelection(removeBlockKey, 0, blockKey, 0);
                    newContentState = draft_js_1.Modifier.removeRange(newContentState, selection, 'forward');
                    newContentState = draft_js_1.Modifier.setBlockType(newContentState, makeBlockInnerSelection(removeBlockKey, 0), 'unstyled');
                    selectionFinal = makeBlockInnerSelection(removeBlockKey, 0);
                    removeBlockKey = null;
                }
                block.findEntityRanges(function (character) { return character.getEntity() === entityKey; }, function (start, end) {
                    if (block.getType() === 'atomic') {
                        removeBlockKey = blockKey;
                    }
                    else {
                        var selection = makeBlockInnerSelection(blockKey, start, end);
                        newContentState = draft_js_1.Modifier.removeRange(newContentState, selection, 'forward');
                        selectionFinal = makeBlockInnerSelection(blockKey, start);
                    }
                });
            });
            if (newContentState !== contentState) {
                var newEditorState = draft_js_1.EditorState.set(editorState, { currentContent: newContentState });
                newEditorState = draft_js_1.EditorState.forceSelection(newEditorState, selectionFinal);
                _this.onChange(newEditorState);
            }
        };
        _this.renderBlock = function (contentBlock) {
            if (contentBlock.getType() === 'atomic') {
                var entity = draft_js_1.Entity.get(contentBlock.getEntityAt(0));
                if (entity.getType() === 'SEMANTIC-BLOCK') {
                    return {
                        component: SemanticBlock,
                        editable: false,
                        props: {
                            parentEditor: _this,
                            block: true,
                        },
                    };
                }
            }
        };
        _this.renderBlockStyle = function (contentBlock) {
            if (contentBlock.getType() === 'atomic') {
                var entity = draft_js_1.Entity.get(contentBlock.getEntityAt(0));
                if (entity.getType() === 'SEMANTIC-BLOCK') {
                    return entity.getData().align;
                }
            }
        };
        _this.insertSemanticBlock = function (selection, urlValue) {
            findTemplatesForUri(_this.props.dropTemplateConfig, urlValue).onValue(function (templates) {
                var data = {
                    init: true,
                    iri: urlValue,
                    href: null,
                    rel: _this.props.rdfaRelationQueryConfig.defaultValue,
                    relBinding: {
                        'label': rdf_1.Rdf.literal(_this.props.rdfaRelationQueryConfig.defaultValueLabel),
                        'value': rdf_1.Rdf.iri(_this.props.rdfaRelationQueryConfig.defaultValue),
                    },
                    rdfaRelationQuery: _this.props.rdfaRelationQueryConfig,
                    templates: templates,
                    selectedTemplateIndex: 0,
                    align: '',
                };
                var entityKey = draft_js_1.Entity.create('SEMANTIC-BLOCK', 'IMMUTABLE', data);
                var withDropSelection = draft_js_1.EditorState.forceSelection(_this.state.editorState, selection);
                var afterInsertBlock = draft_js_1.AtomicBlockUtils.insertAtomicBlock(withDropSelection, entityKey, ' ');
                _this.onChange(afterInsertBlock);
            });
        };
        _this.decorators = new draft_js_1.CompositeDecorator([{
                strategy: findEntityStrategy('LINK'),
                component: Link,
                props: {
                    blockProps: {
                        parentEditor: _this,
                    },
                },
            }, {
                strategy: findEntityStrategy('SEMANTIC-INLINE'),
                component: SemanticBlock,
                props: {
                    blockProps: {
                        parentEditor: _this,
                    },
                },
            }]);
        var initState = props.initText ?
            draft_js_1.convertFromRaw(JSON.parse(props.initText)) :
            draft_js_1.ContentState.createFromBlockArray(draft_js_1.convertFromHTML(''));
        _this.state = {
            editorState: draft_js_1.EditorState.createWithContent(initState, _this.decorators),
            urlValue: '',
            showURLInput: false,
            showSemanticModalEditor: false,
            semanticToEdit: null,
            anchorKey: null,
            anchorOffset: null,
            focusKey: null,
            focusOffset: null,
        };
        return _this;
    }
    AnnotationTextEditorComponent.prototype.componentWillReceiveProps = function (nextProps) {
        var _this = this;
        if (this.props.initText !== nextProps.initText) {
            var initState_1 = draft_js_1.ContentState.createFromBlockArray(draft_js_1.convertFromHTML(nextProps.initText ? nextProps.initText : ''));
            try {
                initState_1 = draft_js_1.convertFromRaw(JSON.parse(nextProps.initText));
            }
            catch (e) { }
            this.setState(function (state) {
                state.editorState = draft_js_1.EditorState.createWithContent(initState_1, _this.decorators);
                return state;
            });
        }
    };
    AnnotationTextEditorComponent.prototype.getValue = function () { return JSON.stringify(draft_js_1.convertToRaw(this.state.editorState.getCurrentContent())); };
    AnnotationTextEditorComponent.prototype.isEmpty = function () { return !this.state.editorState.getCurrentContent().hasText(); };
    AnnotationTextEditorComponent.prototype.getSemanticItemsData = function (editorState) {
        var blocks = editorState.getCurrentContent().getBlockMap().valueSeq();
        var result = [];
        var semanticInlineStrategy = findEntityStrategy('SEMANTIC-INLINE');
        blocks.forEach(function (block) {
            if (block.getType() === 'atomic') {
                result.push(draft_js_1.Entity.get(block.getEntityAt(0)).getData());
            }
            else {
                semanticInlineStrategy(block, function (start, end) {
                    result.push(draft_js_1.Entity.get(block.getEntityAt(start)).getData());
                });
            }
        });
        return result;
    };
    AnnotationTextEditorComponent.prototype.allRdfaRelationsAreSet = function () {
        return _.every(this.getSemanticItemsData(this.state.editorState).map(function (data) {
            return data.rel !== null;
        }));
    };
    AnnotationTextEditorComponent.prototype.getRdfaLinks = function () {
        return this.getSemanticItemsData(this.state.editorState).map(function (data) {
            var rel = data.rel, iri = data.iri;
            return {
                predicate: rdf_1.Rdf.iri(rel),
                object: rdf_1.Rdf.iri(iri),
            };
        });
    };
    AnnotationTextEditorComponent.prototype.notifyMount = function (entityKey, ptr) {
        this.refs['semantic-editor'].notifyMount(entityKey, ptr);
    };
    AnnotationTextEditorComponent.prototype.changeCurrentSemanticBlock = function (ptr) {
        this.setState(function (state) { state.semanticToEdit = ptr; return state; });
    };
    AnnotationTextEditorComponent.prototype.showModalFor = function (ptr, show) {
        this.setState(function (state) {
            state.showSemanticModalEditor = show;
            state.semanticToEdit = ptr;
            return state;
        });
    };
    AnnotationTextEditorComponent.prototype.hideModal = function () {
        this.setState(function (state) {
            state.showSemanticModalEditor = false;
            state.semanticToEdit = null;
            return state;
        });
    };
    AnnotationTextEditorComponent.prototype.confirmUrl = function () {
        var _a = this.state, editorState = _a.editorState, urlValue = _a.urlValue;
        if (!/^(\w+:)?\/\//.test(urlValue)) {
            urlValue = 'http://' + urlValue;
        }
        var selection = editorState.getSelection();
        var contentState = editorState.getCurrentContent();
        var cursorKey = selection.getAnchorKey();
        var cursorOffset = selection.getAnchorOffset();
        var entityKey = contentState.getBlockForKey(cursorKey).getEntityAt(cursorOffset);
        var newEditorState;
        if (selection.isCollapsed() && entityKey !== null) {
            draft_js_1.Entity.mergeData(entityKey, { url: urlValue });
            newEditorState = editorState;
        }
        else {
            var newEntityKey = draft_js_1.Entity.create('LINK', 'MUTABLE', { url: urlValue });
            var contentStateWithEntity = draft_js_1.Modifier.applyEntity(contentState, selection, newEntityKey);
            newEditorState = draft_js_1.EditorState.set(editorState, { currentContent: contentStateWithEntity });
        }
        this.onChange(newEditorState);
        this.hideLinkEditor();
    };
    AnnotationTextEditorComponent.prototype.hideLinkEditor = function () {
        var _this = this;
        this.setState(function (state) {
            state.showURLInput = false;
            state.urlValue = '';
            return state;
        }, function () {
            setTimeout(function () { return _this.focus(); }, 0);
        });
    };
    AnnotationTextEditorComponent.prototype.showLinkEditor = function (currentUrl) {
        var _this = this;
        this.setState(function (state) {
            state.showURLInput = !state.showURLInput;
            state.urlValue = currentUrl;
            return state;
        }, function () {
            _this.refs['url-input'].focus();
        });
    };
    AnnotationTextEditorComponent.prototype.removeLink = function () {
        var _this = this;
        var editorState = this.state.editorState;
        var selection = editorState.getSelection();
        if (selection.isCollapsed()) {
            var entityKey_1 = this.getCurrentEntity();
            var contentState = editorState.getCurrentContent();
            var selectionKey_1 = selection.getAnchorKey();
            var selectionOffset_1 = selection.getAnchorOffset();
            var block = contentState.getBlockForKey(selectionKey_1);
            block.findEntityRanges(function (char) {
                return char.getEntity() === entityKey_1;
            }, function (start, end) {
                if (start <= selectionOffset_1 && selectionOffset_1 <= end) {
                    selection = makeSelection(selectionKey_1, start, selectionKey_1, end, editorState.getSelection().getHasFocus());
                }
            });
        }
        this.onChange(draft_js_1.RichUtils.toggleLink(editorState, selection, null));
        this.setState(function (state) { return state; }, function () {
            setTimeout(function () { return _this.focus(); }, 0);
        });
    };
    AnnotationTextEditorComponent.prototype.getCurrentEntity = function () {
        var editorState = this.state.editorState;
        var selection = editorState.getSelection();
        var contentState = editorState.getCurrentContent();
        var startKey = selection.getStartKey();
        var startOffset = selection.getStartOffset();
        var entityKey = contentState.getBlockForKey(startKey).getEntityAt(startOffset);
        return entityKey;
    };
    AnnotationTextEditorComponent.prototype.renderLinkEditor = function (show, buttonRef, onConfirmUrl) {
        var _this = this;
        return Overlay({
            show: show,
            placement: 'bottom',
            container: document.body,
            target: function () { return _this.refs[buttonRef]; },
        }, Popover({ id: 'popover' }, react_1.DOM.div({ className: 'input-group' }, react_1.DOM.input({
            ref: 'url-input',
            className: 'form-control input-sm',
            type: 'text',
            value: this.state.urlValue,
            onChange: function (e) {
                var value = e.target.value;
                _this.setState(function (state) { state.urlValue = value; return state; });
            },
            onKeyDown: function (e) {
                if (e.which === 13 && _this.state.urlValue !== '') {
                    onConfirmUrl();
                }
                else if (e.which === 27) {
                    _this.hideLinkEditor();
                }
            },
        }), react_1.DOM.span({ className: 'input-group-btn' }, Button({
            disabled: this.state.urlValue === '',
            bsSize: 'small',
            onClick: function () { return onConfirmUrl(); },
        }, react_1.DOM.i({ className: 'fa fa-check' })), Button({
            bsSize: 'small',
            onClick: function () { return _this.hideLinkEditor(); },
        }, react_1.DOM.i({ className: 'fa fa-close' }))))));
    };
    AnnotationTextEditorComponent.prototype.renderToolbar = function () {
        var _this = this;
        var editorState = this.state.editorState;
        var currentEntity = this.getCurrentEntity();
        var currentUrl = currentEntity ? draft_js_1.Entity.get(currentEntity).getData().url : '';
        var hasSelection = !editorState.getSelection().isCollapsed();
        var isCursorOnLink = currentUrl !== '';
        var shouldShowLinkButton = hasSelection || isCursorOnLink;
        return ButtonToolbar({ className: 'annotation-text-editor-toolbar' }, BlockStyleControls({
            editorState: editorState,
            onToggle: this.toggleBlockType,
        }), InlineStyleControls({
            editorState: editorState,
            onToggle: this.toggleInlineStyle,
        }), ButtonGroup({}, Button({
            ref: 'add-link-btn',
            bsSize: 'small',
            title: shouldShowLinkButton ? 'Add link' : 'Add link (select text or place cursor into link)',
            disabled: !shouldShowLinkButton,
            onClick: function () { return _this.showLinkEditor(currentUrl); },
        }, react_1.DOM.i({ className: 'fa fa-link' })), this.renderLinkEditor(this.state.showURLInput, 'add-link-btn', function () { return _this.confirmUrl(); }), Button({
            bsSize: 'small',
            title: 'Remove link',
            disabled: !isCursorOnLink,
            onClick: function () { return _this.removeLink(); },
        }, react_1.DOM.i({ className: 'fa fa-unlink' }))));
    };
    AnnotationTextEditorComponent.prototype.renderStatusBar = function () {
        var editorState = this.state.editorState;
        var text = editorState.getCurrentContent().getPlainText();
        var words = text.match(/[\w']+/g);
        if (words === null) {
            words = [];
        }
        return react_1.DOM.div({ className: 'annotation-text-editor-statusbar' }, words.length + ' word(s), ' + text.length + ' char(s)');
    };
    AnnotationTextEditorComponent.prototype.render = function () {
        var _this = this;
        var _a = this.state, editorState = _a.editorState, showSemanticModalEditor = _a.showSemanticModalEditor, semanticToEdit = _a.semanticToEdit;
        return react_1.DOM.div({ className: this.props.readOnly ? 'annotation-text-viewer-root' : 'annotation-text-editor-root' }, this.props.readOnly ? null : this.renderToolbar(), react_1.DOM.div({
            className: this.props.readOnly ? 'annotation-text-viewer' : 'annotation-text-editor',
            onClick: function () { return _this.focus(); },
        }, Editor({
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
        }), AnnotationSemanticEditor({
            ref: 'semantic-editor',
            show: showSemanticModalEditor,
            editor: this,
            semanticToEdit: semanticToEdit,
        })), this.props.readOnly ? null : this.renderStatusBar());
    };
    return AnnotationTextEditorComponent;
}(react_1.Component));
var StyleButtonComponent = function (props) { return Button({
    bsSize: 'small',
    className: classnames({ 'annotation-text-editor-toolbar__toolbar__style-button': true, 'active': props.active }),
    title: props.title,
    onClick: function () {
        props.onToggle(props.style);
    },
}, (props.label.substr(0, 3) === 'fa-' ? react_1.DOM.i({ className: 'fa ' + props.label }) : props.label)); };
var StyleButton = react_1.createFactory(StyleButtonComponent);
var BLOCK_TYPES = [
    { label: 'H1', style: 'header-one', title: 'Header 1' },
    { label: 'H2', style: 'header-two', title: 'Header 2' },
    { label: 'H3', style: 'header-three', title: 'Header 3' },
    { label: 'H4', style: 'header-four', title: 'Header 4' },
    { label: 'fa-quote-right', style: 'blockquote', title: 'Blockquote' },
    { label: 'fa-list-ul', style: 'unordered-list-item', title: 'Unordered list' },
    { label: 'fa-list-ol', style: 'ordered-list-item', title: 'Ordered list' },
];
var BlockStyleControls = function (props) {
    var editorState = props.editorState;
    var selection = editorState.getSelection();
    var blockType = editorState
        .getCurrentContent()
        .getBlockForKey(selection.getStartKey())
        .getType();
    return ButtonGroup({ className: 'annotation-text-editor-toolbar__toolbar' }, BLOCK_TYPES.map(function (type) {
        return StyleButton({
            key: type.label,
            active: type.style === blockType,
            label: type.label,
            title: type.title,
            style: type.style,
            onToggle: props.onToggle,
        });
    }));
};
var INLINE_STYLES = [
    { label: 'fa-bold', style: 'BOLD', title: 'Bold' },
    { label: 'fa-italic', style: 'ITALIC', title: 'Italic' },
    { label: 'fa-strikethrough', style: 'STRIKETHROUGH', title: 'Strikethrough' },
];
var InlineStyleControls = function (props) {
    var currentStyle = props.editorState.getCurrentInlineStyle();
    return ButtonGroup({ className: 'annotation-text-editor-toolbar__toolbar' }, INLINE_STYLES.map(function (type) {
        return StyleButton({
            key: type.label,
            active: currentStyle.has(type.style),
            label: type.label,
            title: type.title,
            style: type.style,
            onToggle: props.onToggle,
        });
    }));
};
exports.component = AnnotationTextEditorComponent;
exports.factory = react_1.createFactory(AnnotationTextEditorComponent);
exports.default = exports.component;
