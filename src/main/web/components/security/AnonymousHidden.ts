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

import { createFactory, createElement, Props as ReactProps, Children } from 'react';

import * as _ from 'lodash';

import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { Util as Security } from 'platform/api/services/security';

interface Props extends ReactProps<AnonymousHiddenComponentClass> {
  alt?: string;
}

/**
 * Usage example:
 * <mp-anonymous-hidden><b>Text not to be shown to anonymous user</b></mp-anonymous-hidden>
 * <mp-anonymous-hidden alt="No permission.">
 *    <b>Text not to be shown to anonymous user</b>
 * </mp-anonymous-hidden>
 */
export class AnonymousHiddenComponentClass extends Component<Props, { isAnonymous: boolean }> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      isAnonymous: null,
    };
  }

  componentDidMount() {
    Security.isAnonymous((b) => this.setState({ isAnonymous: b }));
  }

  render() {
    const { isAnonymous } = this.state;
    if (isAnonymous && !_.isUndefined(this.props.alt)) {
      return createElement(TemplateItem, { template: { source: this.props.alt } });
    } else if (isAnonymous === false) {
      return Children.only(this.props.children);
    } else {
      return null;
    }
  }
}

export type component = AnonymousHiddenComponentClass;
export const component = AnonymousHiddenComponentClass;
export const factory = createFactory(component);
export default component;
