/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { Component, DOM as D, createFactory, ReactNode, ReactElement } from 'react';
import * as ReactBootstrap from 'react-bootstrap';

const Panel = createFactory(ReactBootstrap.Panel);

type ErrorValue = string | { message: string; } | { responseText: string } | ErrorValues;
interface ErrorValues extends ReadonlyArray<ErrorValue> {}

export interface ErrorNotificationProps {
  title?: string;
  errorMessage?: string | Error;
  className?: string;
  children?: ReactNode;
}

export class ErrorNotification extends Component<ErrorNotificationProps, {}> {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const error = this.props.errorMessage;
    if (error && typeof error === 'object') {
      console.error(error);
    }
  }

  render() {
    const title = this.props.title || 'Error occurred! Click to see more details.';
    const errorHeader = D.p({},
      D.i({
        className: 'fa fa-exclamation-triangle',
        style: {marginRight: '10px', color: 'red'},
      }),
      D.span({}, title)
    );
    return Panel(
      {
        collapsible: true,
        header: errorHeader,
        className: this.props.className,
      },
      this.props.errorMessage
        ? this.wrapError(this.props.errorMessage)
        : this.props.children);
  }

  private wrapError(error: ErrorValue): ReactElement<any> | string {
    if (typeof error === 'object' && 'responseText' in error) {
      const {responseText} = error as { responseText: string };
      return D.iframe({srcDoc: responseText, width: '100%', height: 400});
    } else if (typeof error === 'object' && 'message' in error) {
      const {message} = error as { message: string };
      return convertLineBreaks(message);
    } else if (Array.isArray(error) && error.length > 0) {
      if (error.length === 1) {
        return this.wrapError(error[0]);
      } else {
        return D.div({},
          'Multiple errors occured:',
          ...error.map(e => this.wrapError(e))
        );
      }
    } else {
      if (typeof error !== 'string') { error = JSON.stringify(error, undefined, 4); }
      return convertLineBreaks(error);
    }
  }
}

function convertLineBreaks(message: string): ReactElement<any> {
  const parts = message.split('\n');
  if (parts.length === 0) { return D.span(); }
  const lines: Array<ReactNode> = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    lines.push(D.br());
    lines.push(parts[i]);
  }
  return D.span(undefined, ...lines);
}

export default ErrorNotification;
