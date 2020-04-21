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

import { Component, createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as maybe from 'data.maybe';
import * as Either from 'data.either';

import { SparqlClient } from 'platform/api/sparql';
import { Util as SecurityService, Account } from 'platform/api/services/security';
import { Table } from 'platform/components/semantic/table';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';
import { default as AccountForm } from './AccountFormComponent';

import './RealmManager.scss';

interface State {
  isLoading: boolean;
  data?: Data.Maybe<any[]>;
  selectedAccount?: Data.Maybe<Account>;
  err?: Data.Maybe<string>;
}

class AccountManagerComponent extends Component<{}, State> {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      data: maybe.Nothing<any[]>(),
      selectedAccount: maybe.Nothing<Account>(),
      err: maybe.Nothing<string>(),
    };
  }

  public render() {
    if (this.state.err.isJust) {
      return createElement(TemplateItem, { template: { source: this.state.err.get() } });
    }
    if (this.state.isLoading) {
      return createElement(Spinner);
    }

    return D.div(
      {},
      this.renderAccountTable(),
      AccountForm({
        selectedAccount: this.state.selectedAccount,
        refreshCallback: this.fetchAccounts,
      })
    );
  }

  public componentWillMount() {
    this.fetchAccounts();
  }

  private getRowClass = (account: Account): string => {
    if (this.state.selectedAccount.isNothing) {
      return '';
    }

    return account.principal === this.state.selectedAccount.get().principal ? 'bg-success' : '';
  };

  private renderAccountTable() {
    const griddleOptions = {
      onRowClick: this.onRowClick.bind(this),
      rowMetadata: { bodyCssClassName: this.getRowClass },
    };

    return D.div(
      {},
      createElement(Table, {
        layout: maybe.Just<{}>({
          options: griddleOptions,
          tupleTemplate: maybe.Nothing<string>(),
        }),
        numberOfDisplayedRows: maybe.Just<number>(10),
        data: Either.Left<any[], SparqlClient.SparqlSelectResult>(this.state.data.get()),
        columnConfiguration: [
          { variableName: 'principal', displayName: 'User Principal' },
          { variableName: 'roles', displayName: 'Roles' },
          {
            variableName: 'permissions',
            displayName: 'Permissions',
            cellTemplate:
              '<ul class="account-manager-component__account-permissions-ul">{{#each this.permissions as |permission|}}<li class="account-manager-component__account-permissions-li">{{ permission }} </li>{{/each}}</ul>',
          },
        ],
      })
    );
  }

  private onRowClick = (e: Component<{}, {}>): void => {
    const account = <Account>e.props['data'];
    const stateAccount = this.state.selectedAccount
      .map((currentSelected) =>
        currentSelected.principal === account.principal ? maybe.Nothing<Account>() : maybe.Just<Account>(account)
      )
      .getOrElse(maybe.Just<Account>(account));

    this.setState({
      isLoading: false,
      selectedAccount: stateAccount,
    });
  };

  private fetchAccounts = (): void => {
    this.setState({
      isLoading: true,
      selectedAccount: maybe.Nothing<Account>(),
    });

    SecurityService.getAllAccounts()
      .onValue((accounts) =>
        this.setState({
          isLoading: false,
          data: maybe.Just(accounts),
        })
      )
      .onError((err) =>
        this.setState({
          isLoading: false,
          err: maybe.Just(err),
        })
      );
  };
} // end component

const AccountManager = createFactory(AccountManagerComponent);
export default AccountManager;
