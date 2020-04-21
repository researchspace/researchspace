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
import { Component, ReactNode, ReactElement } from 'react';
import * as D from 'react-dom-factories';

export interface ErrorPresenterProps {
  error: any;
  className?: string;
}

export class ErrorPresenter extends Component<ErrorPresenterProps, {}> {
  render() {
    if (!this.props.error) {
      return null;
    }
    return this.wrapError(this.props.error);
  }

  wrapError(error: any): ReactElement<any> {
    const response = tryExtractResponseFromError(error);
    if (response) {
      return convertLineBreaks(this.props.className, response.text);
    } else if (typeof error === 'object' && 'message' in error) {
      const { message } = error as { message: string };
      return convertLineBreaks(this.props.className, message);
    } else if (Array.isArray(error) && error.length > 0) {
      if (error.length === 1) {
        return this.wrapError(error[0]);
      } else {
        return D.div({ className: this.props.className }, 'Multiple errors occured:', ...error.map(this.wrapError));
      }
    } else {
      if (typeof error !== 'string') {
        error = JSON.stringify(error, undefined, 4);
      }
      return convertLineBreaks(this.props.className, error);
    }
  }
}

type ErrorResponse = { text: string; status?: number } | undefined;

function tryExtractResponseFromError(error: any): ErrorResponse {
  if (!(error && typeof error === 'object')) {
    return undefined;
  }
  if ('status' in error && typeof error.status === 'number') {
    let responseText: string;
    const response = error.response;
    if (typeof response === 'string') {
      responseText = response;
    } else if (typeof response === 'object' && typeof response.text === 'string') {
      responseText = response.text;
    } else {
      responseText = (error.responseText || '') + ' ' + (error.statusText || '') + ' ' + JSON.stringify(response);
    }
    return { text: responseText, status: error.status };
  } else if ('message' in error && 'rawResponse' in error) {
    const { message, rawResponse } = error as { message: string; rawResponse: string };
    return { text: `${message}\n${rawResponse}` };
  }
  return undefined;
}

function convertLineBreaks(className: string, message: string): ReactElement<any> {
  const parts = message.split('\n');
  if (parts.length === 0) {
    return <div className={className} />;
  }
  const lines: Array<ReactNode> = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    lines.push(<br />);
    lines.push(parts[i]);
  }
  return D.div({ className }, ...lines);
}
