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
import { RenderInlineProps } from 'slate-react';
import { Overlay, Popover, Button } from 'react-bootstrap';

import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { ResourceLinkContainer } from 'platform/api/navigation/components';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { Rdf } from 'platform/api/rdf';
import { DropArea } from 'platform/components/dnd/DropArea';

import { Inline, RESOURCE_MIME_TYPE } from './EditorSchema';

import * as styles from './TextEditor.scss';
import Icon from '../ui/icon/Icon';
import { getLabel } from 'platform/api/services/resource-label';

export interface InternalLinkProps extends RenderInlineProps {
}

interface InternalLinkState {
  showPopover: boolean;
}

export class InternalLink extends React.Component<InternalLinkProps, InternalLinkState> {

  private aRef: React.RefObject<any>;

  constructor(props: InternalLinkProps) {
    super(props);
    this.aRef = React.createRef<any>();
    this.state = {
      showPopover: false,
    };
  }

  onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
  }
  componentDidUpdate(prevProps: Readonly<InternalLinkProps>, prevState: Readonly<InternalLinkState>, snapshot?: any) {
    const isLinkSelected =
      this.props.editor.value.selection.isCollapsed &&
      this.props.editor.value.inlines.contains(this.props.node as Slate.Inline);

    const wasLinkSelected =
      prevProps.editor.value.selection.isCollapsed &&
      prevProps.editor.value.inlines.contains(prevProps.node as Slate.Inline);

    if (isLinkSelected && !wasLinkSelected) {
      this.setState({ showPopover: true });
    }

  }

  onHidePopover = () => {
    this.setState({ showPopover: false });
  }

  onShowPopover = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    this.setState({ showPopover: true });
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
      const isShowPopover = (isLinkSelected && this.state.showPopover) || isNoHref;

      return (
        <span {...attributes} className={styles.internalLink}>
          <Overlay container={document.body} target={this.getPopoverTarget} rootClose={!isNoHref} onHide={this.onHidePopover}
            placement='top' show={isShowPopover}
          >
            <Popover id='internal-link-popover' placement='top' contentEditable={false}>
              <div className={styles.linkPopover}>
                <DropArea
                  onDrop={this.onResourceDrop}
                  dropMessage='Drop here resource to make a link'
                  alwaysVisible={isNoHref}
                >
                  {
                    isNoHref ? null :
                    // because ResourceLinkComponent is not update when iri changes
                    // we need to use react key to recreate it on change
                    <ResourceLinkComponent
                                            iri={ConfigHolder.getDashboard().value}
                                            urlqueryparam-view="resource-editor"
                                            urlqueryparam-resource={dataAttributes.href}
                                            urlqueryparam-custom-label={getLabel(Rdf.iri(dataAttributes.href))}
                    />
                  }
                </DropArea>
                <Button bsClass='btn-default' className='btn-default-icon' onMouseDown={this.onUnlink}>
                  <Icon iconType='rounded' iconName='link_off' symbol/>
                </Button>
              </div>
            </Popover>
          </Overlay>

          <span ref={this.aRef}>
            <ResourceLinkComponent
              {...attributes}
              iri={ConfigHolder.getDashboard().value}
              urlqueryparam-view="resource-editor"
              urlqueryparam-resource={dataAttributes.href}
              onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); }}
            >
              {children}
            </ResourceLinkComponent>
          </span>
        </span>
      );
    }
  }
}
