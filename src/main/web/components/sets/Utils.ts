/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

import { createFactory } from 'react';
import { Rdf } from 'platform/api/rdf';
import { trigger } from 'platform/api/events';
import { getSetServiceForUser } from 'platform/api/services/ldp-set';
import { SetManagementEvents } from 'platform/api/services/ldp-set/SetManagementEvents';
import { List } from 'immutable';
import { addNotification } from '../ui/notification';
import { ResourceLinkComponent } from 'platform/api/navigation/components/ResourceLinkComponent';
import { ConfigHolder } from 'platform/api/services/config-holder';

const ResourceLink = createFactory(ResourceLinkComponent);

export function createNewSetFromItems(source: string, name: string, items: Rdf.Iri[]) {  
  return getSetServiceForUser()
    .flatMap((service) => service.createSetAndAddItems(name, List(items)))
    .onValue((value) => {
      trigger({ eventType: SetManagementEvents.SetAdded, source: source, data: {containerIri: value[0].containerIri.value} });
      addNotification({
        level: 'success',
        autoDismiss: 1000,
        title: 'Set created!',
        children: (
          ResourceLink({ iri: ConfigHolder.getDashboard().value, 
            urlqueryparamView: 'single-set-management', 
            urlqueryparamResourceIri: value[0].containerIri.value, 
            className:'text-link' }, name )
        )
      });
    });
}
