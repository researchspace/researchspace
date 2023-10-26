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

import * as React from 'react';
import { ButtonToolbar, ButtonGroup, Button, MenuItem, Dropdown } from 'react-bootstrap';
import * as Slate from 'slate';
import { Editor } from 'slate-react';
import { List } from 'immutable';

import {
  Block, MARK, Mark, DEFAULT_BLOCK, TextAlignment, isTextBlock, Inline, RESOURCE_MIME_TYPE
} from './EditorSchema';
import { ResourceTemplateConfig } from './Config';
import * as styles from './TextEditor.scss';

export const BLOCK_TO_ICON: { [block in Block]: string } = {
  [Block.empty]: 'fa-plus',
  [Block.embed]: 'fa-file-code-o',
  [Block.p]: 'fa-paragraph',
  [Block.h1]: 'fa-header',
  [Block.h2]: 'fa-header',
  [Block.h3]: 'fa-header',
  [Block.ol]: 'fa-list-ol',
  [Block.ul]: 'fa-list-ul',
  [Block.li]: 'fa-list'
};

const BLOCK_TO_LABEL: { [block in Block]: string } = {
  [Block.empty]: 'Placeholder',
  [Block.embed]: 'Resource',
  [Block.p]: 'Paragraph',
  [Block.h1]: 'Heading 1',
  [Block.h2]: 'Heading 2',
  [Block.h3]: 'Heading 3',
  [Block.ol]: 'Numbered List',
  [Block.ul]: 'Bulleted List',
  [Block.li]: 'List Item'
};

const TEXT_ALIGNMENT_TO_ICON: { [alignment in TextAlignment]: string } = {
  [TextAlignment.left]: 'fa-align-left',
  [TextAlignment.right]: 'fa-align-right',
  [TextAlignment.center]: 'fa-align-center',
  [TextAlignment.justify]: 'fa-align-justify',
};

const MARK_TO_ICON: { [mark in Mark]: string } = {
  [MARK.s]: 'fa-strikethrough',
  [MARK.u]: 'fa-underline',
  [MARK.em]: 'fa-italic',
  [MARK.strong]: 'fa-bold'
};

export interface ToolbarProps {
  value: Slate.Value;
  editor: React.RefObject<Editor>;
  anchorBlock: Slate.Block
  options?: { [objectIri: string]: ResourceTemplateConfig[] }
  onDocumentSave: () => void;
  saving?: boolean;
}

export class Toolbar extends React.Component<ToolbarProps> {

  isTextSelectionActionDisabled = () =>
    !isTextBlock(this.props.anchorBlock) || this.props.value.selection.isCollapsed

  onMarkClick = (event: React.MouseEvent<Button>, markType: Mark) => {
    event.preventDefault();
    this.props.editor.current.toggleMark(markType);
  }

  markButton = (markType: Mark) => {
    const isActive = this.hasMark(markType);
    const className = `fa ${MARK_TO_ICON[markType]}`;
    return <Button active={isActive} disabled={this.isTextSelectionActionDisabled()}
      onMouseDown={event => this.onMarkClick(event, markType)}>
      <i className={className} aria-hidden={true}></i>
    </Button>;
  }

  hasMark = (markType: Mark): boolean => {
    const { value } = this.props;
    return value.activeMarks.some(mark => mark.type === markType);
  }

  alignTextButton = (alignment: TextAlignment) => {
    const isActive = this.hasAlignment(alignment);
    const className = `fa ${TEXT_ALIGNMENT_TO_ICON[alignment]}`;
    return <Button active={isActive} disabled={!isTextBlock(this.props.anchorBlock)}
      onMouseDown={event => this.onAlignClick(event, alignment)}>
      <i className={className} aria-hidden={true}></i>
    </Button>;
  }

  onAlignClick = (event: React.MouseEvent<Button>, alignment: TextAlignment) => {
    event.preventDefault();
    const { editor, anchorBlock } = this.props;

    const currentAlignment =
      anchorBlock.data.get('attributes', {})?.style?.textAlign;

    let data = {};
    if (alignment !== currentAlignment) {
      data = {
        style: {
          textAlign: alignment,

          // we need to have this for "text-align: justify" to work in all browsers.
          // see https://github.com/ianstormtaylor/slate/issues/2359
          whiteSpace: alignment === TextAlignment.justify ? 'pre-line' : undefined,
        }
      };
    }
    const modifiedBlock = anchorBlock.setIn(['data', 'attributes'], data) as Slate.Block;
    editor.current.setBlocks(modifiedBlock);
  }

