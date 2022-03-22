/**
 * ResearchSpace
 * Copyright (C) 2022, Kartography Community Interest Company
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
import * as SparqlJs from 'sparqljs';


import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil, VariableRenameBinder } from 'platform/api/sparql';
import { entityConfigs, EntityViewConfig, EntityView } from 'platform/api/services/EntityViewConfig';

import { Component, ComponentContext, ComponentProps } from 'platform/api/components';
import { TemplateItem } from '../template';
import { generateSearchConfigForFields } from 'platform/api/services/ldp-field';

interface Props extends ComponentProps {
  entityIri: string
  entityViewConfigIri: string
  navigationEntryIri: string
}

interface State {
  entityDomain?: string
  searchQuery?: string
  tableQuery?: string
  searchConfig?: string
  viewes?: Array<EntityView>
}

export class EntityViewSearchResults extends Component<Props, State> {
    constructor(props, context) {
        super(props, context);

        this.state = {};
    }

    componentDidMount() {
        const entityConfig = entityConfigs[this.props.entityViewConfigIri];
        // table query

      const navigationEntry = entityConfig.navigationEntries.find(n => n.iri.value == this.props.navigationEntryIri);
      const relatedEntityConfig = entityConfigs[navigationEntry.relatedEntityConfig.value];
      let kpPatterns;
      if (navigationEntry.relatedKps.length == 1) {
            kpPatterns =
                SparqlClient.setBindings(
                    SparqlUtil.parseQuery<SparqlJs.SelectQuery>(
                        navigationEntry.relatedKps[0].selectPattern
                    ),
                    { 'subject': Rdf.iri(this.props.entityIri) }
                ).where;
        } else {
            kpPatterns =
                navigationEntry.relatedKps.map(kp => {
                    const patterns =
                        SparqlClient.setBindings(
                            SparqlUtil.parseQuery<SparqlJs.SelectQuery>(
                                kp.selectPattern
                            ),
                            { 'subject': Rdf.iri(this.props.entityIri) }
                        ).where;

                    return {
                        'type': 'group',
                        patterns
                    };
                });
        }

      const basePatterns = {
        'type': 'group',
        patterns: [{
          type: 'bgp',
          triples: [{
            subject: '?value',
            predicate: {
              type: 'path',
              pathType: '/',
              items: [
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                {
                  type: 'path',
                  pathType: '*',
                  items: ['http://www.w3.org/2000/01/rdf-schema#subClassOf']
                }
              ]
            },
            object: entityConfigs[navigationEntry.relatedEntityConfig.value].rdfType.value
          }]
        }]
      }


      const tableQuery: SparqlJs.SelectQuery = {
        prefixes: {},
            type: 'query',
            queryType: 'SELECT',
            variables: [
                '?subject' as SparqlJs.Term
            ],
            where: [basePatterns, ...kpPatterns],
        };

        new VariableRenameBinder('value', 'subject').query(tableQuery);

      generateSearchConfigForFields(relatedEntityConfig.facetKps).onValue(res => {
        this.setState({
          tableQuery: SparqlUtil.serializeQuery(tableQuery as any),
          searchQuery: SparqlUtil.serializeQuery(tableQuery),
          entityDomain: relatedEntityConfig.rdfType.value,
          viewes: relatedEntityConfig.viewes,
          searchConfig: res,
        });
      })

    }

    render() {
        if (this.state.tableQuery) {
            const { tableQuery, searchQuery, entityDomain, searchConfig, viewes } = this.state;
            return <TemplateItem template={{ source: this.getTemplateString(), options: { tableQuery, searchQuery, entityDomain, searchConfig, viewes } }} />;

        } else {
            return null;
        }
    }

    private getTemplateString = () => {
        const localScope = this.props.markupTemplateScope;
        const partial = localScope ? localScope.getPartial('template') : undefined;
        return partial.source;
    }
}

export default EntityViewSearchResults;
