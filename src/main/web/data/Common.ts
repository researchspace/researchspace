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

import { OrderedMap, Record, List } from 'immutable';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

export interface Resource {
  readonly iri: Rdf.Iri;
  readonly label: string;
  readonly description: string;
  readonly tuple: SparqlClient.Binding;
}
export type Resources = OrderedMap<Rdf.Iri, Resource>;

import { recordSerializer } from 'platform/api/json';

export interface EntityI {
  iri: Rdf.Iri;
  label: Rdf.Literal;
  tuple: SparqlClient.Binding;
}

export type Entity = Record.IRecord<EntityI>;
export type Entities = List<Entity>;
export const Entity = Record<EntityI>({
  iri: null,
  label: null,
  tuple: null,
});
recordSerializer('Entity', Entity);

export function bindingsToEntities(
  bindings: SparqlClient.Bindings,
  iriBindingName: string,
  labelBindingName: string
): List<Entity> {
  var entities = _.map(bindings, (binding) => bindingToEntity(binding, iriBindingName, labelBindingName));
  return List(entities);
}

export function bindingToEntity(
  binding: SparqlClient.Binding,
  iriBindingName: string,
  labelBindingName: string
): Entity {
  var iri = binding[iriBindingName];
  return Entity({
    tuple: binding,
    iri: <Rdf.Iri>iri,
    label: <Rdf.Literal>binding[labelBindingName],
  });
}
