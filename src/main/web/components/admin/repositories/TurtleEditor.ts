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

import 'codemirror/lib/codemirror.css';

import 'codemirror/mode/turtle/turtle';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/edit/matchbrackets';

import { DomEvent, Controlled as ReactCodeMirror } from 'react-codemirror2';

import * as styles from './TurtleEditor.scss';

interface Props {
  turtleString: string;
  readonly?: boolean;
  onChange?: (turtle: string) => void;
  onMouseDown?: DomEvent;
}

export class TurtleEditorComponent extends React.Component<Props, { source: string }> {
  public editor: CodeMirror.Editor;

  static defaultProps = {
    readonly: false,
  }

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      source: props.turtleString ? props.turtleString : '',
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.turtleString !== nextProps.turtleString) {
      this.setState({ source: nextProps.turtleString });
    }
  }

  public render() {
    return React.createElement(ReactCodeMirror, {
      ref: (ref: any) => this.editor = ref?.editor,
      className: 'turtle-editor ' + styles.holder,
      value: this.state.source,
      onBeforeChange: this.onChangeTurtle,
      onMouseDown: this.onMouseDown,
      options: {
        mode: 'text/turtle',
        readOnly: this.props.readonly,
        indentWithTabs: false,
        indentUnit: 2,
        tabSize: 2,
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
  };

  private onMouseDown = (instance, event) => {
    console.log(event)
    const pos = instance.coordsChar({ left: event.pageX, top: event.pageY });
    const token = instance.getTokenAt(pos);
    this.highlightUri(instance, pos, token);

    if (this.props.onMouseDown) {
      this.props.onMouseDown(instance, event);
    }
  }

  private highlightUri(instance, pos, token) {
    // Remove previous highlights
    instance.getAllMarks().forEach(mark => mark.clear());
    
    // Add new highlight
    instance.markText({line: pos.line, ch: token.start}, {line: pos.line, ch: token.end}, {className: "highlighted-uri"});
  }
  

  public getTurtle = () => {
    return this.state.source;
  };
}

export default TurtleEditorComponent;
