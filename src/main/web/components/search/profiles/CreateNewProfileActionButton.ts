/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import { Component } from 'react';
import * as D from 'react-dom-factories';
import * as maybe from 'data.maybe';

import { navigateToResource } from 'platform/api/navigation';

import SearchProfileLdpService from 'platform/components/semantic/search/data/profiles/SearchProfileLdpService';
import CreateProfileDialog from './CreateProfileDialog';

require('../../../less/create-new-profile-action.less');

interface State {
  showDialog?: boolean;
  errorMessage?: Data.Maybe<string>;
}

export class CreateNewProfileActionButton extends Component<{}, State> {
  constructor(props) {
    super(props);
    this.state = {
      showDialog: false,
      errorMessage: maybe.Nothing<string>(),
    };
  }

  render() {
    return D.div(
      {
        className: 'create-new-profile',
      },
      this.button(),
      this.dialog()
    );
  }

  private button() {
    return D.button(
      {
        className: 'create-new-profile__button',
        onClick: this.showDialog.bind(this),
      },
      'Create New Profile'
    );
  }

  private dialog() {
    return CreateProfileDialog({
      show: this.state.showDialog,
      onHide: this.hideDialog.bind(this),
      onSave: this.onSave.bind(this),
      error: this.state.errorMessage,
    });
  }

  private onSave({ name, description }) {
    SearchProfileLdpService.createProfile(name, description)
      .onValue((newResourceIri) => {
        this.hideDialog.bind(this);
        navigateToResource(newResourceIri).onValue(() => {});
      })
      .onError((error) =>
        this.setState({
          errorMessage: maybe.Just(error),
        })
      );
  }

  private showDialog() {
    this.setState({
      showDialog: true,
    });
  }

  private hideDialog() {
    this.setState({
      showDialog: false,
    });
  }
}

export default CreateNewProfileActionButton;
