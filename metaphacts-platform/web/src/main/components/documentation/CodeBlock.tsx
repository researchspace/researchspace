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
import * as CopyToClipboard from 'react-copy-to-clipboard';
import { Button, ButtonGroup } from 'react-bootstrap';

import { Component, ComponentProps } from 'platform/api/components';

import { CodeHighlightComponent, CodeHighlightProps } from './CodeHighlight';
import * as styles from './CodeBlock.scss';

export interface CodeBlockProps extends CodeHighlightProps, ComponentProps {
  showCopyButton?: boolean;
  showRunQueryButton?: boolean;
}

const MODE_TEXT = {
  'text/html': 'HTML',
  'application/sparql-query': 'SPARQL',
  'text/x-java': 'Java',
  'text/typescript': 'TypeScript',
  'text/javascript': 'JavaScript',
  'text/turtle': 'RDF/Turtle',
  'application/n-triples': 'RDF/N-Triples',
  'application/n-quads': 'RDF/N-Quads',
  'application/json': 'JSON',
  'application/ld+json': 'JSON-LD',
  'text/x-sh': 'Shell',
  'application/xml': 'XML',
};

/**
 * Component for code block highlight with optional copy to clipboard button
 * and execute query button for sparql queries.
 *
 * @example
 * <pre>
 *  <mp-code-block data-mode="application/typescript">const x = 5</mp-code-block>
 * </pre>
 */
export class CodeBlock extends Component<CodeBlockProps, {}> {
  static defaultProps = {
    mode: 'text/html',
    showCopyButton: true,
    showRunQueryButton: true,
  };

  render() {
    const { mode, showCopyButton, codeText } = this.props;
    return <div className={styles.holder}>
      <div className={styles.modeLabel}>{this.getCodeModeText(mode)}</div>
      <pre>
        <CodeHighlightComponent mode={mode} codeText={codeText} />
      </pre>
      <ButtonGroup>
        {this.copyButton(codeText, showCopyButton)}
        {this.showRunQueryButton(codeText)}
      </ButtonGroup>
    </div>;
  }

  private copyButton = (text: string, showCopyButton: boolean) => {
    if (showCopyButton) {
      return <CopyToClipboard text={text}>
        <Button bsStyle='primary'>Copy to Clipboard</Button>
      </CopyToClipboard>;
    } else {
      return null;
    }
  }

  private showRunQueryButton = (text: string) => {
    const { mode, showRunQueryButton } = this.props;
    const {repository} = this.context.semanticContext;
    if (mode === 'application/sparql-query' && showRunQueryButton) {
      const url = `/sparql?query=${encodeURIComponent(text)}&repository=${repository}`;
      return <a style={{marginLeft: 10}}
                target='_blank' href={url}
                className='btn btn-primary run-query-button'>Run Query</a>;
    } else {
      return null;
    }
  }

  private getCodeModeText = (mode: string) => MODE_TEXT[mode] || mode;
}
export default CodeBlock;
