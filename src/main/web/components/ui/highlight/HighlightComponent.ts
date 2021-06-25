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
  highlight?: string | number;
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
    const { className, style } = this.props;
    return D.span({ className, style }, ...highlight(label, this.props.highlight, this.props.highlightProps));
  }
}

function highlight(
  sourceText: string,
  highlightedTerm: string | number,
  highlightProps: HTMLProps<HTMLSpanElement> = { className: styles.highlight }
): ReactNode[] {
  if (highlightedTerm) {
    // we need to cast highlightedTerm to string because in some cases the value that we actually get here
    // can be a number, that happens because of the way we transform html attributes to react properties.
    // see Registry#attributeValue
    const highlightedTermLower = highlightedTerm.toString().toLowerCase();
    const startIndex = sourceText.toLowerCase().indexOf(highlightedTermLower);
    if (startIndex >= 0) {
      const endIndex = startIndex + highlightedTermLower.length;
      return [
        sourceText.substring(0, startIndex),
        D.span(highlightProps, sourceText.substring(startIndex, endIndex)),
        sourceText.substring(endIndex),
      ];
    }
  }
  return [sourceText];
}

export default HighlightComponent;
