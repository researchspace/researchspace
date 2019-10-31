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

import {
  Component,
  createElement,
  ReactElement,
  CSSProperties,
} from 'react';
import * as D from 'react-dom-factories';
import ReactTruncate from 'react-truncate';

import { ModuleRegistry } from 'platform/api/module-loader';

import * as TextTruncateExpandCollapseComponent from './TextTruncateExpandCollapseComponent';

export interface Props {
  /**
   * Specifies how many lines of text should be preserved until it gets truncated
   * @default 1
   */
  lines?: number;
  /**
   * Element that is added to the end of the text in case it is truncated
   * @default '...'
   */
  truncate?: string;
  /**
   * Html element that is used to expand text
   */
  expand?: string;
  /**
   * Html element that is used to collapse text
   */
  collapse?: string;
  className?: string;
  style?: CSSProperties;
}

export interface State {
  expanded?: boolean;
  truncateElement?: ReactElement<any> | ReactElement<any>[];
  expandElement?: ReactElement<any>;
  collapseElement?: ReactElement<any>;
}

/**
 * @example
 * <mp-text-truncate>Text</mp-text-truncate>
 *
 * @example
 * <mp-text-truncate lines=2 expand='<button>Expand</button>' collapse='<button>Collapse</button>'>
 *     Text
 * </mp-text-truncate>
 *
 * @example
 * <mp-text-truncate truncate='... <a href="#">Read more</a>'>
 *     Text
 * </mp-text-truncate>
 */
export class TextTruncateComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      expanded: false,
    };
  }

  componentDidMount() {
    const {truncate, expand, collapse} = this.props;

    if (truncate) {
      ModuleRegistry.parseHtmlToReact(truncate).then(element => {
        this.setState({truncateElement: element});
      });
    } else {
      this.setState({truncateElement: D.span({}, '')});
    }

    if (expand) {
      ModuleRegistry.parseHtmlToReact(expand).then(element => {
        this.setState({
          expandElement:
            TextTruncateExpandCollapseComponent.factory({onClick: this.handleExpand}, element),
        });
      });
    }

    if (collapse) {
      ModuleRegistry.parseHtmlToReact(collapse).then(element => {
        this.setState({
          collapseElement:
            TextTruncateExpandCollapseComponent.factory({onClick: this.handleExpand}, element),
        });
      });
    }
  }

  private handleExpand = () => {
    this.setState({expanded: !this.state.expanded});
  }

  render() {
    const {lines, className, style} = this.props;
    const {expanded, truncateElement, expandElement, collapseElement} = this.state;

    const ellipsis = D.span({}, truncateElement, expandElement);

    return truncateElement ? D.div({className, style},
      createElement(ReactTruncate, {
        lines: expanded ? 0 : lines || 1,
        ellipsis: ellipsis,
      }, this.props.children),
      expanded ? collapseElement : null
    ) : null;
  }
}

export default TextTruncateComponent;
