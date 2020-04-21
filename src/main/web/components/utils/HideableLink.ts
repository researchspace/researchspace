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

import { Component } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';

/*
Component to render a simple a href link <i class={props.className}><a href={props.linkText} onClick={props.onClick}></i>
which will be hidden after executing the onClick action.
*/
export class HideableLink extends Component<
  { onClick: () => void; linkText: string; className?: string },
  { isVisible: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { isVisible: true };
  }

  private onClick() {
    this.props.onClick();
    this.setState({ isVisible: false });
  }

  render() {
    var css = !_.isUndefined(this.props.className) ? this.props.className : 'fa fa-angle-double-down pull-right';
    return this.state.isVisible
      ? D.i({ className: css }, D.a({ onClick: this.onClick.bind(this) }, this.props.linkText))
      : null;
  }
}

export default HideableLink;
