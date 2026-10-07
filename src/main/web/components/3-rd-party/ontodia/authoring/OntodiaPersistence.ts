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

import * as Kefir from 'kefir';
import * as Reactodia from '@reactodia/workspace';

import { EntityMetadata } from './FieldConfigurationCommon';

export interface OntodiaPersistence {
  readonly supportsIriEditing: boolean;
  persist(params: OntodiaPersistenceParams): Kefir.Property<OntodiaPersistenceResult>;
}

export interface OntodiaPersistenceParams {
  readonly entityMetadata: ReadonlyMap<Reactodia.ElementTypeIri, EntityMetadata>;
  readonly state: Reactodia.AuthoringState;
  fetchModel(iri: Reactodia.ElementIri): Kefir.Property<Reactodia.ElementModel>;
}

export interface OntodiaPersistenceResult {
  /**
   * Result entities data after persistence operation completed.
   * `null` value for an entity indicates that it was deleted.
   */
  finalizedEntities: Map<Reactodia.ElementIri, Reactodia.ElementModel | null>;
}
