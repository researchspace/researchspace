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

import '../../styling/main.scss';

import * as React from 'react';
import * as ReactBootstrap from 'react-bootstrap';

import * as SecurityService from 'platform/api/services/security';
import { ResourceLinkContainer } from 'platform/api/navigation/components';

const NavDropdown = React.createFactory(ReactBootstrap.NavDropdown);
const NavItem = React.createFactory(ReactBootstrap.NavItem);
const MenuItem = React.createFactory(ReactBootstrap.MenuItem);

export class NavAccountComponentClass extends React.Component<{}, any> {
  constructor(props: {}, context: any) {
    super(props, context);
    this.state = {
      user: { isAuthenticated: false },
    };
  }

  componentWillMount() {
    SecurityService.Util.getUser((userObject) =>
      this.setState({
        user: userObject,
      })
    );
  }

  render() {
    return this.state.user.isAuthenticated && !this.state.user.isAnonymous
      ? NavDropdown(
          { id: 'main-header-dropdown', title: 'Account' },
          // React.createElement(ResourceLinkContainer,
          //  {uri: this.state.user.userURI},
          MenuItem({ title: 'userPrincipal', disabled: true }, this.state.user.principal),
          // ),
          MenuItem({ divider: true }, ''),
          MenuItem({ title: 'logout', href: '/logout' }, 'Logout')
        )
      : NavItem({ title: 'login', href: '/login' }, 'Login');
  }
}

export const NavAccount = React.createFactory(NavAccountComponentClass);
export default NavAccountComponentClass;
