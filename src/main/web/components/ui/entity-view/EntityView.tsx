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
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { entityConfigs, EntityViewConfig } from 'platform/api/services/EntityViewConfig';

import { Component, ComponentContext, ComponentProps } from 'platform/api/components';
import { TemplateItem } from '../template';


interface Props extends ComponentProps {
  entityIri: string
}

interface State {
  entityViewConfig?: EntityViewConfig
  navigationQuery?: string
  entityViewConfigIri?: string
}


export class EntityView extends Component<Props, State> {
  constructor(props, context) {
    super(props, context);

    this.state = {};
  }

  componentDidMount() {
    const entity = Rdf.iri(this.props.entityIri);
    // first we try to get all configs that match current entity direct types
    const allConfigsQuery = 
      SparqlUtil.parseQuery(
        `
SELECT DISTINCT ?config WHERE {
  ?entity a ?rdfType .
  ?config a <http://www.researchspace.org/resource/system/FormConfig> ;
    <http://www.researchspace.org/resource/system/authority_manager/for_type> ?rdfType .
}
        `
      );

    SparqlClient.select(
      SparqlClient.setBindings(allConfigsQuery, {'entity': entity})
    ).onValue(
      res => {
        if (SparqlUtil.isSelectResultEmpty(res)) {
          // if there are no direct entity configs for exact type then we should try to find config for most specific type
        } else {
          // TODO for first POC we assume that we always have only one hit:
          const configIri = res.results.bindings[0]['config'].value;
          const entityConfig = entityConfigs[configIri];

          // create query for menu navigation tree
          // ?node ?parent
          const entryPatterns = entityConfig.navigationEntries.map(
            navigationEntry => {
              let kpPattern;
          
              const basePatterns = [{
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
              }] as any;


              if (navigationEntry.relatedKps.length == 1) {

                const patterns =
                  SparqlClient.setBindings(
                    SparqlUtil.parseQuery<SparqlJs.SelectQuery>(
                      navigationEntry.relatedKps[0].selectPattern
                    ),
                    {'subject': Rdf.iri(this.props.entityIri)}
                  ).where;
                kpPattern = {
                  'type': 'optional',
                  patterns: basePatterns.concat(patterns)
                }
              } else {
                const unionPatterns =
                  navigationEntry.relatedKps.map(kp => {
                    const patterns =
                      SparqlClient.setBindings(
                        SparqlUtil.parseQuery<SparqlJs.SelectQuery>(
                          kp.selectPattern
                        ),
                        {'subject': Rdf.iri(this.props.entityIri)}
                      ).where;

                    return {
                      'type': 'group',
                      patterns: basePatterns.concat(patterns)
                    };
                  });

                kpPattern = {
                  type: 'optional',
                  patterns: [
                    {
                      'type': 'union',
                      patterns: unionPatterns,
                    }
                ]};
              }

              return {
                'type': 'group',
                patterns: [
                  {
                    'type': 'values',
                    values: [{
                      "?node": navigationEntry.iri.value,
                      "?nodeLabel": '"' + entityConfigs[navigationEntry.relatedEntityConfig.value].label + '"'
                    }]
                  },
                  {
                    'type': 'optional',
                    patterns: [
                      {
                        'type': 'bgp',
                        triples: [{
                          subject: '?node',
                          predicate: 'http://www.researchspace.org/resource/system/entity_manager/broader_navigation_menu',
                          object: '?parent'
                        }]
                      }
                    ]
                  },
                  kpPattern
                ]
              }
            }
          );

          const query = {
            type: 'query',
            queryType: 'SELECT',
            variables: [
              '?node', '?nodeLabel',
              {
                variable: '?parent',
                expression: {
                  aggregation: 'sample',
                  distinct: false,
                  expression: '?parent',
                  type: 'aggregate'
                }
              }, {
                variable: '?count',
                expression: {
                  aggregation: 'count',
                  distinct: true,
                  expression: '?value',
                  type: 'aggregate'
                }
              }
            ],
            where: [{type: 'union', patterns: entryPatterns}],
            group: [
              {expression: '?node'},
              {expression: '?nodeLabel'}
            ]
          };


          this.setState({
            entityViewConfigIri: configIri,
            navigationQuery: SparqlUtil.serializeQuery(query as any),
          });
        }
      }
    );

    // fetch config
  }

  render() {
    if (this.state.navigationQuery) {
      const { navigationQuery, entityViewConfigIri } = this.state;
      const { entityIri } = this.props;
      return <TemplateItem template={{source: this.getTemplateString(), options: { entityIri, navigationQuery, entityViewConfigIri }}} />;
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

export default EntityView;
