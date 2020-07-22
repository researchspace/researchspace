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

import * as Kefir from 'kefir';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';

import { rso, crmdig } from '../vocabularies/vocabularies';

/**
 * ldp client for ImageOverlayService
 */
export class LdpOverlayImageServiceClass extends LdpService {
  constructor(container: string) {
    super(container);
  }

  private createResourceGraph(
    name: string,
    topImage: Rdf.Iri,
    topOpacity: number,
    bottomImage: Rdf.Iri,
    bottomOpacity: number
  ): Rdf.Graph {
    const overlayIri = Rdf.iri('');

    // These three hard-coded IRIs will be replaced at server-side,
    // when object IRI will be known, see @ImageOverlay.java
    const eventIri = Rdf.iri('http://www.researchspace.org/event');
    const param1 = Rdf.iri('http://www.researchspace.org/param1');
    const param2 = Rdf.iri('http://www.researchspace.org/param2');

    const resourceGraph = Rdf.graph([
      // common typing & labels
      Rdf.triple(overlayIri, vocabularies.rdf.type, rso.Thing),
      Rdf.triple(overlayIri, vocabularies.rdf.type, rso.EX_Digital_Image),
      Rdf.triple(overlayIri, vocabularies.rdf.type, crmdig.D9_Data_Object),
      Rdf.triple(overlayIri, vocabularies.rdfs.label, Rdf.literal(name)),
      Rdf.triple(overlayIri, rso.displayLabel, Rdf.literal(name)),
      // derivatives info
      Rdf.triple(topImage, crmdig.L21_used_as_derivation_source, eventIri),
      Rdf.triple(bottomImage, crmdig.L21_used_as_derivation_source, eventIri),
      Rdf.triple(eventIri, vocabularies.rdf.type, crmdig.D3_Formal_Derivation),
      Rdf.triple(eventIri, crmdig.L22_created_derivative, overlayIri),
      // Parameters - param1
      Rdf.triple(eventIri, crmdig.L13_used_parameters, param1),
      Rdf.triple(param1, vocabularies.rdf.type, crmdig.D1_Digital_Object),
      Rdf.triple(param1, rso.OverlayImageSource, bottomImage),
      Rdf.triple(param1, rso.OverlayOrder, Rdf.literal('1')),
      Rdf.triple(param1, rso.OverlayOpacity, Rdf.literal('' + bottomOpacity)),
      // Parameters - param2
      Rdf.triple(eventIri, crmdig.L13_used_parameters, param2),
      Rdf.triple(param2, vocabularies.rdf.type, crmdig.D1_Digital_Object),
      Rdf.triple(param2, rso.OverlayImageSource, topImage),
      Rdf.triple(param2, rso.OverlayOrder, Rdf.literal('2')),
      Rdf.triple(param2, rso.OverlayOpacity, Rdf.literal('' + topOpacity)),
    ]);
    return resourceGraph;
  }

  public createOverlayImage(
    name: string,
    topImage: Rdf.Iri,
    topOpacity: number,
    bottomImage: Rdf.Iri,
    bottomOpacity: number
  ): Kefir.Property<Rdf.Iri> {
    const resource = this.createResourceGraph(name, topImage, topOpacity, bottomImage, bottomOpacity);
    // we used to pass image name as slug, but this breaks image ID generation.
    return this.addResource(resource);
  }
}

export const LdpOverlayImageService = new LdpOverlayImageServiceClass(rso.OverlayImageContainer.value);
export default LdpOverlayImageService;
