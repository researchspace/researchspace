/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
    const {className,  children, ...otherProps} = this.props;
    const style = Object.assign({}, DEFAULT_STYLE,this.props.style);
    return (
      <ReactDropzone {...otherProps}>
        {({getRootProps, getInputProps}) => (
          <div {...getRootProps()} className={className} style={style}>
            {children}
            <input {...getInputProps()} />
          </div>
        )}
      </ReactDropzone>
    );
  }
}
