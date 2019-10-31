/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import { Component, createFactory } from 'react';
import ReactSelectComponent, { Options as ReactSelectOptions } from 'react-select';
import { OrderedSet } from 'immutable';
import * as _ from 'lodash';

import { Entity } from 'platform/components/semantic/search/data/Common';

type Profiles = OrderedSet<Entity>;

const ReactSelect = createFactory(ReactSelectComponent);

interface Props {
  disabled: boolean,
  profiles: Profiles,
  selectedProfiles: Profiles,
  onChange: (profiles: Profiles) => void
}

interface State {
  options: ReactSelectOptions<string>
  selectedValues: string[]
}

export class ProfileSelectionComponent extends Component<Props, State> {

  constructor(props) {
    super(props);
    this.state = {
      options: [],
      selectedValues: [],
    };
  }

  componentWillMount() {
    this.prepareSelectData(this.props);
  }

  componentWillReceiveProps(props: Props) {
    this.prepareSelectData(props);
  }

  render() {
    return ReactSelect({
      className: 'result-selector__multi-select',
      multi: true,
      options: this.state.options,
      value: this.state.selectedValues,
      onChange: this.onChange.bind(this),
      disabled: this.props.disabled,
      placeholder: 'Select relationship profile to use. Default: all FCs and FRs',
    });
  }

  private onChange(strVal: string, options: ReactSelectOptions<string>) {
    const values = _.map(options, v => v.value);
    const selectedProfiles =
        <Profiles>this.props.profiles.filter(
          p => _.includes(values, p.iri.value)
        );
    this.props.onChange(selectedProfiles);
  }

  private prepareSelectData(props: Props) {
    const options =
        props.profiles.map(
          e => {
            return {
              value: e.iri.value,
              label: e.label,
            };
          }
        ).toJS();
    const selectedValues =
        props.selectedProfiles.map(
          e => e.iri.value
        ).toJS();

    this.setState({
      options: options,
      selectedValues: selectedValues,
    });
  }
}

export const ProfileSelection = createFactory(ProfileSelectionComponent);
export default ProfileSelection;
