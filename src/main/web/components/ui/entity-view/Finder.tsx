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

const FINDER_NAVIGATION_ENTRY_IRI = 'http://www.researchspace.org/pattern/system/resource_configuration/data/FINDER';


export class Finder extends Component<any, any> {

  constructor(props, context) {
    super(props, context);

    this.state = {};
  }

  componentDidMount() {
    const finderConfig = entityConfigs[FINDER_NAVIGATION_ENTRY_IRI];


    // create query for menu navigation tree
    // ?node ?parent
    const entryPatterns = finderConfig.navigationEntries.map(
      navigationEntry => {
        let basePatterns;

        const relatedEntityConfig = entityConfigs[navigationEntry.relatedEntityConfig.value];

        if (relatedEntityConfig.p2HasType) {
          basePatterns = [{
            type: 'bgp',
            triples: [{
              subject: '?value',
              predicate: 'http://www.cidoc-crm.org/cidoc-crm/P2_has_type',
              object: relatedEntityConfig.p2HasType.value,
            }]
          }]
        } else {
          basePatterns = [{
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
        }

        if (relatedEntityConfig.restrictionPattern) {
          basePatterns = basePatterns.concat(
            SparqlUtil.parsePatterns(relatedEntityConfig.restrictionPattern)
          );
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
                    predicate: 'http://www.researchspace.org/pattern/system/resource_configuration/menu_broader_item',
                    object: '?parent'
                  }]
                }
              ]
            },
            basePatterns
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
      navigationQuery: SparqlUtil.serializeQuery(query as any),
      entityViewConfigIri: FINDER_NAVIGATION_ENTRY_IRI,
    });
  }

  render() {
    if (this.state.navigationQuery) {
      const { navigationQuery, entityViewConfigIri } = this.state;
      return <TemplateItem template={{source: this.getTemplateString(), options: { navigationQuery, entityViewConfigIri }}} />;
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

export default Finder;
