// Type definitions for draft-js 0.7.0
// Project: https://github.com/facebook/draft-js
// Definitions by: Felipe Rohde <https://github.com/feliperohdee>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference path='../../node_modules/immutable/dist/immutable.d.ts'/>

declare namespace draftComponent {
    module base {
        var DraftEditorProps: {
            // Basics
            editorState: draftModel.immutable.EditorState;
            onChange(editorState: draftModel.immutable.EditorState): void;
            // Presentation
            placeholder?: string;
            textAlignment?: DraftTextAlignment;
            blockRendererFn?: (block: draftModel.immutable.ContentBlock) => any;
            blockStyleFn?: (block: draftModel.immutable.ContentBlock) => string;
            customStyleMap?: any;
            customStyleFn?: Function;
            // Behavior
            readOnly?: boolean;
            spellCheck?: boolean;
            // Cancelable Handlers
            stripPastedStyles?: boolean;
            handleReturn?: (e: any) => boolean;
            handleKeyCommand?: (command: string) => boolean;
            handleBeforeInput?: (chars: string) => boolean;
            handlePastedFiles?: (files: Array<Blob>) => boolean;
            handleDroppedFiles?: (selection: draftModel.immutable.SelectionState, files: Array<Blob>) => boolean;
            handleDrop?: (selection: draftModel.immutable.SelectionState, dataTransfer: any, isInternal: draftModel.constants.DraftDragType) => boolean;
            // Key Handlers
            onEscape?: (e: any) => void;
            onTab?: (e: any) => void;
            onUpArrow?: (e: any) => void;
            onDownArrow?: (e: any) => void;
            // Methods
            focus(): void;
            blur(): void;
        }

        type DraftTextAlignment = 'left' | 'center' | 'right';
    }

    module selection {
        type FakeClientRect = {
            left: number,
            width: number,
            right: number,
            top: number,
            bottom: number,
            height: number
        }
    }

    module utils {
        var KeyBindingUtil: {
            isCtrlKeyCommand(e: any): boolean,
            isOptionKeyCommand(e: any): boolean,
            hasCommandModifier(e: any): boolean
        };
    }
}

declare namespace draftModel {
    module constants {
        type DraftBlockType = (
            'unstyled' |
            'paragraph' |
            'header-one' |
            'header-two' |
            'header-three' |
            'header-four' |
            'header-five' |
            'header-six' |
            'unordered-list-item' |
            'ordered-list-item' |
            'blockquote' |
            'code-block' |
            'atomic'
        );

        type DraftDragType = 'internal' | 'external';

        type DraftRemovalDirection = 'backward' | 'forward';

        type DraftEditorCommand = (
            'undo' |
            'redo' |
            'delete' |
            'delete-word' |
            'backspace' |
            'backspace-word' |
            'backspace-to-start-of-line' |
            'bold' |
            'italic' |
            'underline' |
            'code' |
            'split-block' |
            'transpose-characters' |
            'move-selection-to-start-of-block' |
            'move-selection-to-end-of-block' |
            'secondary-cut' |
            'secondary-paste'
        )
    }

    module decorators {
        type DraftDecorator = {
            strategy: (block: draftModel.immutable.ContentBlock, callback: (start: number, end: number) => void) => void;
            component: Function;
            props?: any;
        }

        export class CompositeDraftDecorator {
            constructor(decorators: Array<DraftDecorator>);
            getDecorations(block: draftModel.immutable.ContentBlock): Immutable.List<string>;
            getComponentForKey(key: string): Function;
            getPropsForKey(key: string): any;
        }
    }

    type entityMutability = (
        'MUTABLE' |
        'IMMUTABLE' |
        'SEGMENTED'
    );

    module entity {
        var DraftEntity: {
            create(type: string, mutability: entityMutability, data?: any): string;
            add(instance: DraftEntityInstance): string;
            get(key: string): DraftEntityInstance;
            mergeData(key: string, toMerge: { [key: string]: any }): DraftEntityInstance;
            replaceData(key: string, newData: { [key: string]: any }): DraftEntityInstance;
        }

        var DraftEntityInstanceRecord: Immutable.Record.Class;

        class DraftEntityInstance extends DraftEntityInstanceRecord {
            getType(): string;
            getMutability(): entityMutability;
            getData(): any;
        }
    }

