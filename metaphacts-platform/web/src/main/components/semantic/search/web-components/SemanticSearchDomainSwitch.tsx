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

import * as React from 'react';
import ReactSelect from 'react-select';
import * as maybe from 'data.maybe';
import { Map } from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { SemanticSearchContext, InitialQueryContext } from './SemanticSearchApi';

export interface SemanticSearchDomainSwitchProps {
  /**
   * Specifies the available search domains, ties them with the projection variables
   */
  availableDomains?: { [iri: string]: string }
}

export class SemanticSearchDomainSwitch extends React.Component<SemanticSearchDomainSwitchProps> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <SemanticSearchDomainSwitchInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticSearchDomainSwitchProps {
  context: InitialQueryContext;
}

class SemanticSearchDomainSwitchInner extends React.Component<InnerProps, {}> {
  componentDidMount() {
    this.setAvailableDomains();
  }

  private setAvailableDomains() {
    maybe.fromNullable(this.props.availableDomains).map(
      domains => Map(domains).mapKeys(Rdf.iri)
    ).map(
      this.props.context.setAvailableDomains
    );
  }

  private onChangeDomain = (option: { value: string; label: string }) => {
    const {searchProfileStore, setDomain} = this.props.context;
    const profileStore = searchProfileStore.get();
    const category = profileStore.categories.get(Rdf.iri(option.value));
    setDomain(category);
  }

  render() {
    const {availableDomains, domain, searchProfileStore} = this.props.context;
    if (availableDomains.isNothing || domain.isNothing) { return null; }

    const value = domain.get().iri.value;
    const profileStore = searchProfileStore.get();

    const options = [];
    availableDomains.get().forEach((projection, iri) => {
      const category = profileStore.categories.get(iri);
      if (category) {
        options.push({value: category.iri.value, label: category.label});
      }
    });

    return <ReactSelect value={value} options={options} clearable={false}
      onChange={this.onChangeDomain} />;
  }
}

export default SemanticSearchDomainSwitch;
