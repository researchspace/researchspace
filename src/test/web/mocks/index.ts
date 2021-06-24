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

import * as sinon from 'sinon';

import { ConfigHolder } from 'platform/api/services/config-holder';
import { init as initNavigation } from 'platform/api/navigation';

export function mockRequest() {
  beforeEach(function () {
    this.xhr = sinon.useFakeXMLHttpRequest();
    this.xhr.onCreate = function (xhr) {
      this.request = xhr;
    }.bind(this);
  });

  afterEach(function () {
    this.xhr.restore();
  });
}

export function mockConfig() {
  initNavigation();
  sinon.stub(ConfigHolder, 'getUIConfig').callsFake(function () {
    return { preferredLanguages: [] };
  });
  sinon.stub(ConfigHolder, 'getGlobalConfig').callsFake(function () {
    return { };
  });
  sinon.stub(ConfigHolder, 'getEnvironmentConfig').callsFake(function () {
    return { resourceUrlMapping: { value: 'http://example.com/' } };
  });
}
