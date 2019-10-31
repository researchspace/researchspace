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

import { Component, ReactNode, ReactElement, createElement, createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';

import { ErrorPresenter } from './ErrorPresenter';

const Panel = createFactory(ReactBootstrap.Panel);

const CLASS_NAME = 'error-notification';

type ErrorValue =
  | string
  | { message: string; }
  | { responseText: string }
  | { status: number; }
  | ErrorValues;

interface ErrorValues extends ReadonlyArray<ErrorValue> {}

export interface ErrorNotificationProps {
  title?: string;
  errorMessage?: ErrorValue;
  className?: string;
  children?: ReactNode;
  defaultExpanded?: boolean;
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
    const {errorMessage} = this.props;
    const isTimeout = isTimeoutError(errorMessage);

    const title = this.props.title || defaultTitleForError(errorMessage);
    const className = `${CLASS_NAME} ${this.props.className || ''}`;
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
        className,
        defaultExpanded: isTimeout || this.props.defaultExpanded,
      },
      errorMessage
        ? createElement(ErrorPresenter, {error: errorMessage})
        : this.props.children,
    );
  }
}

function defaultTitleForError(error: ErrorValue) {
  return isTimeoutError(error)
    ? 'Request Timeout'
    : 'Error occurred! Click to see more details.';
}

function isTimeoutError(error: ErrorValue): boolean {
  if (!(error && typeof error === 'object')) { return false; }
  const {status} = error as { status: number };
  return status && status === 504;
}

export default ErrorNotification;
