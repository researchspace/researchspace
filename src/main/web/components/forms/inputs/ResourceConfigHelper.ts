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

import * as _ from 'lodash';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';

const SPARQL_QUERY = SparqlUtil.Sparql`
  SELECT DISTINCT ?config ?resourceRestrictionPattern ?resourceP2Type ?resourceOntologyClass WHERE {
    {
      ?__resourceIri__ (<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>) ?resourceOntologyClass.
      ?config <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.researchspace.org/resource/system/resource_configuration>;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?resourceOntologyClass.
      FILTER(NOT EXISTS { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?resourceP2Type. })
      OPTIONAL { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?resourceRestrictionPattern . }
    }
    UNION
    {
      ?__resourceIri__ <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ?resourceOntologyClass;
        <http://www.cidoc-crm.org/cidoc-crm/P2_has_type> ?resourceP2Type.
      ?config <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.researchspace.org/resource/system/resource_configuration>;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?resourceOntologyClass;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?resourceP2Type .
    OPTIONAL { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?resourceRestrictionPattern . }
    } 
  }
`
/**
 * 
 */
export function getResourceConfigurationEditForm(iri:Rdf.Iri, context: any): Promise<SparqlClient.Binding> {
  return new Promise((resolve) => { 
    if(iri) {
      const query = SparqlClient.setBindings(SPARQL_QUERY, { __resourceIri__: iri});
      SparqlClient.select(query, {context: context.semanticContext})
        .onValue((r) => {
              let countConfigWithoutP2Type = 0;
              let countConfigWithP2Type = 0;
              let configBindingsWithType = null;
              let configBindingsWithoutType = null;
              
              let filteredResults = [];
              r.results.bindings.forEach((ee) => {
                  if (ee.config && !ee.resourceP2Type) {configBindingsWithoutType=ee; countConfigWithoutP2Type++; }
                  if (ee.config && ee.resourceP2Type) {countConfigWithP2Type++; configBindingsWithType=ee; }                                  
              });
              
              if (countConfigWithP2Type == 1) {
                filteredResults.push(configBindingsWithType); 
                resolve(findResourceConfigurationEditForm(filteredResults, iri, context));

              }
              if (countConfigWithP2Type == 0 && countConfigWithoutP2Type == 1) {
                    filteredResults.push(configBindingsWithoutType);
                    resolve(findResourceConfigurationEditForm(filteredResults, iri, context));
                }
              //else not editable entity
              resolve(undefined);             
        })
        .onError((err) => {console.error('Error during query execution ',err);
        })
    }
  });
}
 
export function buildResourceFormIriQuery(queryResultBindings: SparqlClient.Bindings, iri: Rdf.Iri): string {
  const UNION_QUERY = []
    _.forEach(queryResultBindings, (b) => {
      UNION_QUERY.push(
        `{ 
          BIND(${iri} AS ?item)
          BIND(<${b.config.value}> AS ?config)
          ${b.resourceRestrictionPattern ? b.resourceRestrictionPattern.value : ''}
          ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_form> ?resourceFormIri .
          OPTIONAL {?item crm:P71i_is_listed_in|skos:inScheme ?scheme}
        } `
      )
    })
    return `SELECT ?resourceFormIri ?scheme WHERE { ${UNION_QUERY.join('UNION')} } LIMIT 1 `
}

export function findResourceConfigurationEditForm(queryResultBindings: SparqlClient.Bindings, iri: Rdf.Iri, context: any): Promise<SparqlClient.Binding> {
  return new Promise((resolve) => {
    const RESOURCE_FORM_IRI_QUERY = buildResourceFormIriQuery(queryResultBindings, iri);
    SparqlClient.select(RESOURCE_FORM_IRI_QUERY, {context: context.semanticContext})
    .onValue((fr) => {
        resolve(fr.results.bindings[0]);    
    })
    .onError((err) => console.error('Error during resource form query execution ',err))
  });
}