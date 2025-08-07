import { SparqlDataProviderSettings } from 'ontodia';

export const RSOwlNoStatsSettings: SparqlDataProviderSettings = {
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
