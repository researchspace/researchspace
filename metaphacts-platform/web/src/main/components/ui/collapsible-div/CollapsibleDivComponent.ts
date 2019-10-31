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
  expanded: boolean;
}

interface State {
  expanded: boolean;
}

/**
 * @example
   <mp-collapsible-panel expanded='true'>
      <mp-collapsible-panel-trigger expanded-class="x" collapsed-class="y">
          <i class="fa fa-question-circle" aria-hidden="true"></i>
      </mp-collapsible-panel-trigger>
      <mp-collapsible-panel-content>Content</mp-collapsible-panel-content>
  </mp-collapsible-panel >
 */
export class CollapsibleDivComponent extends Component<Props, State> {
  public static defaultProps: Props = {
    expanded: true,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      expanded: this.props.expanded,
    };
  }

  render() {
    const {expanded} = this.state;

    const children = Children.toArray(this.props.children);
    const triggerComponent =
      _.find(children,
        child => componentHasType(child, CollapsibleDivTriggerComponent));
    const contentComponent =
      _.find(children,
        child => componentHasType(child, CollapsibleDivContentComponent));

    const triggerChildren =
      (Children.only(triggerComponent) as React.ReactElement<any>).props.children;
    const contentChildren =
      (Children.only(contentComponent) as React.ReactElement<any>).props.children;

    const {expandedClass, collapsedClass} =
      (Children.only(triggerComponent) as React.ReactElement<any>).props;
    return D.div({},
      createElement(CollapsibleDivTriggerComponent, {
        expandedClass,
        collapsedClass,
        expanded: expanded,
        onClick: () => this.setState({expanded: !expanded}),
      }, cloneElement(triggerChildren, {})),
      createElement(CollapsibleDivContentComponent,
        {expanded: expanded}, cloneElement(contentChildren, {})
      )
    );
  }
}

export default CollapsibleDivComponent;
