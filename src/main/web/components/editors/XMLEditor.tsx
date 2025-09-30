/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
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
import { Button, FormControl, InputGroup, Panel } from 'react-bootstrap';
import * as _ from 'lodash';

import { DomEvent, Controlled as ReactCodeMirror } from 'react-codemirror2';

import 'codemirror/lib/codemirror.css';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/scroll/simplescrollbars.css';


import 'codemirror/mode/xml/xml';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/xml-fold';
import 'codemirror/addon/edit/matchtags';
import 'codemirror/addon/scroll/simplescrollbars';

import * as styles from './XMLEditor.scss';
import { 
  evaluateMultipleXPathsOnXml, 
  XPathResultItem 
} from './XPathEvaluator';
import * as CodeMirror from 'codemirror';

interface Props {
  content?: string;
  contentURL?: string;
  fileName?: string;
  readonly?: boolean;
  onChange?: (turtle: string) => void;
  onMouseDown?: DomEvent;
}

interface State {
  content: string;
  inputs: { key: string, value: string}[];
  xpathUIExpanded: boolean;
  xPathResults?: {[xpath: string]: XPathResultItem[]};
}

export class XMLEditor extends React.Component<Props, State> {

  private editor: CodeMirror.Editor;

  static defaultProps = {
    readonly: false,
  }

