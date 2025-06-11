/**
 * ResearchSpace
 * Copyright (C) 2022, © Kartography Community Interest Company
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

import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';

import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

export interface ResourceConfig {
  label: string;
  rdfType?: string;
  p2HasType?: string;
  restrictionPattern?: string;
  resourceFormIRI?: string;
  resourceMembershipProperty?: string;
  resourceBroaderProperty?: string;
  resourceOrderPattern?: string;
  resourceLabelPattern?: string;
  resourceIcon?: string;
  resourceSearchKPCategory?: string;
  isSystemConfig?: string;
  hasResourceType?: string;
  listInAuthorityDocument?: string;
  displayInFinder?: string;
  navigationMenuItem?: string;
}

export let resourceConfigs: { [key: string]: ResourceConfig };

export function initResourceConfig() {
  const query =
    SparqlUtil.parseQuery<SparqlJs.ConstructQuery>(
      `
CONSTRUCT {
  ?resourceConfiguration a <http://www.researchspace.org/resource/system/resource_configuration> .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?rdfType .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_name> ?label .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?P2_has_type .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?restrictionPattern .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_form> ?resourceFormIRI .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_membership_property> ?resourceMembershipProperty .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_broader_property> ?resourceBroaderProperty .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_order_sparql_pattern> ?resourceOrderPattern .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_label_sparql_pattern> ?resourceLabelPattern .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_card_icon> ?resourceIcon .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_search_facet_kpCategory> ?resourceSearchKPCategory .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/is_system_config>  ?systemConfig .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/has_resource_type> ?resourceType.
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_list_in_authority> ?listInAuthorityDocument .
  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_in_finder> ?displayInFinder.
  ?resourceConfiguration <http://www.cidoc-crm.org/cidoc-crm/P67i_is_referred_to_by> ?navigationMenuItem  .
  
} WHERE {
  ?resourceConfiguration a <http://www.researchspace.org/resource/system/resource_configuration> ;
    <http://www.researchspace.org/pattern/system/resource_configuration/resource_name> ?label .

  ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?rdfType .

  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?P2_has_type .
    BIND(true as ?resourceType)
  }
  
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_form> ?resourceFormIRI .
  }
  
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?restrictionPattern .
  }

  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_membership_property> ?resourceMembershipProperty .
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_broader_property> ?resourceBroaderProperty .
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_order_sparql_pattern> ?resourceOrderPattern .
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_label_sparql_pattern> ?resourceLabelPattern .
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_card_icon> ?resourceIcon .
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_search_facet_kpCategory> ?resourceSearchKPCategory .
  }
  OPTIONAL {
    ?resourceConfiguration crm:P2_has_type <http://www.researchspace.org/pattern/system/resource_configuration/configuration_type/system> .
    BIND(true as ?systemConfig)
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_list_in_authority> ?listInAuthorityDocument .
  }
  OPTIONAL {
    ?resourceConfiguration <http://www.researchspace.org/pattern/system/resource_configuration/resource_in_finder> ?displayInFinder.
  }
  OPTIONAL { 
    ?navigationMenuItem crm:P67_refers_to ?resourceConfiguration ;
        a <http://www.researchspace.org/resource/system/FinderNavigationItem> .
  }
} 
      `
    );

  const FormConfigType = Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration');
  return SparqlClient.construct(query).onValue(
    res => {
     
          const configGraph = Rdf.graph(res);
          const allConfigIris = res.filter(t => t.o.equals(FormConfigType)).map(t => t.s);
          const allConfigs = allConfigIris.map(configIri => {
            const pg = Rdf.pg(configIri, configGraph);

            const label =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_name')], pg).map(l => l.value).get();

            const rdfType =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class')], pg).getOrElse(undefined);

            const p2HasType =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_type')], pg).getOrElse(undefined);

            const restrictionPattern =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern')], pg).map(l => l.value).getOrElse(undefined);

            const resourceFormIRI =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_form')], pg).map(l => l.value).getOrElse(undefined);
            
            const resourceMembershipProperty =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_membership_property')], pg).map(l => l.value).getOrElse(undefined);
            
             const resourceBroaderProperty =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_broader_property')], pg).map(l => l.value).getOrElse(undefined);
             const resourceOrderPattern =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_order_sparql_pattern')], pg).map(l => l.value).getOrElse(undefined);
            const resourceLabelPattern =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_label_sparql_pattern')], pg).map(l => l.value).getOrElse(undefined);
            const resourceIcon =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_card_icon')], pg).map(l => l.value).getOrElse(undefined);
           
            const resourceSearchKPCategory = 
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_search_facet_kpCategory')], pg).map(l => l.value).getOrElse(undefined);
           
            const isSystemConfig = 
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/is_system_config')], pg).map(l => l.value).getOrElse(undefined);
          
            const hasResourceType = 
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/has_resource_type')], pg).map(l => l.value).getOrElse(undefined);
          
            const listInAuthorityDocument = 
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_list_in_authority')], pg).map(l => l.value).getOrElse(undefined);
          
            const displayInFinder = 
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/pattern/system/resource_configuration/resource_in_finder')], pg).map(l => l.value).getOrElse(undefined);
          
            const navigationMenuItem = undefined;
              //Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.cidoc-crm.org/cidoc-crm/P67i_is_referred_to_by')], pg).map(l => l.value).getOrElse(undefined);
          
            return [
              configIri.value,
              {
                label, rdfType, p2HasType, restrictionPattern, resourceFormIRI, 
                resourceMembershipProperty, resourceBroaderProperty, resourceOrderPattern, 
                resourceLabelPattern, resourceIcon, resourceSearchKPCategory, isSystemConfig, 
                listInAuthorityDocument, displayInFinder, hasResourceType, navigationMenuItem
              }
            ];
          });
          resourceConfigs = _.fromPairs(allConfigs);
          console.log("initialising configurations");
          console.dir(resourceConfigs,{"depth":null});
          
        });
 
}

export function getResourceConfiguration(iri: string, key: string) : string {  
  console.log(key);
  console.log(iri);
  console.log(resourceConfigs[iri][key]);
  return resourceConfigs[iri][key];
}
