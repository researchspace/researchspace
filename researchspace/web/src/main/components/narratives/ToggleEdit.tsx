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
import Create from 'material-ui/svg-icons/content/create';
import ToggleButton from './Button';

import { connect } from 'react-redux';

import { editMode } from 'ory-editor-core/lib/actions/display';
import { isEditMode } from 'ory-editor-core/lib/selector/display';
import { createStructuredSelector } from 'reselect';

const Inner = ({
                 isEditMode,
                 editMode,
               }: {
  isEditMode: boolean,
  editMode: Function
}) => (
  <ToggleButton
    icon={<Create />}
    description='Edit'
    active={isEditMode}
    onClick={editMode}
  />
);

const mapStateToProps = createStructuredSelector({ isEditMode });
const mapDispatchToProps = { editMode };

export default connect(mapStateToProps, mapDispatchToProps)(Inner);
