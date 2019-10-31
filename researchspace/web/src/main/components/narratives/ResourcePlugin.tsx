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
import * as PropTypes from 'prop-types';

import { Rdf } from 'platform/api/rdf';

import { Droppable } from 'platform/components/dnd';
import { SemanticNarrativeResource, ResourceState } from './SemanticNarrativeResource';

interface OryPluginComponentProps<State> {
  id: string
  readOnly: boolean
  name: string
  version: string
  focused: boolean
  state: State
  onChange: (state: State) => void
}

export class ResourceComponent extends Component<OryPluginComponentProps<ResourceState>, {}> {
  static readonly className = 'ory-resource-component';
  static readonly contextTypes = {
    editorProps: PropTypes.any,
  };

  render() {
    const {editorProps} = this.context;
    const {focused, state, readOnly, onChange} = this.props;
    const {resourceIri} = this.props.state;

    if (resourceIri) {
      return <SemanticNarrativeResource
        focused={focused}
        state={state}
        readOnly={readOnly}
        editorProps={editorProps}
        onChange={(state) => { onChange(state); }}
      />;
    }
    return (
      <Droppable query='ASK {}' onDrop={resourceIri => {
          onChange({resourceIri, selectedTemplateKey: undefined});
        }}>
        <div className={ResourceComponent.className}
          style={{width: '100%', height: '200px', border: '1px dashed green'}}>
          {resourceIri ? resourceIri.toString() : 'Drag and drop to select a resource here'}
        </div>
      </Droppable>
    );
  }
}

export const ResourcePlugin = {
  Component: ResourceComponent,
  IconComponent: <span className='fa fa-clipboard' aria-hidden='true' />,
  name: 'metaphactory/content/resource',
  version: '1.0.0',
  text: 'Clipboard Resource',
  isInlineable: true,
};

export const NativeResourcePlugin = (hover: any, monitor: any, component: any) => ({
  Component: ResourceComponent,
  name: 'metaphactory/content/resource',
  version: '1.0.0',
  text: 'Clipboard Resource',
  isInlineable: true,
  createInitialState: (): ResourceState => {
    const data: { urls?: string[] } = monitor.getItem() || {};
    const resourceIri = Array.isArray(data.urls) && data.urls.length > 0
      ? Rdf.iri(data.urls[0]) : undefined;
    return {resourceIri};
  }
});
