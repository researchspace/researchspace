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

import { expect } from 'chai';
import * as sinon from 'sinon';

import { setPreferredUserLanguage } from 'platform/api/services/language';

export function mockLabelsService(server: sinon.SinonFakeServer, response: string, expectedRequest?: string) {
  const preferredLanguage = 'en';

  setPreferredUserLanguage(preferredLanguage);
  const mockedUri =
    `/rest/data/rdf/utils/getLabelsForRdfValue` + `?repository=default&preferredLanguage=${preferredLanguage}`;

  server.respondWith('POST', mockedUri, (xhr: sinon.SinonFakeXMLHttpRequest) => {
    if (expectedRequest) {
      expect(xhr.requestBody).to.be.equalIgnoreSpaces(expectedRequest);
    }

    xhr.respond(200, { 'Content-Type': 'application/json' }, response);
  });
}
