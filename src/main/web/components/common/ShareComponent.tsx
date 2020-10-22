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

import * as React from 'react';
import { Component, MouseEvent } from 'react';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';
import { getCurrentResource } from 'platform/api/navigation';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { addNotification } from 'platform/components/ui/notification';
import { AutoCompletionInput } from 'platform/components/ui/inputs';

import './share-component.scss';

const visibility = {
  public: vocabularies.VocabPlatform.publicVisibility.value,
  private: vocabularies.VocabPlatform.privateVisibility.value,
  shared: vocabularies.VocabPlatform.sharedVisibility.value,
  group: vocabularies.VocabPlatform.groupVisibility.value,
};

interface Props {
  iri?: string; // optional, if visibility should be set for a different resource (default:this)
}

interface State {
  visibility?: string;
  groups?: SparqlClient.Bindings;
  errorMessage?: Data.Maybe<string>;
}

const DEFAULT_GROUPS_QUERY = `
  SELECT ?value ?label {
    ?value a Platform:Group .
    ?value rdfs:label ?label .
  }
`;

export class ShareComponent extends Component<Props, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      visibility: visibility.private,
      errorMessage: maybe.Nothing<string>(),
      groups: [],
    };
  }

  componentDidMount() {
    const iriString = this.props.iri || getCurrentResource().value;
    const query = SparqlClient.select(
      `SELECT ?visibility WHERE {
         OPTIONAL { <${iriString}> <${vocabularies.VocabPlatform.visibility.value}> ?vis }
         BIND(COALESCE(?vis, <${vocabularies.VocabPlatform.privateVisibility.value}>) as ?visibility).
      }`
    );

    query
      .onValue((res) => {
        const vis = res.results.bindings[0].visibility.value;
        this.setState({ visibility: vis });

        if (vis === visibility.group) {
          this.selectGroups(iriString);
        }
      })
      .onError((error) => this.setState({ visibility: visibility.private, errorMessage: maybe.Just(error) }));
  }

  render() {
    return (
      <div className="share-component">
        <fieldset id="visibility-input">
          {_.keys(visibility).map((v) => (
            <div className="radio">
              <label className="control-label" key={'visibility' + v}>
                <input
                  type="radio"
                  name="visibility"
                  value={visibility[v]}
                  onClick={this.onClick}
                  checked={this.isSelected(visibility[v])}
                />
                {_.upperFirst(v)}
              </label>
              {visibility[v] === visibility.group && this.isSelected(visibility.group)
                ? this.renderGroupSelector()
                : null}
            </div>
          ))}
        </fieldset>
      </div>
    );
  }

  renderGroupSelector = () => (
    <AutoCompletionInput
      className="visibility-group-selector"
      placeholder="select groups"
      value={this.state.groups}
      query={DEFAULT_GROUPS_QUERY}
      defaultQuery={DEFAULT_GROUPS_QUERY}
      actions={{ onSelected: this.onGroupsSelected }}
      multi={true}
    />
  );

  isSelected = (s: string) => this.state.visibility === s;

  private onClick = (evt: MouseEvent<HTMLInputElement>) => {
    const value = evt.target['value'];
    const stream = LdpService.setVisibility(getCurrentResource(), Rdf.iri(value), []);
    stream.onValue((r) => {
      this.setState({ visibility: value, groups: [] });
      this.notifyVisibilityChange();
    });
    stream.onError((error: any) => {
      this.setState({ errorMessage: maybe.Just('error'), visibility: visibility.private });
    });
  };

  private selectGroups = (iriString: string) =>
    SparqlClient.select(
      `
      SELECT ?value ?label WHERE {
         <${iriString}> <${vocabularies.VocabPlatform.visibleToGroups.value}> ?value .
         ?value rdfs:label ?label .
      }
    `
    ).onValue((res) => this.setState({ groups: res.results.bindings }));

  private onGroupsSelected = (bindings: SparqlClient.Bindings) => {
    const groups = _.map(bindings, (binding) => binding.value as Rdf.Iri);
    const stream = LdpService.setVisibility(getCurrentResource(), Rdf.iri(this.state.visibility), groups);
    stream.onValue((r) => {
      this.setState({ groups: bindings });
      this.notifyVisibilityChange();
    });
  };

  private notifyVisibilityChange = () =>
    addNotification({
      message: 'Visibility of item has been changed',
      level: 'success',
      autoDismiss: 2,
    });
}
export default ShareComponent;
