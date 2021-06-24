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
import { findDOMNode } from 'react-dom';
import * as Slate from 'slate';
import { RenderNodeProps } from 'slate-react';
import { Overlay, Popover, Button } from 'react-bootstrap';

import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { Rdf } from 'platform/api/rdf';
import { DropArea } from 'platform/components/dnd/DropArea';

import { Inline, RESOURCE_MIME_TYPE } from './EditorSchema';

import * as styles from './TextEditor.scss';

export interface InternalLinkProps extends RenderNodeProps {
  editor: Slate.Editor
}

interface InternalLinkState {
}

export class InternalLink extends React.Component<InternalLinkProps, InternalLinkState> {

  private aRef: React.RefObject<any>;

  constructor(props: InternalLinkProps) {
    super(props);
    this.aRef = React.createRef<any>();
  }

  onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
  }

  onUnlink = (event: React.MouseEvent<Button>) => {
    event.preventDefault();

    const { editor, node } = this.props;
    editor
      .moveToRangeOfNode(node)
      .focus()
      .unwrapInline(Inline.internalLink);
  }

  onResourceDrop = (drop: Rdf.Iri) => {
    const node =
      this.props.node.setIn(
        ['data', 'attributes'], {
        href: drop.value,
        type: RESOURCE_MIME_TYPE,
      }
      ) as Slate.Inline;
    this.props.editor
        .moveToStartOfNode(node)
        .setInlines(node);
  }

  getPopoverTarget = () => findDOMNode(this.aRef.current);

  render() {
    const { attributes, children, editor, node } = this.props;

    const dataAttributes = node.data.get('attributes', {});

    // in readonly mode make a link normal ResourceLink instead of using overlay
    if (editor.readOnly) {
      return (
        <span {...attributes} className={styles.internalLink}>
          <ResourceLinkComponent key={dataAttributes.href} iri={dataAttributes.href}>
            {children}
          </ResourceLinkComponent>
        </span>
      );
    } else {
      const isLinkSelected =
        editor.value.selection.isCollapsed &&
        editor.value.inlines.contains(node as Slate.Inline);

      const isNoHref = !dataAttributes.href;
      const isShowPopover = isLinkSelected || isNoHref;

      return (
        <span {...attributes} className={styles.internalLink}>
          <Overlay container={document.body} target={this.getPopoverTarget}
            placement='top' show={isShowPopover}
          >
            <Popover id='internal-link-popover' placement='top' contentEditable={false}>
              <div className={styles.linkPopover}>
                <DropArea
                  onDrop={this.onResourceDrop}
                  dropMessage='Drop here resource from Clipboard to make a link.'
                  alwaysVisible={isNoHref}
                >
                  {
                    isNoHref ? null :
                    // because ResourceLinkComponent is not update when iri changes
                    // we need to use react key to recreate it on change
                    <ResourceLinkComponent key={dataAttributes.href} iri={dataAttributes.href} />
                  }
                </DropArea>
                <Button bsClass='btn-grey' onMouseDown={this.onUnlink}>
                  <i className='fa fa-chain-broken' aria-hidden='true'></i>
                </Button>
              </div>
            </Popover>
          </Overlay>
          <a {...attributes} {...dataAttributes} ref={this.aRef} onClick={this.onClick}>
            {children}
          </a>
        </span>
      );
    }
  }
}
