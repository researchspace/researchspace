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

import * as React from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import ReactSelect, { ReactSelectProps, ReactAsyncSelectProps } from 'react-select';

import { Util as SecurityService, RoleDefinition } from 'platform/api/services/security';
import { Spinner } from 'platform/components/ui/spinner';

interface State {
  isLoading: boolean;
  roleString?: Data.Maybe<string>;
  backendRoles?: Data.Maybe<RoleDefinition[]>;
}

interface Props {
  inputName: string;
  initialRoles: Data.Maybe<string>;
  onChangeCallback?: (name: string, value: string) => void;
}

interface Role {
  value: string;
  label: string;
}

class RoleMultiSelectorComponent extends React.Component<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      isLoading: true,
      roleString: maybe.Nothing<string>(),
      backendRoles: maybe.Nothing<RoleDefinition[]>(),
    };
  }

  render(): React.ReactElement<any> {
    if (this.state.isLoading || this.state.backendRoles.isNothing) {
      return React.createElement(Spinner);
    }
    return D.div({}, this.renderSelector());
  }

  renderSelector() {
    var data = new Array<Role>();
    _.map(this.state.backendRoles.get(), (role) => data.push({ value: role.roleName, label: role.roleName }));

    const selectOptions: ReactSelectProps = {
      value: this.state.roleString.map((r) => r).getOrElse(this.props.initialRoles.map((r) => r).getOrElse('')),
      className: 'dataset-selector__multi-select',
      name: this.props.inputName,
      multi: true,
      options: data,
      clearable: true,
      autoload: true,
      clearAllText: 'Remove all',
      clearValueText: 'Remove role',
      delimiter: ',',
      disabled: false,
      ignoreCase: true,
      matchPos: 'any',
      matchProp: 'any',
      noResultsText: 'No roles found',
      placeholder: 'Select roles',
      onChange: this.onChangeRoleSelection,
    };

    return React.createElement(ReactSelect, selectOptions);
  }

  private onChangeRoleSelection = (roles: Role[]) => {
    var newRoles = _.map(roles, 'value').join(',');
    this.setState({ isLoading: false, roleString: maybe.Just(newRoles) });
    if (!_.isUndefined(this.props.onChangeCallback)) {
      this.props.onChangeCallback(this.props.inputName, newRoles);
    }
  };

  componentWillMount() {
    SecurityService.getRoleDefinitions().onValue((roles: RoleDefinition[]) =>
      this.setState({
        isLoading: false,
        backendRoles: maybe.Just<RoleDefinition[]>(roles),
      })
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    this.setState({
      isLoading: false,
      roleString: maybe.Just(nextProps.initialRoles.map((r) => r).getOrElse('')),
    });
  }
}

var RoleMultiSelector = React.createFactory(RoleMultiSelectorComponent);

export default RoleMultiSelector;
