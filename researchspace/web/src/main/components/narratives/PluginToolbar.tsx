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
import { CSSProperties } from 'react';
// packages from ORY dependencies
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';

import { Component } from 'platform/api/components';

import { isInsertMode } from 'ory-editor-core/lib/selector/display';
import Provider from 'ory-editor-ui/lib/Provider';
import { Item, VisualisePluginBlacklist } from './OryToolbarItem';


interface PluginToolbarProps {
  isInsertMode: boolean;
  editor: {
    plugins: {
      plugins: Plugins;
    }
  }
}

interface Plugins {
  readonly content: ReadonlyArray<any>;
  readonly layout: ReadonlyArray<any>;
}

class RawPluginToolbar extends Component<PluginToolbarProps, {}> {
  render() {
    const {editor} = this.props;
    const plugins = editor.plugins.plugins;

    return (
      <div className='semantic-narrative-editor__mode-toggle'>
        {plugins.content.map(plugin => (
          <div key={`${plugin.name}_content-toolbar-section`} className='semantic-narrative-editor__toolbar-section'>
            <Item key={plugin.name}
              plugin={plugin}
              insert={{
                content: {plugin, state: plugin.createInitialState()}
              }}
            />
          </div>
        ))}
        {plugins.layout.map(plugin => (
          <div key={`${plugin.name}_layout-toolbar-section`} className='semantic-narrative-editor__toolbar-section'>
            <Item key={plugin.name}
              plugin={plugin}
              insert={{
                ...plugin.createInitialChildren(),
                layout: {plugin, state: plugin.createInitialState()},
              }}
            />
            { (plugin.IconComponent && plugin.text
              && VisualisePluginBlacklist.indexOf(plugin.name) === -1)
            && <div className='semantic-narrative-editor__toolbar-divider'/> }
          </div>
        ))}
      </div>
    );
  }
}

const mapStateToProps = createStructuredSelector({isInsertMode});
const ConnectedPluginToolbar = connect(mapStateToProps)(RawPluginToolbar);

export class PluginToolbar extends Component<{ editor: any }, {}> {
  render() {
    const {editor} = this.props;
    return (
      <Provider editor={editor}>
        <ConnectedPluginToolbar editor={editor} />
      </Provider>
    );
  }
}
