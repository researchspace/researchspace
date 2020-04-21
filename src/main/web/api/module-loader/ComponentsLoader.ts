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

import { Component, createElement, createFactory, ReactType, Props as ReactProps } from 'react';
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
    loadComponent(this.props.componentTagName).then((component) =>
      this.setState({
        component: maybe.Just(component),
      })
    );
  }

  render() {
    return this.state.component
      .map((component) => createElement(component as any, this.props.componentProps, this.props.children))
      .getOrElse(null);
  }
}

export type component = ComponentLoader;
export const component = ComponentLoader;
export const factory = createFactory(component);
export default component;
