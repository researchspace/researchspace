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

import { SparqlDataProviderSettings } from 'ontodia';

export const WikidataSettings: SparqlDataProviderSettings = {
  linkConfigurations: [],
  propertyConfigurations: [],

  defaultPrefix: `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
\n`,

  schemaLabelProperty: 'rdfs:label',
  dataLabelProperty: 'rdfs:label',

  fullTextSearch: {
    prefix: 'PREFIX bds: <http://www.bigdata.com/rdf/search#>\n',
    queryPattern: `?inst rdfs:label ?searchLabel.
SERVICE bds:search {
  ?searchLabel bds:search "\${text}*" ;
    bds:minRelevance '0.5' ;
    bds:matchAllTerms 'true' .
}
BIND(IF(STRLEN(?strInst) > 33,
  0-<http://www.w3.org/2001/XMLSchema#integer>(SUBSTR(?strInst, 33)),
  -10000
) as ?score)
`,
  },

  classTreeQuery: `SELECT distinct ?class ?parent WHERE {
  { ?class wdt:P279 wd:Q35120. }
    UNION
  { ?parent wdt:P279 wd:Q35120.
    ?class wdt:P279 ?parent. }
    UNION
  { ?parent wdt:P279/wdt:P279 wd:Q35120.
    ?class wdt:P279 ?parent. }
}`,

  linksInfoQuery: `SELECT ?source ?type ?target WHERE {
  \${linkConfigurations}
  VALUES (?source) {\${ids}}
  VALUES (?target) {\${ids}}
}`,

  elementInfoQuery: `PREFIX ontodia: <https://ontodia.org/context/v1.json/>
CONSTRUCT {
  ?inst ontodia:type ?class .
  ?inst ?propType ?propValue.
} WHERE {
  VALUES (?inst) {\${ids}}
  OPTIONAL {
    ?inst wdt:P31 ?class
  }
  OPTIONAL {
    \${propertyConfigurations}
    FILTER (isLiteral(?propValue))
  }
}`,

  imageQueryPattern: `{ ?inst ?linkType ?fullImage } UNION { ?inst wdt:P163/wdt:P18 ?fullImage }
BIND(CONCAT("https://commons.wikimedia.org/w/thumb.php?f=",
  STRAFTER(STR(?fullImage), "Special:FilePath/"), "&w=200") AS ?image)
`,

  linkTypesOfQuery: `SELECT DISTINCT ?link WHERE {
  \${linkConfigurations}
  ?claim <http://wikiba.se/ontology#directClaim> ?link .
}`,

  linkTypesStatisticsQuery: `SELECT (\${linkId} as ?link) (COUNT(?outObject) AS ?outCount) (COUNT(?inObject) AS ?inCount)
WHERE {
  {
    {
      SELECT DISTINCT ?outObject WHERE {
        \${linkConfigurationOut}
        FILTER(ISIRI(?outObject))
        ?outObject ?someprop ?someobj.
      }
      LIMIT 101
    }
  } UNION {
    {
      SELECT DISTINCT ?inObject WHERE {
        \${linkConfigurationIn}
        FILTER(ISIRI(?inObject))
        ?inObject ?someprop ?someobj.
      }
      LIMIT 101
    }
  }
}`,

  filterRefElementLinkPattern: '?claim <http://wikiba.se/ontology#directClaim> ?link .',
  filterTypePattern: `?inst wdt:P31 ?instType. ?instType wdt:P279* ?class`,
  filterAdditionalRestriction: `FILTER ISIRI(?inst)
BIND(STR(?inst) as ?strInst)
FILTER EXISTS { ?inst ?someprop ?someobj }
`,

  filterElementInfoPattern: `OPTIONAL { ?inst wdt:P31 ?foundClass }
BIND (COALESCE(?foundClass, owl:Thing) as ?class)
OPTIONAL { ?inst rdfs:label ?label }
`,
};

export const OwlNoStatsSettings: SparqlDataProviderSettings = {
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

  linksInfoQuery: `SELECT ?source ?type ?target WHERE {
  \${linkConfigurations}
  VALUES (?source) {\${ids}}
  VALUES (?target) {\${ids}}
}`,

  elementInfoQuery: `PREFIX ontodia: <https://ontodia.org/context/v1.json/>

CONSTRUCT {
  ?inst ontodia:type ?class .
  ?inst ontodia:label ?label .
  ?inst ?propType ?propValue.
} WHERE {
  VALUES (?inst) {\${ids}}
  OPTIONAL { ?inst a ?class }
  OPTIONAL { ?inst \${dataLabelProperty} ?label }
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

export const OwlStatsSettings: SparqlDataProviderSettings = {
  ...OwlNoStatsSettings,

  classTreeQuery: `SELECT ?class ?instcount ?label ?parent WHERE {
  {
    SELECT ?class (count(?inst) as ?instcount)
    WHERE {
      ?inst rdf:type ?class.
      FILTER ISIRI(?class)
    }
    GROUP BY ?class
  }
  UNION
  { ?class rdf:type rdfs:Class }
  UNION
  { ?class rdf:type owl:Class }
  OPTIONAL { ?class rdfs:label ?label }
  OPTIONAL { ?class rdfs:subClassOf ?parent. FILTER ISIRI(?parent) }
}`,
};
