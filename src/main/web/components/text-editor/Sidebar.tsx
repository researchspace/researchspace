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

import { Editor, findDOMNode } from 'slate-react';
import * as Slate from 'slate';

import * as React from 'react';

import { BLOCK_TO_ICON } from './Toolbar';
import { Block } from './EditorSchema';

import * as styles from './TextEditor.scss';

export interface SidebarProps {
  value: Slate.Value
  editor: React.RefObject<Editor>;
  anchorBlock: Slate.Block
}

export class Sidebar extends React.Component<SidebarProps, any> {
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
    const { anchorBlock } = this.props;
    if (anchorBlock) {
      // some strange bug with typescript, so we need to convert immutable list to js array
      // also problem in slate-react definition with findDOMNode
      const node = findDOMNode(anchorBlock) as HTMLElement;
      const sidebarStyle = {
        height: node.offsetHeight,
        transform: `translateY(${node.offsetTop}px)`,
      };
      const block = anchorBlock ? anchorBlock.type as Block : Block.empty;

      return (
        <div className={styles.sidebar} style={sidebarStyle}>
          {this.actionIcon(block)}
        </div>
      );
    } else {
      return null;
    }
  }
}