    module immutable {
        type BlockMap = Immutable.OrderedMap<string, ContentBlock>;

        type CharacterMetadataConfig = {
            style?: draftModel.immutable.DraftInlineStyle;
            entity?: string;
        };

        var BlockMapBuilder: {
            createFromArray(blocks: Array<ContentBlock>): BlockMap
        };

        var CharacterMetadataRecord: Immutable.Record.Class;

        class CharacterMetadata extends CharacterMetadataRecord {
            static create(config: CharacterMetadataConfig): CharacterMetadata;
            static applyStyle(record: CharacterMetadata, style: string): CharacterMetadata;
            static removeStyle(record: CharacterMetadata, style: string): CharacterMetadata;
            static applyEntity(record: CharacterMetadata, entityKey: string): CharacterMetadata;
            getStyle(): draftModel.immutable.DraftInlineStyle;
            hasStyle(style: string): boolean;
            getEntity(): string;
        }

        var ContentBlockRecord: Immutable.Record.Class;

        class ContentBlock extends ContentBlockRecord {
            key: string;
            type: draftModel.constants.DraftBlockType;
            text: string;
            data: Map<string, any>;
            characterList: Immutable.List<CharacterMetadata>;
            depth: number;

            getData(): Immutable.Map<any, any>;
            getKey(): string;
            getType(): draftModel.constants.DraftBlockType;
            getText(): string;
            getCharacterList(): Immutable.List<CharacterMetadata>;
            getLength(): number;
            getDepth(): number;
            getInlineStyleAt(offset: number): draftModel.immutable.DraftInlineStyle;
            getEntityAt(offset: number): string;
            findStyleRanges(filterFn: (value: CharacterMetadata) => boolean, callback: (start: number, end: number) => void): void;
            findEntityRanges(filterFn: (value: CharacterMetadata) => boolean, callback: (start: number, end: number) => void): void;
        }

        var ContentStateRecord: Immutable.Record.Class;

        class ContentState extends ContentStateRecord {
            static createFromText(text: string, delimiter?: string | RegExp): draftModel.immutable.ContentState;
            static createFromBlockArray(blocks: Array<ContentBlock>): draftModel.immutable.ContentState;

            blockMap: draftModel.immutable.BlockMap;
            selectionBefore: draftModel.immutable.SelectionState;
            selectionAfter: draftModel.immutable.SelectionState;

            getBlockMap(): draftModel.immutable.BlockMap;
            getSelectionBefore(): draftModel.immutable.SelectionState;
            getSelectionAfter(): draftModel.immutable.SelectionState;
            getBlockForKey(key: string): draftModel.immutable.ContentBlock;
            getKeyBefore(key: string): string;
            getKeyAfter(key: string): string;
            getBlockBefore(key: string): draftModel.immutable.ContentBlock;
            getBlockAfter(key: string): draftModel.immutable.ContentBlock;
            getBlocksAsArray(): Array<ContentBlock>;
            getFirstBlock(): draftModel.immutable.ContentBlock;
            getLastBlock(): draftModel.immutable.ContentBlock;
            getPlainText(delimiter?: string): string;
            hasText(): boolean;

            // immutable
            set(key: string, value: any): ContentState;
            toJS(): any;
        }

        type DraftInlineStyle = Immutable.OrderedSet<string>;

        type EditorChangeType = (
            'adjust-depth' |
            'apply-entity' |
            'backspace-character' |
            'change-block-type' |
            'change-block-data' |
            'change-inline-style' |
            'delete-character' |
            'insert-characters' |
            'insert-fragment' |
            'redo' |
            'remove-range' |
            'spellcheck-change' |
            'split-block' |
            'undo'
        );

        var EditorStateRecord: Immutable.Record.Class;

