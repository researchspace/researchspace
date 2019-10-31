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

import { Component } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';

/*
Component to render a simple a href link <i class={props.className}><a href={props.linkText} onClick={props.onClick}></i>
which will be hidden after executing the onClick action.
*/
export class HideableLink extends Component<{onClick: () => void; linkText: string; className?: string}, {isVisible: boolean}> {
  constructor(props) {
      super(props);
      this.state = { isVisible : true};
  }

  private onClick() {
    this.props.onClick();
    this.setState(
      {isVisible: false}
    );
  }

  render() {
     var css = !_.isUndefined(this.props.className) ? this.props.className : 'fa fa-angle-double-down pull-right';
     return this.state.isVisible ?  D.i({className: css}, D.a({onClick: this.onClick.bind(this)}, this.props.linkText)) : null;
   }
}

export default HideableLink;
