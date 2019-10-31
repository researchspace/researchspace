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

import { Component, Children, createFactory} from 'react';

import { Cancellation } from 'platform/api/async';
import { Util as Security } from 'platform/api/services/security';

interface HasPermisssionProps {
  /**
   * Required permission key to display a child component.
   */
  permission: string;
}

interface State {
  readonly allowedToSee?: boolean;
}

/**
 * Displays child component if user has the required permission; otherwise displays nothing.
 *
 * @example
 * <mp-has-permission permission='delete:all:data'></mp-has-permission>
 */
export class HasPermission extends Component<HasPermisssionProps, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: HasPermisssionProps) {
    super(props);
    this.state = {allowedToSee: false};
  }

  componentWillMount() {
    this.cancellation.map(
      Security.isPermitted(this.props.permission),
    ).onValue(allowedToSee => this.setState({allowedToSee}));
  }

  render() {
    if (this.state.allowedToSee) {
      return Children.only(this.props.children);
    } else {
      return null;
    }
  }
}

export default HasPermission;
