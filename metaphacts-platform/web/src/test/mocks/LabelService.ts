/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { expect } from 'chai';
import * as sinon from 'sinon';

import { setPreferredUserLanguage } from 'platform/api/services/language';

export function mockLabelsService(
  server: sinon.SinonFakeServer, response: string, expectedRequest?: string
) {
  const preferredLanguage = 'en';

  setPreferredUserLanguage(preferredLanguage);
  const mockedUri = `/rest/data/rdf/utils/getLabelsForRdfValue`
    + `?repository=default&preferredLanguage=${preferredLanguage}`;

  server.respondWith(
    'POST', mockedUri,
    (xhr: sinon.SinonFakeXMLHttpRequest) => {
      if (expectedRequest) {
        expect(xhr.requestBody).to.be.equalIgnoreSpaces(expectedRequest);
      }

      xhr.respond(
        200, { 'Content-Type': 'application/json' }, response
      );
    }
  );
}