  hasAlignment = (alignment: TextAlignment): boolean => {
    const { anchorBlock } = this.props;
    if (anchorBlock) {
      return anchorBlock.data.get('attributes')?.style?.textAlign === alignment;
    } else {
      return false;
    }
  }

  // link
  externalLinkButton = () => {
    return (
      <Button onMouseDown={this.onExternalLinkClick}
        disabled={this.isTextSelectionActionDisabled()}
      >
        <i className='fa fa-external-link' aria-hidden={true}></i>
      </Button>
    );
  }

  onExternalLinkClick = (event: React.MouseEvent<Button>) => {
    event.preventDefault();
    const { editor, value } = this.props;

    if (value.selection.isCollapsed) {
      const linkText = Slate.Text.create({ text: 'link' });
      editor.current
        .insertInline({
          type: Inline.externalLink,
          nodes: List.of(linkText),
        });
    } else {
      editor.current.wrapInline({
        type: Inline.externalLink,
      });
    }
  }

  internalLinkButton = () => {
    return (
      <Button onMouseDown={this.onInternalLinkClick}
        disabled={this.isTextSelectionActionDisabled()}
      >
        <i className='fa fa-chain' aria-hidden={true}></i>
      </Button>
    );
  }

  onInternalLinkClick = (event: React.MouseEvent<Button>) => {
    event.preventDefault();
    const { editor, value } = this.props;

    if (value.selection.isCollapsed) {
      const linkText = Slate.Text.create({ text: 'link' });
      editor.current
        .insertInline({
          type: Inline.internalLink,
          nodes: List.of(linkText),
        });
    } else {
      editor.current.wrapInline({
        type: Inline.internalLink,
      });
    }
  }

  onResourceTemplateSelected = (templateId: string) => {
    const attributes = this.props.anchorBlock.data.get('attributes');
    this.props.editor.current.setBlocks({
      type: Block.embed,
      data: {
        attributes: {
          ...attributes,
          template: templateId,
          style: {}
        }
      }
    });
  }

  render() {
    const { saving } = this.props;
    return (
      <ButtonToolbar className={styles.toolbar}>
        <ButtonGroup>
          <Button bsStyle='success' onClick={this.props.onDocumentSave} disabled={saving}>
            <i className={saving ? 'fa fa-spinner fa-pulse fa-fw' : 'fa fa-floppy-o' }
              aria-hidden='true'></i>
            &nbsp; Save
          </Button>
        </ButtonGroup>

        <ButtonGroup>
          {
            this.props.anchorBlock?.type === Block.embed ?
              <ResourceDropdown
                options={this.props.options[this.props.anchorBlock.data.get('attributes').src]}
                anchorBlock={this.props.anchorBlock}
                onSelect={this.onResourceTemplateSelected}
              />
              :
              <BlockDropdown {...this.props} sidebar={false} />
          }
        </ButtonGroup>

        <ButtonGroup>
          {this.markButton(MARK.strong)}
          {this.markButton(MARK.em)}
          {this.markButton(MARK.u)}
          {this.markButton(MARK.s)}
        </ButtonGroup>

        <ButtonGroup>
          {this.alignTextButton(TextAlignment.left)}
          {this.alignTextButton(TextAlignment.center)}
          {this.alignTextButton(TextAlignment.right)}
          {this.alignTextButton(TextAlignment.justify)}
        </ButtonGroup>

        <ButtonGroup>
          {this.internalLinkButton()}
          {this.externalLinkButton()}
        </ButtonGroup>
      </ButtonToolbar>
    );
  }
}


interface ResourceDropdownProps {
  options: ResourceSelection[]
  anchorBlock: Slate.Block
  onSelect: (templateId: string) => void
}

interface ResourceSelection {
  id: string
  label: string
}

class ResourceDropdown extends React.Component<ResourceDropdownProps> {
  actionButton = (selectedTemplate: ResourceSelection) => (selection: ResourceSelection) => {
    const isActive = selectedTemplate.id === selection.id;
    return (
      <MenuItem key={selection.id} eventKey={selection.id} active={isActive}
        onSelect={this.onSelect as any}>
        <span className={styles.dropdownMenuItem}>
          <span>{selection.label}</span>
        </span>
      </MenuItem>
    );
  }

  onSelect = (templateId: string, event: any) => {
    event.preventDefault();
    this.props.onSelect(templateId);
  }

