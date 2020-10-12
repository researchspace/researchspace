/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { isFunction } from 'lodash';

import ReactDropzone, { DropzoneOptions, DropzoneState } from 'react-dropzone';

type ChildrenFunction = (state: DropzoneState) => JSX.Element;
export interface DropzoneProps extends DropzoneOptions {
  className?: string;
  style?: React.CSSProperties;
  children?: JSX.Element | ReadonlyArray<JSX.Element> | ChildrenFunction;
}

const DEFAULT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 200,
  borderWidth: 1,
  borderStyle: 'dashed',
  borderRadius: 5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  outline: 'none',
  fontSize: 17,
  letterSpacing: 0.2,
};

export class Dropzone extends React.Component<DropzoneProps, {}> {
  render() {
    const { className, children, ...otherProps } = this.props;
    const style = Object.assign({}, DEFAULT_STYLE, this.props.style);
    return (
      <ReactDropzone {...otherProps}>
        {(state) => (
          <div {...state.getRootProps()} className={className} style={style}>
            {isFunction(children) ? children(state) : children}
            <input {...state.getInputProps()} />
          </div>
        )}
      </ReactDropzone>
    );
  }
}
