/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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

import * as Reactodia from '@reactodia/workspace';

import { CommonSparqlSettings } from './DataProviderProfiles';

export const RSOwlNoStatsSettings: Reactodia.SparqlDataProviderSettings = {
  ...CommonSparqlSettings,
  linkConfigurations: [],
  propertyConfigurations: [],

  defaultPrefix: `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
\n`,

  schemaLabelProperty: 'rdfs:label',
  dataLabelProperty: 'rdfs:label',

  fullTextSearch: {
    prefix: '',
    queryPattern: `OPTIONAL { ?inst \${dataLabelProperty} ?search1 }
FILTER REGEX(COALESCE(STR(?search1), STR(?extractedLabel)), "\${text}", "i")
BIND(0 as ?score)
`,
    extractLabel: true,
  },

  classTreeQuery: `SELECT ?class ?parent WHERE {
  { ?class a rdfs:Class }
  UNION
  { ?class a owl:Class }
  FILTER ISIRI(?class)
  OPTIONAL { ?class rdfs:subClassOf ?parent. FILTER ISIRI(?parent) }
}`,

  // Use ${sourceIris}/${targetIris} (not ${ids}) so reactodia takes its
  // chunked + incremental link path: when new elements are added it only queries
  // links between the added elements and the rest of the canvas, instead of the
  // whole canvas × canvas. Prevents a stall when adding a highly-connected node.
  linksInfoQuery: `SELECT ?source ?type ?target WHERE {
  \${linkConfigurations}
  VALUES (?source) {\${sourceIris}}
  VALUES (?target) {\${targetIris}}
}`,

  // No label is fetched here: labels are resolved (in batches) by the platform
  // label service via the reactodia `prepareLabels` hook, so fetching one over
  // SPARQL only to overwrite it would be redundant.
  elementInfoQuery: `PREFIX ontodia: <urn:reactodia:sparql:>

CONSTRUCT {
  ?inst ontodia:type ?class .
  ?inst ?propType ?propValue.
} WHERE {
  VALUES (?inst) {\${ids}}
  OPTIONAL { ?inst a ?class }
  OPTIONAL {
    \${propertyConfigurations}
    FILTER (isLiteral(?propValue))
  }
}
`,

  imageQueryPattern: `{ ?inst ?linkType ?image }
UNION
{ [] ?linkType ?inst. BIND(?inst as ?image) }
`,

  linkTypesOfQuery: `SELECT DISTINCT ?link WHERE {
  \${linkConfigurations}
}
`,

  linkTypesStatisticsQuery: `SELECT ?link ?outCount ?inCount WHERE {
    <http://www.bigdata.com/queryHints#Query> <http://www.bigdata.com/queryHints#optimizer> "None" .
             
  {
    SELECT (\${linkId} as ?link) (count(?outObject) as ?outCount) WHERE {
      \${linkConfigurationOut} .
      \${navigateElementFilterOut}
    } LIMIT 101
  }
  {
    SELECT (\${linkId} as ?link) (count(?inObject) as ?inCount) WHERE {
      \${linkConfigurationIn} .
      \${navigateElementFilterIn}
    } LIMIT 101
  }
}`,

  filterRefElementLinkPattern: '',
  filterTypePattern: `?inst a ?instType. ?instType rdfs:subClassOf* ?class`,
  filterElementInfoPattern: `OPTIONAL { ?inst rdf:type ?foundClass }
BIND (COALESCE(?foundClass, owl:Thing) as ?class)
OPTIONAL { ?inst \${dataLabelProperty} ?label }
`,

  filterAdditionalRestriction: '',
};
