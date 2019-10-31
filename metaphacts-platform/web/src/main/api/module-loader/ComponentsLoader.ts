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
  createFactory,
  ReactType,
  Props as ReactProps,
} from 'react';
import * as maybe from 'data.maybe';

import { loadComponent } from './ComponentsStore';

export interface Props extends ReactProps<ComponentLoader> {
  componentTagName: string;
  componentProps: any;
}

interface State {
  component: Data.Maybe<ReactType>;
}

/**
 * Asynchronously load React component implementation and
 * renders it as soon as it becomes available.
 */
class ComponentLoader extends Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      component: maybe.Nothing<ReactType>(),
    };
  }

  componentDidMount() {
    loadComponent(
      this.props.componentTagName
    ).then(
      (component) =>
        this.setState({
          component: maybe.Just(component),
        })
    );
  }

  render() {
    return this.state.component.map(
      component => createElement(
        component as any, this.props.componentProps, this.props.children
      )
    ).getOrElse(null);
  }
}

export type component = ComponentLoader;
export const component = ComponentLoader;
export const factory = createFactory(component);
export default component;
