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
import { Component } from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import droppable from 'ory-editor-core/lib/components/Row/Droppable';
import Inner from './inner';
import dimensions from 'ory-editor-core/lib/components/Dimensions';
import { shouldPureComponentUpdate } from 'ory-editor-core/lib/helper/shouldComponentUpdate';
import {
  isLayoutMode,
  isEditMode,
  isResizeMode,
  isInsertMode
} from 'ory-editor-core/lib/selector/display';
import { editableConfig, purifiedNode, node } from 'ory-editor-core/lib/selector/editable';
import { blurAllCells } from 'ory-editor-core/lib/actions/cell';
import { editMode } from 'ory-editor-core/lib/actions/display';

import { ComponetizedRow } from 'ory-editor-core/src/types/editable';

class Row extends Component<{}, {}> {
  constructor(props: ComponetizedRow) {
    super(props);
    const { config: { whitelist } } = props;
    this.Droppable = droppable(whitelist)
  }


  shouldComponentUpdate(nextProps, nextState) {
    return shouldPureComponentUpdate;
  }

  props: ComponetizedRow;
  Droppable: any;

  render() {
    const Droppable = this.Droppable;
    const props = this.props;

    return (
      <Droppable {...props}>
        <Inner {...props} />
      </Droppable>
    )
  }
}

const mapStateToProps = createStructuredSelector({
  isLayoutMode,
  config: editableConfig,
  isResizeMode,
  isInsertMode,
  isEditMode,
  node: purifiedNode,
  rawNode: (state: any, props: any) => () => node(state, props)
});

const mapDispatchToProps = {
  blurAllCells,
  editMode,
};

export default dimensions()(connect(mapStateToProps, mapDispatchToProps)(Row))