  constructor(props: Props) {
    super(props);
    this.state = {
      content: props.content,
      inputs: [{ key: `input-0-${Date.now()}`, value: '' }],
      xpathUIExpanded: false,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (this.props.content !== nextProps.content) {
      this.setState({ content: nextProps.content });
    }
  }

  componentDidMount() {
    if (this.props.contentURL) {
      fetch(this.props.contentURL).then(response => {
          // Check if the request was successful
          if (!response.ok) {
              console.error(response);
              throw new Error(
                `HTTP error! Can't get XML document from the specified url: ${this.props.contentURL}.Status: ${response.status}`
              );
          }
          return response.text();
      }).then(text => {
        this.setState({ content: text });
      })
    }
  }

  public render() {
    const { xpathUIExpanded, xPathResults } = this.state;
    const codeMirrorAddonOptions: any = {
      foldGutter: true,
      scrollbarStyle: 'simple',
      // TODO there is a problem with react codemirror, when one uses options that is not a simple value,
      // then it re-set this option on every re-render which cause huge performance degradation
      // need to think how to workaround or path the library or maybe try to set the value bypassing
      // react component and directly on the codemirror instance

      //gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    };

    const editorProps = {
      ref: ref => this.editor = ref?.editor,
      value: this.state.content,
      onBeforeChange: this.onChange,
      onMouseDown: this.onMouseDown,
      options: {
        ...codeMirrorAddonOptions,
        mode: 'xml',
        readOnly: this.props.readonly,
        indentWithTabs: false,
        indentUnit: 2,
        tabSize: 2,
        viewportMargin: Infinity,
        lineNumbers: true,
        lineWrapping: true,
      },
    };

    return (
      <div className={styles.holder}>
        <div className={styles.editorAreaHolder}>
          <Panel collapsible 
            header={<span> {xpathUIExpanded ? <span>&#9662;</span> : <span>&#9656;</span>}&nbsp;XPath Tool</span>}
            onSelect={this.onXPathPanelHeaderClick}
          >
            {this.state.inputs.map((input, index) => (
              <div key={input.key} className={styles.flexRow}>
                <InputGroup>
                  <FormControl
                    type="text"
                    value={input.value}
                    placeholder='xpath'
                    onChange={(e) => this.handleInputChange(input.key, e)}
                  />
                  <InputGroup.Button>
                    <Button onClick={() => this.addInput(index)}>+</Button>
                    <Button onClick={() => this.removeInput(input.key)} disabled={this.state.inputs.length === 1}>-</Button>
                  </InputGroup.Button>
                </InputGroup>
              </div>
            ))}
            <div className={styles.buttonRow}>
              {/* disable button if all inputs are empty */}
              <Button disabled={_.every(this.state.inputs, i => _.isEmpty(i.value))} bsStyle='primary' onClick={this.onEvaluateXPathClick}>Evaluate XPath</Button>
            </div>

            {this.state.xPathResults && (
              <div>
                <hr/>
                <ul className={styles.xPathResultsList}>
                  {_.keys(xPathResults).map((xpath, i) => (
                    <li key={i}>
                      <span className={styles.xPathResultHeader}>{xpath}</span>: {xPathResults[xpath].map((result, j) => 
                        result.resultType === 'string' ? <span>{result.text}</span> :
                        <Button bsStyle='link' key={j} onClick={this.onFocusElementClick(result)}>
                          {result.text}
                        </Button>)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <div className={styles.editorHolder}>
            <ReactCodeMirror {...editorProps}/>
          </div>
        </div>
      </div>
    );
  }

  private onXPathPanelHeaderClick = () => {
    this.setState({xpathUIExpanded: !this.state.xpathUIExpanded});
  }

  onChange = (editor: {}, editorChange: {}, source: string) => {
    if (this.props.onChange) {
      this.props.onChange(source);
    } else {
      this.setState({
        content: source,
      });
    }
  };

  private onMouseDown = (instance, event) => {
    const target = event.target as HTMLElement;

    // Check if the click is on the fold gutter
    if (target.className.includes('CodeMirror-foldgutter')) {
      // Let fold plugin handle this click
      return;
    }
    this.props.onMouseDown(instance, event);
  }

  // xpath inputs
  handleInputChange = (key: string, event: React.FormEvent<FormControl>) => {
    const newInputs = this.state.inputs.map(input => 
      input.key === key ? { ...input, value: (event.target as HTMLInputElement).value } : input
    );
    this.setState({ inputs: newInputs });
  };

  addInput = (index: number) => {
    this.setState(prevState => {
      const newInput = { key: `input-${prevState.inputs.length}-${Date.now()}`, value: '' };
      const newInputs = prevState.inputs.slice(0, index + 1)
        .concat(newInput)
        .concat(prevState.inputs.slice(index + 1));
      return { inputs: newInputs };
    });
  };

  removeInput = (key: string) => {
    this.setState(prevState => ({
      inputs: prevState.inputs.filter(input => input.key !== key)
    }));
  };


  onEvaluateXPathClick = () => {
    const xpaths = this.state.inputs.map(i => i.value).filter(i => !_.isEmpty(i));
  
    evaluateMultipleXPathsOnXml(this.state.content, xpaths)
      .then((xPathResults: XPathResultItem[]) => {
        this.highlightMatches(this.editor, xPathResults);
        this.setState({ xPathResults: _.groupBy(xPathResults, 'xpath') });
      })
      .catch(err => console.error(err));
  };
  
  public scrollToXPath = (xpath: string) => {
    evaluateMultipleXPathsOnXml(this.state.content, [xpath])
      .then((result: XPathResultItem[]) => {
        if (result.length > 0) {
          this.scrollToElement(result[0]);
        }
      })
      .catch(err => console.error(err));
  }
  
  public highlightXPaths = (xpaths: Array<string>) => {
    evaluateMultipleXPathsOnXml(this.state.content, xpaths)
      .then((result: XPathResultItem[]) => {
        this.highlightMatches(this.editor, result);
      })
      .catch(err => console.error(err));
  };

  onFocusElementClick = (result: XPathResultItem) => () => {
    this.scrollToElement(result);
  };

  scrollToElement = (result: XPathResultItem) => {
    const from = { line: result.startLine, ch: result.startOffset };
    const to = { line: result.endLine, ch: result.endOffset };

    this.editor.scrollIntoView({ from, to });

    // set blinking effecs css class and clear it in 1 second to stop blinking
    const mark = this.editor.markText(from, to, { className: styles.activeXMLElement });
    setTimeout(() => mark.clear(), 1000);
  }

  /**
   * Highlights the given matches in the CodeMirror instance.
   * @param cm The CodeMirror instance.
   * @param matches Array of XPathResultItem containing match details.
   */
  highlightMatches(cm: any, matches: XPathResultItem[]): void {
    // Remove previous highlights
    cm.getAllMarks().forEach(mark => mark.clear());

    matches.forEach(match => {
      if (match.resultType == 'node') {
        // Convert the start and end positions to CodeMirror's format
        const startPos = { line: match.startLine, ch: match.startOffset };
        const endPos = { line: match.endLine, ch: match.endOffset };

        // Mark the text range in CodeMirror
        cm.markText(startPos, endPos, { className: 'highlighted-text' });
      }
    });
  }
}

export default XMLEditor;
