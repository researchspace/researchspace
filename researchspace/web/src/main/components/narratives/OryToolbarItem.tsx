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

import * as React from 'react';

import { Button } from 'react-bootstrap';
import Draggable from './Draggable';
import Avatar from 'material-ui/Avatar';
import RcTooltip from 'rc-tooltip';
import * as _ from 'lodash';

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

    return <Button onMouseEnter={this.onMouseEnter}
                   onMouseLeave={this.onMouseLeave}
                   onMouseDown={this.onMouseLeave}
                   className='ory-toolbar-item-drag-handle-button'>
      <span>
        <MyDraggable insert = {insert}>
          <RcTooltip
            visible={this.state.tooltipVisible}
            placement='bottomLeft'
            align={{'offset': [0, 12]}}
            overlay={<span>Drag me!</span>}
          >
          <div style={{display: 'flex', alignItems: 'center'}}>
            <span className='draggable-gripper'></span>
            <Avatar icon={plugin.IconComponent} className = 'ory-toolbar-item-drag-handle'></Avatar>
            <span className='ory-toolbar-item-plugin-text'>{plugin.text}</span>
          </div>
          </RcTooltip>
        </MyDraggable>
      </span>
    </Button>;
  }
}
