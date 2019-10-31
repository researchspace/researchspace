/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';

export class LdpAssertionServiceClass extends LdpService {
  public createAssertion(
    assertion: Rdf.Graph, slug = maybe.Nothing<string>()
  ): Kefir.Property<Rdf.Iri> {
    return this.addResource(assertion, slug);
  }
}
