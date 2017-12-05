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

import * as block from 'bem-cn';
import * as classNames from 'classnames';
import * as _ from 'lodash';
block.setup({
    mod: '--',
});

import * as CopyToClipboard from 'react-copy-to-clipboard';
import * as Maybe from 'data.maybe';

import {
  DOM as D, Component, createElement, ReactNode,
} from 'react';

import { ModuleRegistry } from 'platform/api/module-loader';
import { Spinner } from 'platform/components/ui/spinner';

import CodeHighlight from './CodeHighlight';
import './code-example.scss';

interface Props {
  codeText: string;
  showCode?: boolean;
}

interface State {
  showCode?: boolean;
  renderedCode?: Data.Maybe<ReactNode>;
}

const b = block('code-example');

/**
 * Component which can be used to create interactive html snippets.
 * With code highlight and copy to clipboard option.
 *
 * @example
 *    <mp-code-example><semantic-table>...</semantic-table></mp-code-example>
 */
export class CodeExample extends Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      showCode: _.isUndefined(props.showCode) ? false : props.showCode,
      renderedCode: Maybe.Nothing<ReactNode>(),
    };
  }

  componentDidMount() {
    this.loadCode(this.props.codeText);
  }

  componentWillReceiveProps(props: Props) {
    if (props.codeText !== this.props.codeText) {
      this.loadCode(props.codeText);
    }
  }

  private loadCode(codeText: string) {
    ModuleRegistry.parseHtmlToReact(codeText).then(
      components => this.setState({renderedCode: Maybe.Just(components)})
    );
  }

  render() {
    return D.div(
      {className: b.toString()},
      this.renderToolbar(),
      this.renderedCode(),
      this.code()
    );
  }

  private renderedCode() {
    return D.div(
      {
        style: {display: this.state.showCode ? 'none' : 'block' },
      },
      this.state.renderedCode.getOrElse(createElement(Spinner))
    );
  }

  private code() {
    if (this.state.showCode) {
      return D.pre(
        {className: b('code')},
        CodeHighlight({
          codeText: this.props.codeText,
          mode: 'text/html',
        })
      );
    } else {
      return null;
    }
  }

  private renderToolbar() {
    return D.div(
      {},
      D.button(
        {
          className: classNames(
            'btn', 'btn-default', b('toggle', {'open': this.state.showCode, 'close': !this.state.showCode}).toString()
          ),
          onClick: this.onCodeToggle,
        },
        D.i({})
      ),
      createElement(
        CopyToClipboard,
        {
          text: this.props.codeText,
        },
        D.button(
          {
            className: classNames('btn', 'btn-default', b('copy').toString()),
          },
          D.i({})
        )
      )
    );
  }

  private onCodeToggle = () => {
    this.setState({
      showCode: !this.state.showCode,
    });
  }
}

export default CodeExample;
