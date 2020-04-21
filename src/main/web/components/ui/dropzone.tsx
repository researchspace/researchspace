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

import ReactDropzone, { DropzoneOptions } from 'react-dropzone';

export interface DropzoneProps extends DropzoneOptions {
  className?: string;
  style?: React.CSSProperties;
  children?: JSX.Element | ReadonlyArray<JSX.Element>;
}

const DEFAULT_STYLE: React.CSSProperties = {
  width: 200,
  height: 200,
  borderWidth: 2,
  borderColor: 'rgb(102, 102, 102)',
  borderStyle: 'dashed',
  borderRadius: 5,
};

export class Dropzone extends React.Component<DropzoneProps, {}> {
  render() {
    const { className, children, ...otherProps } = this.props;
    const style = Object.assign({}, DEFAULT_STYLE, this.props.style);
    return (
      <ReactDropzone {...otherProps}>
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()} className={className} style={style}>
            {children}
            <input {...getInputProps()} />
          </div>
        )}
      </ReactDropzone>
    );
  }
}
