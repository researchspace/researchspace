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

import { Component, CSSProperties, ReactElement, ReactNode, HTMLProps } from 'react';
import * as D from 'react-dom-factories';
import * as styles from './HighlightComponent.scss';


export interface Props {
  /**
   * Additional class names for component root element
   */
  className?: string;
  /**
   * Additional styles for label element
   */
  style?: CSSProperties;
  /**
   * Substring to highlight
   */
  highlight?: string;
  /**
   * Props for highlighted substring span
   */
  highlightProps?: HTMLProps<HTMLSpanElement>;
}

/**
 * @example
 * <mp-highlight highlight="text">some text here</mp-highlight>
 */
export class HighlightComponent extends Component<Props, {}> {
  render(): ReactElement<any> {
    if (typeof this.props.children !== 'string') {
      throw 'Children of HighlightComponent must be string';
    }
    const label = this.props.children;
    const {className, style} = this.props;
    return D.span(
      {className, style},
      ...highlight(label, this.props.highlight, this.props.highlightProps)
    );
  }
}

function highlight(
  sourceText: string,
  highlightedTerm: string,
  highlightProps: HTMLProps<HTMLSpanElement> = {className: styles.highlight}
): ReactNode[] {
  if (highlightedTerm) {
    const highlightedTermLower = highlightedTerm.toLowerCase();
    const startIndex = sourceText.toLowerCase().indexOf(highlightedTermLower);
    if (startIndex >= 0) {
      const endIndex = startIndex + highlightedTermLower.length;
      return [
        sourceText.substring(0, startIndex),
        D.span(
          highlightProps,
          sourceText.substring(startIndex, endIndex)),
        sourceText.substring(endIndex),
      ];
    }
  }
  return [sourceText];
}

export default HighlightComponent;
