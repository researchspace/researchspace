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

/// <reference types="codemirror/codemirror-runmode" />

import { Component, createFactory } from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';

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
import 'codemirror/mode/shell/shell';

export interface CodeHighlightProps {
  codeText: string;

  /**
   * Supported modes:
   * 'text/html' - HTML
   * 'text/x-java' - Java
   * 'text/typescript' - TypeScript
   * 'text/javascript' - JavaScript
   * 'application/json' - JSON
   * 'application/ld+json' - JSON-LD
   * 'application/sparql-query' - SPARQL
   * 'text/turtle' - Turtle
   * 'application/n-triples' - N-Triples
   * 'application/n-quads' - N-Quads
   * 'text/x-sh' - Shell/Bash
   * 'application/xml' - XML
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
 */
export class CodeHighlightComponent extends Component<CodeHighlightProps, {}> {
  static defaultProps = {
    codeText: '',
    mode: 'text/html',
  };

  componentDidMount() {
    const codeNode = findDOMNode(this) as HTMLElement;
    const options = { tabSize: 2 };
    CodeMirror.runMode(this.props.codeText, this.props.mode, codeNode, options);
  }

  render() {
    return D.code({ className: 'cm-s-default' });
  }
}

export const CodeHighlight = createFactory(CodeHighlightComponent);
export default CodeHighlight;
