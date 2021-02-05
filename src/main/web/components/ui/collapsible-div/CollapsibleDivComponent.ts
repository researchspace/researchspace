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

import { Component, Children, createElement, cloneElement } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';

import { componentHasType } from 'platform/components/utils';

import { CollapsibleDivTriggerComponent } from './CollapsibleDivTriggerComponent';
import { CollapsibleDivContentComponent } from './CollapsibleDivContentComponent';

export interface Props {
  /**
   * Whether panel should be expanded by default.
   */
  expanded?: boolean;

  /**
   * True if hidden content should be rendered, with display: none, even when it is hidden.
   * It is useful sometimes to render even hidden content when some component expects existence of the nested components, like in semantic-forms.
   * @default false
   */
  renderHidden?: boolean;
}

interface State {
  expanded: boolean;
}

/**
 * @example
   <mp-collapsible-div expanded='true'>
      <mp-collapsible-div-trigger expanded-class="x" collapsed-class="y">
          <i class="fa fa-question-circle" aria-hidden="true"></i>
      </mp-collapsible-div-trigger>
      <mp-collapsible-div-content>Content</mp-collapsible-div-content>
  </mp-collapsible-div>
 */
export class CollapsibleDivComponent extends Component<Props, State> {
  public static defaultProps: Props = {
    expanded: true,
    renderHidden: false,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      expanded: this.props.expanded,
    };
  }

  render() {
    const { renderHidden } = this.props;
    const { expanded } = this.state;

    const children = Children.toArray(this.props.children);
    const triggerComponent = _.find(children, (child) => componentHasType(child, CollapsibleDivTriggerComponent));
    const contentComponent = _.find(children, (child) => componentHasType(child, CollapsibleDivContentComponent));

    const triggerChildren = (Children.only(triggerComponent) as React.ReactElement<any>).props.children;
    const contentChildren = (Children.only(contentComponent) as React.ReactElement<any>).props.children;

    const { expandedClass, collapsedClass } = (Children.only(triggerComponent) as React.ReactElement<any>).props;
    return D.div(
      {},
      createElement(
        CollapsibleDivTriggerComponent,
        {
          expandedClass,
          collapsedClass,
          expanded: expanded,
          onClick: () => this.setState({ expanded: !expanded }),
        },
        cloneElement(triggerChildren, {})
      ),
      createElement(CollapsibleDivContentComponent, { expanded: expanded, renderHidden }, contentChildren)
    );
  }
}

export default CollapsibleDivComponent;
