/**
 * ResearchSpace
 * Copyright (C) 2024, PHAROS: The International Consortium of Photo Archives
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

interface MetaObject {
  id: string;
  storageKind: string;
  mutableStorage: boolean;
  components?: string[];
}

// Define the endpoint constant
const LIST_APPS_ENDPOINT = '/rest/admin/apps';

/**
 * Get all apps with corresponding metadata.

 * @see - org.researchspace.rest.endpoint.AppAdminEndpoint
 */
export async function getAllApps(): Promise<MetaObject[]> {
  const response = await fetch(LIST_APPS_ENDPOINT);

  if (!response.ok) {
    throw new Error('Network response was not ok ' + response.statusText);
  }

  const data: MetaObject[] = await response.json();
  return data;
}
