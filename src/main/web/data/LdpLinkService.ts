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

import { Set } from 'immutable';
import * as Kefir from 'kefir';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';
import { rso, crmdig } from './vocabularies/vocabularies';

/**
 * LDP client for LinkContainer container.
 *
 * For more details @see org.researchspace.ldp.LinkContainer java class
 */
export class LdpLinkServiceClass extends LdpService {
  constructor(container: string) {
    super(container);
  }

  private createResourceGraph(name: string, links: Set<Rdf.Node>): Rdf.Graph {
    const linkIri = Rdf.iri('');

    const linksGraph = links.map((link) => Rdf.triple(linkIri, crmdig.L43_annotates, link));

    const resourceGraph = Rdf.graph([
      Rdf.triple(linkIri, vocabularies.rdf.type, crmdig.D29_Annotation_Object),
      Rdf.triple(linkIri, vocabularies.rdfs.label, Rdf.literal(name)),
      Rdf.triple(linkIri, rso.displayLabel, Rdf.literal(name)),
      ...linksGraph.toArray(),
    ]);

    return resourceGraph;
  }

  public createLink(name: string, links: Set<Rdf.Node>): Kefir.Property<Rdf.Iri> {
    const resource = this.createResourceGraph(name, links);
    return this.addResource(resource);
  }
}

export var LdpLinkService = new LdpLinkServiceClass(rso.LinkContainer.value);
export default LdpLinkService;
