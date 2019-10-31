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

import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/turtle/turtle';

import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/edit/matchbrackets';

import { Controlled as ReactCodeMirror } from 'react-codemirror2';

interface Props {
 turtleString: string;
 onChange?: (turtle: string) => void;
}

export class TurtleEditorComponent extends React.Component<Props, {source: string}> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      source: props.turtleString ? props.turtleString : '',
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.turtleString !== nextProps.turtleString) {
      this.setState({source: nextProps.turtleString});
    }
}

  public render() {
    const codeMirrorAddonOptions = {
      foldGutter: false,
      textAreaClassName: ['form-control'],
      matchTags: {bothTags: true},
      matchBrackets: true,
    };
    return React.createElement(ReactCodeMirror, {
      className: 'turtle-editor',
      value: this.state.source,
      onBeforeChange: this.onChangeTurtle,
      options: {
        ...codeMirrorAddonOptions,
        mode: 'text/turtle',
        indentWithTabs: false, indentUnit: 2, tabSize: 2,
        viewportMargin: Infinity,
        lineNumbers: true,
        lineWrapping: true,
        gutters: ['CodeMirror-linenumbers'],
      },
    });
  }

  onChangeTurtle = (editor: {}, editorChange: {}, source: string) => {
    if (this.props.onChange) {
      this.props.onChange(source);
    } else {
      this.setState({
        source: source,
      });
    }
  }

  public getTurtle = () => {
    return this.state.source;
  }

}

export default TurtleEditorComponent;
