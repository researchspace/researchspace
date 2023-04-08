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

const BASE_CLASSNAME = 'dropzone-area'

export class Dropzone extends React.Component<DropzoneProps, {}> {
  render() {
    const { className, children, style, ...otherProps } = this.props;
    const classNames = [BASE_CLASSNAME, className].join(' ')
    return (
      <ReactDropzone {...otherProps}>
        {(state) => (
          <div {...state.getRootProps()} className={classNames} style={style}>
            {isFunction(children) ? children(state) : children}
            <input {...state.getInputProps()} />
          </div>
        )}
      </ReactDropzone>
    );
  }
}