  render() {
    const { options, anchorBlock } = this.props;

    // options can be undefined if templates are still loading
    if (options) {
      const selectedTemplateId = anchorBlock.data.get('attributes').template;
      const selectedTemplate = options.find(o => o.id === selectedTemplateId);

      if (selectedTemplate) {
        return (
          <Dropdown id='blocks' pullRight={true}>
            <Dropdown.Toggle>
              <span className={styles.dropdownMenuItem}>
                {selectedTemplate.label}
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {options.map(this.actionButton(selectedTemplate))}
            </Dropdown.Menu>
          </Dropdown>
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}



export interface BlockDropdownProps {
  value: Slate.Value;
  editor: React.RefObject<Editor>;
  sidebar: boolean;
  anchorBlock: Slate.Block;
}

export class BlockDropdown extends React.Component<BlockDropdownProps> {

  hasBlock = (type: Block) => {
    return this.props.value.blocks.some(node => node.type === type);
  }

  onBlockButtonClick = (blockType: Block, event: any) => {
    event.preventDefault();

    const { editor, anchorBlock } = this.props;

    // we need do handle list blocks separately
    if (blockType === Block.ol || blockType === Block.ul) {
      const isList = this.hasBlock(Block.li);
      const isTheSameType = anchorBlock.type === blockType;

      if (isList && isTheSameType) {
        // if current block is list and button of the same time is clicked,
        // we change type of the current block to default one
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .unwrapBlock(blockType)
          .setBlocks(DEFAULT_BLOCK);
      } else if (isList) {
        // if current block is list, but was click button with different kind of list,
        // we change to that list
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .unwrapBlock(anchorBlock.type)
          .wrapBlock(blockType);

      } else {
        // or we just set current block to list
        editor.current
          .setBlocks(Block.li)
          .wrapBlock(blockType)
          .moveToEndOfText()
          .focus();
      }
    } else {
      const isList = this.hasBlock(Block.li);
      const isActive = this.hasBlock(blockType);

      if (isList) {
        // if current block is list we first need to unwrap it before changing to the new type
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .unwrapBlock(anchorBlock.type)
          .setBlocks(isActive ? DEFAULT_BLOCK : blockType);
      } else {
        // if it is not list then just toggle the block type
        editor.current
          .moveToRangeOfNode(anchorBlock)
          .setBlocks(isActive ? DEFAULT_BLOCK : blockType)
          .moveToEndOfBlock()
          .focus();
      }
    }

    // editor.current.select(value.selection).focus();
  }

  actionButton = (blockType: Block) => {
    const isActive = this.props.anchorBlock?.type === blockType;
    return (
      <MenuItem eventKey={blockType} active={isActive}
        onSelect={this.onBlockButtonClick as any}>

        {this.actionDescription(blockType)}
      </MenuItem>
    );
  }

  actionDescription = (blockType: Block) => {
    return (
      <span className={styles.dropdownMenuItem}>
        {this.actionIcon(blockType)}
        <span>{BLOCK_TO_LABEL[blockType]}</span>
      </span>
    );
  }

  actionIcon(blockType: Block) {
    const iconClassName = `fa ${BLOCK_TO_ICON[blockType]}`;

    // for heading blocks we add heading number to the default icon
    const prefix =
      blockType === Block.h1 ? '1' :
        blockType === Block.h2 ? '2' :
          blockType === Block.h3 ? '3' : '';

    return (
      <span className={styles.dropdownMenuItemIcon}>
        <i className={iconClassName} aria-hidden='true'></i>{prefix}
      </span>
    );
  }

  render() {
    const { sidebar, anchorBlock } = this.props;
    const block = anchorBlock ? anchorBlock.type as Block : Block.empty;

    return (
      <Dropdown id='blocks' pullRight={true}>
        <Dropdown.Toggle bsSize={sidebar ? 'xsmall' : null}
          className={sidebar ? styles.sidebarDropdown : ''}
        >
          {sidebar ? this.actionIcon(block) : this.actionDescription(block)}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {this.actionButton(Block.p)}
          <MenuItem divider />
          {this.actionButton(Block.h1)}
          {this.actionButton(Block.h2)}
          {this.actionButton(Block.h3)}
          <MenuItem divider />
          {this.actionButton(Block.ol)}
          {this.actionButton(Block.ul)}
        </Dropdown.Menu>
      </Dropdown>
    );
  }
}

export interface ResourceTemplateDropdownProps {
  options: any
}


export type ActionDropdownProps =
  { type: 'block', props: BlockDropdownProps } |
  { type: 'resource', props: ResourceTemplateDropdownProps };

export class ActionDropdown extends React.PureComponent<ActionDropdownProps> {
  render() {
    switch (this.props.type) {
      case 'block': return <BlockDropdown {...this.props.props} />;
      case 'resource': return null;
    }
  }
}
