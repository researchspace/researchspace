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
import { find, map } from 'lodash';
import { NavDropdown, MenuItem } from 'react-bootstrap';

import { Component } from 'platform/api/components';
import { refresh } from 'platform/api/navigation';
import { ConfigHolder, UIConfig } from 'platform/api/services/config-holder';
import { getPreferredUserLanguage, setPreferredUserLanguage } from 'platform/api/services/language';

interface UserLanguagePropsProps {
  /**
   * Language tags that the user is able to choose from
   */
  languages?: ReadonlyArray<string>;
}

interface State {
  readonly language?: string;
}

/**
 * Dropdown with language tags where the user can choose from.
 * Selecting a language will set the user's preferred language
 * in the browsers local store.
 *
 * @example
 * <!-- Use languages from platform-wide UI configuration -->
 * <mp-user-language-switch></mp-user-language-switch>
 *
 * <mp-user-language-switch languages='["de","en","en-gb"]'></mp-user-language-switch>
 *
 * @author Johannes Trame <jt@metaphacts.com>
 */
export class UserLanguageSwitch extends Component<UserLanguagePropsProps, State> {
  constructor(props: UserLanguagePropsProps, context: any) {
    super(props, context);
    this.state = { language: getPreferredUserLanguage() };
  }

  private getLanguages(config: UIConfig) {
    if (this.props.languages) {
      return this.props.languages;
    }
    return config.preferredLanguages;
  }

  render() {
    const uiConfig = ConfigHolder.getUIConfig();

    const options = this.getLanguages(uiConfig).map((lang) => {
      return { key: lang, label: lang };
    });

    const language = this.state.language;

    let selectedOption = find(options, (option) => option.key === language);
    if (!selectedOption) {
      selectedOption = { key: language, label: language };
      options.unshift(selectedOption);
    }

    if (options.length <= 1) {
      return null;
    }

    return (
      <NavDropdown
        id="language-selection"
        title={selectedOption.label}
        onSelect={(e) => this.onLanguageChanged(e as string)}
      >
        {map(options, (option) => (
          <MenuItem key={option.key} eventKey={option.key}>
            {option.label}
          </MenuItem>
        ))}
      </NavDropdown>
    );
  }

  private onLanguageChanged(language: string): void {
    setPreferredUserLanguage(language);
    this.setState({ language: language });
    window.location.reload();
  }
}

export default UserLanguageSwitch;
