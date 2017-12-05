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

/// <reference types="codemirror/codemirror-runmode" />

import { DOM as D, Component, createFactory } from 'react';
import { findDOMNode } from 'react-dom';
import * as CopyToClipboard from 'react-copy-to-clipboard';

import * as CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/addon/mode/simple';
import 'codemirror/addon/runmode/runmode';
import 'codemirror/addon/mode/multiplex';
import 'codemirror/mode/handlebars/handlebars';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/sparql/sparql';
import 'codemirror/mode/turtle/turtle';

interface Props {
  codeText: string;

  /**
   * Supported modes:
   * 'text/html' - HTML
   * 'text/x-java' - Java
   * 'application/typescript' - TypeScript
   * 'text/javascript' - JavaScript
   * 'application/sparql-query' - SPARQL
   * 'text/turtle' - Turtle
   *
   * @default text/html
   */
  mode?: string;
}

/**
 * Component for code highlight. In templates it is exposed as a <code> tag.
 *
 * For inline code highlight with default 'html' mode one can just use '<code>' tag:
 * @example
 *   <p>Some text <code><a>Hello World</a></code> </p>
 *
 * To have a code block, just wrap the code block into pre tag:
 * @example
 * <pre>
 *  <code data-mode="application/typescript">const x = 5</code>
 * </pre>
 */
export class CodeHighlightComponent extends Component<Props, {}> {

  static defaultProps = {
    codeText: '',
    mode: 'text/html',
  };

  componentDidMount() {
    const codeNode = findDOMNode<HTMLElement>(this);
    const options = {tabSize: 2};
    CodeMirror.runMode(this.props.codeText, this.props.mode, codeNode, options);
  }

  render() {
    return D.code({className: 'cm-s-default'});
  }
}

export const CodeHighlight = createFactory(CodeHighlightComponent);
export default CodeHighlight;
