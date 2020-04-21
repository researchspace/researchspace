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
import { Component } from 'platform/api/components';
import { Cancellation } from 'platform/api/async';

export interface FormSwitchCaseProps {
  label?: string;
  children?: React.ReactNode;
  for?: string;
}

export class FormSwitchCase extends Component<FormSwitchCaseProps, {}> {
  private readonly cancellation = new Cancellation();
  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    return React.Children.only(this.props.children);
  }
}

export default FormSwitchCase;