        class EditorState extends EditorStateRecord {
            static createEmpty(decorator?: draftModel.decorators.CompositeDraftDecorator): draftModel.immutable.EditorState;
            static createWithContent(contentState: draftModel.immutable.ContentState, decorator?: draftModel.decorators.CompositeDraftDecorator): draftModel.immutable.EditorState;
            static create(config: any): draftModel.immutable.EditorState;
            static set(editorState: draftModel.immutable.EditorState, put: any): draftModel.immutable.EditorState;
            static push(editorState: draftModel.immutable.EditorState, contentState: draftModel.immutable.ContentState, changeType: EditorChangeType): draftModel.immutable.EditorState;
            static undo(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState;
            static redo(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState;
            static acceptSelection(editorState: draftModel.immutable.EditorState, selectionState: draftModel.immutable.SelectionState): draftModel.immutable.EditorState;
            static forceSelection(editorState: draftModel.immutable.EditorState, selectionState: draftModel.immutable.SelectionState): draftModel.immutable.EditorState;
            static moveSelectionToEnd(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState;
            static moveFocusToEnd(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState;
            static setInlineStyleOverride(editorState: draftModel.immutable.EditorState, inlineStyleOverride: draftModel.immutable.DraftInlineStyle): draftModel.immutable.EditorState;

            allowUndo: boolean;
            currentContent: draftModel.immutable.ContentState;
            decorator: draftModel.decorators.CompositeDraftDecorator;
            directionMap: Immutable.OrderedMap<string, string>;
            forceSelection: boolean;
            inCompositionMode: boolean;
            inlineStyleOverride: draftModel.immutable.DraftInlineStyle;
            lastChangeType: EditorChangeType;
            nativelyRenderedContent: draftModel.immutable.ContentState;
            redoStack: Immutable.Stack<ContentState>;
            selection: draftModel.immutable.SelectionState;
            treeMap: Immutable.OrderedMap<string, Immutable.List<any>>;
            undoStack: Immutable.Stack<ContentState>;

            getCurrentContent(): draftModel.immutable.ContentState;
            getSelection(): draftModel.immutable.SelectionState;
            getCurrentInlineStyle(): draftModel.immutable.DraftInlineStyle;
            getBlockTree(): Immutable.List<any>;
        }

        var SelectionStateRecord: Immutable.Record.Class;

        class SelectionState extends SelectionStateRecord {
            static createEmpty(key: string): draftModel.immutable.SelectionState;

            anchorKey: string;
            anchorOffset: number;
            focusKey: string;
            focusOffset: number;
            isBackward: boolean;
            hasFocus: boolean;

            getStartKey(): string;
            getStartOffset(): number;
            getEndKey(): string;
            getEndOffset(): number;
            getAnchorKey(): string;
            getAnchorOffset(): number;
            getFocusKey(): string;
            getFocusOffset(): number;
            getIsBackward(): boolean;
            getHasFocus(): boolean;
            isCollapsed(): boolean;
            hasEdgeWithin(blockKey: string, start: number, end: number): boolean;
            serialize(): string;
        }

        var DefaultDraftBlockRenderMap: Immutable.Map<(
            'header-one' |
            'header-two' |
            'header-three' |
            'header-four' |
            'header-five' |
            'header-six' |
            'unordered-list-item' |
            'ordered-list-item' |
            'blockquote' |
            'atomic' |
            'code-block' |
            'unstyled'), any>;

        var DefaultDraftInlineStyle: {
            BOLD: any,
            CODE: any,
            ITALIC: any,
            STRIKETHROUGH: any,
            UNDERLINE: any
        };
    }

    module modifier {
        var modifier: {
            replaceText(contentState: draftModel.immutable.ContentState, rangeToReplace: draftModel.immutable.SelectionState, text: string, inlineStyle?: draftModel.immutable.DraftInlineStyle, entityKey?: string): draftModel.immutable.ContentState,
            insertText(contentState: draftModel.immutable.ContentState, targetRange: draftModel.immutable.SelectionState, text: string, inlineStyle?: draftModel.immutable.DraftInlineStyle, entityKey?: string): draftModel.immutable.ContentState,
            moveText(contentState: draftModel.immutable.ContentState, removalRange: draftModel.immutable.SelectionState, targetRange: draftModel.immutable.SelectionState): draftModel.immutable.ContentState
            replaceWithFragment(contentState: draftModel.immutable.ContentState, targetRange: draftModel.immutable.SelectionState, fragment: draftModel.immutable.BlockMap): draftModel.immutable.ContentState,
            removeRange(contentState: draftModel.immutable.ContentState, rangeToRemove: draftModel.immutable.SelectionState, removalDirection: draftModel.constants.DraftRemovalDirection): draftModel.immutable.ContentState,
            splitBlock(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState): draftModel.immutable.ContentState,
            applyInlineStyle(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState, inlineStyle: string): draftModel.immutable.ContentState,
            removeInlineStyle(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState, inlineStyle: string): draftModel.immutable.ContentState,
            setBlockType(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState, blockType: draftModel.constants.DraftBlockType): draftModel.immutable.ContentState,
            setBlockData(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState, blockData: Immutable.Map<any, any>): draftModel.immutable.ContentState,
            mergeBlockData(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState, blockData: Immutable.Map<any, any>): draftModel.immutable.ContentState,
            applyEntity(contentState: draftModel.immutable.ContentState, selectionState: draftModel.immutable.SelectionState, entityKey: string): draftModel.immutable.ContentState
        }

        var RichTextEditorUtil: {
            currentBlockContainsLink(editorState: draftModel.immutable.EditorState): boolean,
            getCurrentBlockType(editorState: draftModel.immutable.EditorState): string,
            handleKeyCommand(editorState: draftModel.immutable.EditorState, command: string): draftModel.immutable.EditorState,
            insertSoftNewline(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState,
            onBackspace(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState,
            onDelete(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState,
            onTab(event: Event, editorState: draftModel.immutable.EditorState, maxDepth: number): draftModel.immutable.EditorState,
            toggleBlockType(editorState: draftModel.immutable.EditorState, blockType: string): draftModel.immutable.EditorState,
            toggleCode(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState,
            toggleInlineStyle(editorState: draftModel.immutable.EditorState, inlineStyle: string): draftModel.immutable.EditorState,
            toggleLink(editorState: draftModel.immutable.EditorState, targetSelection: draftModel.immutable.SelectionState, entityKey: string): draftModel.immutable.EditorState,
            tryToRemoveBlockStyle(editorState: draftModel.immutable.EditorState): draftModel.immutable.EditorState
        }

        var AtomicBlockUtils: {
            insertAtomicBlock(editorState: draftModel.immutable.EditorState, entityKey: string, character: string): draftModel.immutable.EditorState
        };
    }
}

declare namespace draftEditor {
    class DraftEditor extends React.Component<any, any>{
        focus(): void;
    }

    class DraftEditorBlock extends React.Component<any, any>{

    }
}

declare module 'draft-js' {
    import Editor = draftEditor.DraftEditor;
    import EditorBlock = draftEditor.DraftEditorBlock;
    import EditorState = draftModel.immutable.EditorState;

    import CompositeDecorator = draftModel.decorators.CompositeDraftDecorator;
    import Entity = draftModel.entity.DraftEntity;
    import EntityInstance = draftModel.entity.DraftEntityInstance;

    import BlockMapBuilder = draftModel.immutable.BlockMapBuilder;
    import CharacterMetadata = draftModel.immutable.CharacterMetadata;
    import ContentBlock = draftModel.immutable.ContentBlock;
    import ContentState = draftModel.immutable.ContentState;
    import SelectionState = draftModel.immutable.SelectionState;

    import AtomicBlockUtils = draftModel.modifier.AtomicBlockUtils;
    import KeyBindingUtil = draftComponent.utils.KeyBindingUtil;
    import Modifier = draftModel.modifier.modifier;
    import RichUtils = draftModel.modifier.RichTextEditorUtil;

    import DefaultDraftBlockRenderMap = draftModel.immutable.DefaultDraftBlockRenderMap;
    import DefaultDraftInlineStyle = draftModel.immutable.DefaultDraftInlineStyle;

    function convertFromRaw(rawState: any): draftModel.immutable.ContentState;
    function convertToRaw(contentState: draftModel.immutable.ContentState): any;
    function convertFromHTML(html: string): Array<draftModel.immutable.ContentBlock>;
    function genKey(): string;
    function getDefaultKeyBinding(e: any): draftModel.constants.DraftEditorCommand;
    function getVisibleSelectionRect(global: any): draftComponent.selection.FakeClientRect;

    export {
        Editor,
        EditorBlock,
        EditorState,
        //
        CompositeDecorator,
        Entity,
        EntityInstance,
        //
        BlockMapBuilder,
        CharacterMetadata,
        ContentBlock,
        ContentState,
        SelectionState,
        //
        AtomicBlockUtils,
        KeyBindingUtil,
        Modifier,
        RichUtils,
        //
        DefaultDraftBlockRenderMap,
        DefaultDraftInlineStyle,
        //
        convertFromHTML,
        convertFromRaw,
        convertToRaw,
        //
        genKey,
        getDefaultKeyBinding,
        getVisibleSelectionRect
    }
}
