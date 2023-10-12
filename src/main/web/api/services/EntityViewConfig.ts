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

import * as FieldService from 'platform/api/services/ldp-field';
import { FieldDefinitionProp } from 'platform/components/forms/FieldDefinition';


export interface EntityViewConfig {
  label: string;
  rdfType?: Rdf.Iri;
  p2HasType?: Rdf.Iri;
  restrictionPattern?: string;
  navigationEntries?: Array<EntityNavigationEntry>;
  facetKps: Array<Rdf.Iri>;
  viewes: Array<EntityView>;
}

export interface EntityView {
  label: string;
  order: number;
  templateIri: string;
}

export interface EntityNavigationEntry {
  iri: Rdf.Iri;
  relatedEntityConfig: Rdf.Iri;
  relatedKps: Array<FieldDefinitionProp>;
}

export let entityConfigs: { [key: string]: EntityViewConfig };
export function initEntityConfig() {
  const query =
    SparqlUtil.parseQuery<SparqlJs.ConstructQuery>(
      `
CONSTRUCT {
  ?config a <http://www.researchspace.org/resource/system/resource_configuration> .
  ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_ontology_type> ?rdfType .
  ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_label> ?label .
  ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_system_type> ?P2_has_type .
  ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_restriction_sparql_pattern> ?restrictionPattern .

  ?config <http://www.researchspace.org/resource/system/resource_configuration/has_facet_kp> ?facetKp .

  ?config <http://www.researchspace.org/resource/system/resource_configuration/has_view> ?view .
  ?view <http://www.researchspace.org/resource/system/resource_configuration/view_has_label> ?viewLabel .
  ?view <http://www.researchspace.org/resource/system/resource_configuration/view_has_order> ?viewOrder.
  ?view <http://www.researchspace.org/resource/system/resource_configuration/view_has_template> ?viewTemplate .

  ?config <http://www.researchspace.org/resource/system/resource_configuration/has_navigation_menu> ?navigation .
  ?navigation <http://www.researchspace.org/resource/system/resource_configuration/menu_item> ?navigationEntry .
  ?navigationEntry <http://www.researchspace.org/resource/system/resource_configuration/menu_item_config> ?navigationEntryEntityConfig .
  ?navigationEntry <http://www.researchspace.org/resource/system/resource_configuration/is_related_by_kp> ?navigationEntryRelatedKp  .
  
} WHERE {
  ?config a <http://www.researchspace.org/resource/system/resource_configuration> ;
    <http://www.researchspace.org/resource/system/resource_configuration/resource_label> ?label .

  OPTIONAL {
    ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_ontology_type> ?rdfType .
  }

  OPTIONAL {
    ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_system_type> ?P2_has_type .
  }

  OPTIONAL {
    ?config <http://www.researchspace.org/resource/system/resource_configuration/resource_restriction_sparql_pattern> ?restrictionPattern .
  }

  OPTIONAL {
    ?config <http://www.researchspace.org/resource/system/resource_configuration/has_facet_kp> ?facetKp .
  }
  
  OPTIONAL {
    ?config <http://www.researchspace.org/resource/system/resource_configuration/has_navigation_menu> ?navigation .
    ?navigationEntry <http://www.researchspace.org/resource/system/resource_configuration/menu_item> ?navigation .
    ?navigationEntry <http://www.researchspace.org/resource/system/resource_configuration/menu_item_config> ?navigationEntryEntityConfig .

    OPTIONAL {
     ?navigationEntry <http://www.researchspace.org/resource/system/resource_configuration/is_related_by_kp> ?navigationEntryRelatedKp  .
    }
  }

  OPTIONAL {
    ?config <http://www.researchspace.org/resource/system/resource_configuration/has_view> ?view .
    ?view <http://www.researchspace.org/resource/system/resource_configuration/view_has_label> ?viewLabel .
    ?view <http://www.researchspace.org/resource/system/resource_configuration/view_has_order> ?viewOrder.
    ?view <http://www.researchspace.org/resource/system/resource_configuration/view_has_template> ?viewTemplate .
  }
}
      `
    );

  const FormConfigType = Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration');
  return SparqlClient.construct(query).onValue(
    res => {
      const relatedByKp = Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/is_related_by_kp');
      const allRelatedKps = _.uniqBy(res.filter(t => t.p.equals(relatedByKp)).map(t => t.o as Rdf.Iri), node => node.value);
      FieldService.getGeneratedFieldDefinitions(allRelatedKps).onValue(
        allKps => {
          const kps = _.fromPairs(allKps.map(kp => [kp.iri, kp]));

          const configGraph = Rdf.graph(res);
          const allConfigIris = res.filter(t => t.o.equals(FormConfigType)).map(t => t.s);
          const allConfigs = allConfigIris.map(configIri => {
            const pg = Rdf.pg(configIri, configGraph);

            const label =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/resource_label')], pg).map(l => l.value).get();

            const rdfType =
              Rdf.getValueFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/resource_ontology_type')], pg).getOrElse(undefined);

            const p2HasType =
              Rdf.getValueFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/resource_system_type')], pg).getOrElse(undefined);

            const restrictionPattern =
              Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/resource_restriction_sparql_pattern')], pg).map(l => l.value).getOrElse(undefined);

            const facetKps =
              Rdf.getValuesFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/has_facet_kp')], pg);

            const viewIris = Rdf.getValuesFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/has_view')], pg);

            let viewes =
              viewIris.map(
                viewIri => {
                  const viewPg = Rdf.pg(viewIri, configGraph);

                  const label = Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/view_has_label')], viewPg).map(l => l.value).get();
                  const order = Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/view_has_order')], viewPg).map(l => parseInt(l.value)).get();
                  const templateIri = Rdf.getValueFromPropertyPath<Rdf.Literal>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/view_has_template')], viewPg).map(l => l.value).get();

                  return {label, order, templateIri};
                }
              );
            viewes = _.orderBy(viewes, 'order');

            const navigationEntryIris = Rdf.getValuesFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/has_navigation_menu'), Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/menu_item')], pg);

            const navigationEntries =
              navigationEntryIris.map(navigationEntryIri => {
                const navigationEntryPg = Rdf.pg(navigationEntryIri, configGraph);
                const relatedEntityConfig =
                  Rdf.getValueFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/menu_item_config')], navigationEntryPg).get();

                const relatedKps =
                  Rdf.getValuesFromPropertyPath<Rdf.Iri>([Rdf.iri('http://www.researchspace.org/resource/system/resource_configuration/is_related_by_kp')], navigationEntryPg).map(kpIri => kps[kpIri.value]);

                return { iri: navigationEntryIri, relatedEntityConfig, relatedKps };
              });

            return [
              configIri.value,
              {
                label, rdfType, p2HasType, restrictionPattern, navigationEntries, facetKps, viewes
              }
            ];
          });
          entityConfigs = _.fromPairs(allConfigs);

//           console.log(
//           SparqlUtil.parseQuery(
// `
// SELECT * WHERE {
// ?subject rdf:type/rdfs:subClassOf* crm:E7_Activity.
// }
// `          )
//          )

        });
    }
  );
}
