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

import { createFactory, Component } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';

import AccountManager from './AccountManagerComponent';

import './RealmManager.scss';

const Tab = createFactory(ReactBootstrap.Tab);
const Tabs = createFactory(ReactBootstrap.Tabs);

class RealmManager extends Component<{}, {}> {

    constructor(props) {
      super(props);
    }

    render() {
      return D.div(
        {className: 'realm-manager-component'},
        Tabs(
          {
            id: 'security-manager-tabs', defaultActiveKey: 'ini-realm',
            bsStyle: 'tabs', animation: true,
          },
          Tab({ eventKey: 'ini-realm', title: 'INI Realm'},
            AccountManager()
          ),
          Tab(
            {eventKey: 'ldap-realm', title: 'LDAP Realm'},
            D.div(
              {},
              'Please contact ',
              D.a(
                {href: 'mailto:support@metaphacts.com'},
                'support@metaphacts.com'
              ),
              ' in case you are interested in connecting the platform to LDAP.'
            )
          )
        )
      );
    }
}

export default RealmManager;
