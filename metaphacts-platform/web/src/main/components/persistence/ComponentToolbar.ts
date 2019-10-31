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

import * as _ from 'lodash';
import * as classnames from 'classnames';
import {
  createElement, cloneElement, Children, isValidElement, ReactElement, CSSProperties,
} from 'react';
import * as D from 'react-dom-factories';

import { Component } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import { componentHasType } from 'platform/components/utils';
import { ComponentToolbarActionsComponent } from 'platform/components/persistence/ComponentToolbarActions';
import { ComponentToolbarComponentComponent } from 'platform/components/persistence/ComponentToolbarComponent';
import { ComponentToolbarContextTypes } from './ComponentToolbarApi';

import * as styles from './ComponentToolbar.scss';


interface Props {
  className?: string
  style?: CSSProperties
}

interface State {
  error: any
  propsOverride: {}
}

/**
 * Component for performing actions from toolbar over other component.
 * Actions are described in mp-component-toolbar-actions child
 * and only component in mp-component-toolbar-component child, no other children allowed
 *
 * @example
 *  <mp-component-toolbar>
 *    <mp-component-toolbar-actions>
 *      <mp-component-toolbar-action-download />
 *      <mp-component-toolbar-action-save />
 *    </mp-component-toolbar-actions>
 *
 *    <mp-component-toolbar-component>
 *      <semantic-chart type='bar' query='...' />
 *    </mp-component-toolbar-component>
 *  </mp-component-toolbar>
 */
export class ComponentToolbarComponent extends Component<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      error: this.checkTree(props),
      propsOverride: {},
    };
  }

  static childContextTypes = {
    ...ComponentToolbarContextTypes,
    ...Component.childContextTypes
  };

  getChildContext() {
    return {
      ...super.getChildContext(),
      overrideProps: this.overrideComponentProps
    };
  }

  componentWillReceiveProps(props: Props) {
    this.setState({error: this.checkTree(props)});
  }

  private overrideComponentProps = (props: {}) => {
    this.setState({propsOverride: props});
  };

  private checkTree(props) {
    if (
      props.children.length !== 2 ||
      !_.find(props.children, child => componentHasType(child, ComponentToolbarActionsComponent)) ||
      !_.find(props.children, child => componentHasType(child, ComponentToolbarComponentComponent))
    ) {
      return `mp-component-toolbar should contain exactly 2 children: ` +
        `mp-component-toolbar-actions and mp-component-toolbar-component`;
    }
    return null;
  }

  render() {
    if (this.state.error) {
      return createElement(ErrorNotification, {errorMessage: this.state.error});
    }
    const children = Children.toArray(this.props.children);
    const actionsParent = _.find(children, child =>
      componentHasType(child, ComponentToolbarActionsComponent)
    ) as ReactElement<any>;
    const componentParent = _.find(children, child =>
      componentHasType(child, ComponentToolbarComponentComponent)
    ) as ReactElement<any>;
    const component = Children.only(componentParent.props.children);
    const updatedComponent = cloneElement(
      component, Object.assign({}, component.props, this.state.propsOverride)
    );
    const actions = actionsParent.props.children as ReactElement<any>;
    return D.div({className: this.props.className, style: this.props.style},
      D.div(
        {
          className: classnames(styles.actions, actionsParent.props.className),
          style: actionsParent.props.style,
        },
        ...(Children.map(actions, (action: ReactElement<any>) => {
          return cloneElement(action, {...action.props, component: updatedComponent});
        }))
      ),
      updatedComponent
    );
  }
}

export default ComponentToolbarComponent;
