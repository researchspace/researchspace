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

import { LdpService } from 'platform/api/services/ldp';
import { rso } from '../vocabularies/vocabularies';

/**
 * ldp client for UserDefinedPages container
 */
export class LDPUserDefinedPageServiceClass extends LdpService {
  constructor(container: string) {
    super(container);
  }
}

export var LdpUserDefinedPageService = new LDPUserDefinedPageServiceClass(rso.UserDefinedPagesContainer.value);
export default LdpUserDefinedPageService;
