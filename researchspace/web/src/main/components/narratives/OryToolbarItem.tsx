/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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

import Draggable from 'ory-editor-ui/lib/Toolbar/Draggable';
import Avatar from 'material-ui/Avatar';
import ListItem from 'material-ui/List/ListItem';
import RcTooltip from 'rc-tooltip';

export const VisualisePluginBlacklist = ['metaphactory/content/resource'];

interface ItemProps {
  plugin: any
  insert: any
}

interface ItemState {
  tooltipVisible: boolean;
}

export class Item extends React.Component<ItemProps, ItemState> {

  constructor(props: ItemProps, context: any) {
    super(props, context);
    this.state = {tooltipVisible: false};
  }

  onMouseEnter = () => {
    this.setState({tooltipVisible: true});
  };

  onMouseLeave = () => {
    this.setState({tooltipVisible: false});
  };

  render() {
    const { plugin, insert } = this.props;

    if (!plugin.IconComponent && !plugin.text
      || VisualisePluginBlacklist.indexOf(plugin.name) !== -1) {
      // logger.warn('Plugin text or plugin icon missing', plugin)
      return null;
    }

    let MyDraggable = Draggable(plugin.name);

    return <ListItem leftIcon={<span
          className='ory-toolbar-item-drag-handle-button'
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onMouseLeave}
      >
      <MyDraggable insert = {insert}>
        <RcTooltip
          visible={this.state.tooltipVisible}
          placement='bottomLeft'
          overlay={<span>Drag me!</span>}
        >
        <div style={{display: 'flex', alignItems: 'center'}}>
          <span className='draggable-gripper'></span>
          <Avatar icon={plugin.IconComponent} className = 'ory-toolbar-item-drag-handle'></Avatar>
        </div>
        </RcTooltip>
      </MyDraggable>
      </span>}
      primaryText = {plugin.text}
      secondaryText = ''
      secondaryTextLines = {2}
      disabled = {true}
      className = 'ory-toolbar-item'></ListItem>;
  }
}
