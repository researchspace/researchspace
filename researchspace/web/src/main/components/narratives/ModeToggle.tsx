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

import { Component } from 'platform/api/components';

import Provider from 'ory-editor-ui/lib/Provider';

import ToggleEdit from 'ory-editor-ui/lib/DisplayModeToggle/ToggleEdit';
import ToggleInsert from 'ory-editor-ui/lib/DisplayModeToggle/ToggleInsert';
import ToggleLayout from 'ory-editor-ui/lib/DisplayModeToggle/ToggleLayout';
import TogglePreview from 'ory-editor-ui/lib/DisplayModeToggle/TogglePreview';
import ToggleResize from 'ory-editor-ui/lib/DisplayModeToggle/ToggleResize';

export interface ModeToggleProps {
  editor: any;
}

export class ModeToggle extends Component<ModeToggleProps, {}> {
  render() {
    return (
      <Provider editor={this.props.editor}>
        <div className='semantic-narrative-editor__mode-toggle' style={{display: 'flex'}}>
          <div className='semantic-narrative-editor__toolbar-section'>
            <TogglePreview /><span className='semantic-narrative-editor__mode-toggle-description'>Preview</span>
            <div className='semantic-narrative-editor__toolbar-divider'/>
          </div>
          <div className='semantic-narrative-editor__toolbar-section'>
            <ToggleEdit /><span className='semantic-narrative-editor__mode-toggle-description'>Edit</span>
            <div className='semantic-narrative-editor__toolbar-divider'/>
          </div>
          {/*<ToggleInsert />*/}
          <div className='semantic-narrative-editor__toolbar-section'>
            <ToggleLayout /><span className='semantic-narrative-editor__mode-toggle-description'>Move/Delete</span>
            <div className='semantic-narrative-editor__toolbar-divider'/>
          </div>
          <div className='semantic-narrative-editor__toolbar-section'>
            <ToggleResize /><span className='semantic-narrative-editor__mode-toggle-description'>Resize</span>
            <div className='semantic-narrative-editor__toolbar-divider'/>
          </div>
        </div>
      </Provider>
    );
  }
}
