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
import * as request from 'platform/api/http';

import { requestAsProperty } from 'platform/api/async';

const REST_CONFIG_GROUP_URL = '/rest/config';

export interface ConfigGroup {
  parameterType: 'string' | 'boolean' | 'integer' | 'stringList';
  value: string | boolean | number | ReadonlyArray<string> | null;
  definedByApps: ReadonlyArray<string>;
  shadowed: boolean;
}

export interface ConfigStorageStatus {
  appId: string;
  writable: boolean;
}

export function getConfigsInGroup(group: string): Kefir.Property<{ [key: string]: ConfigGroup }> {
  const req = request
    .get(REST_CONFIG_GROUP_URL + `/${group}`)
    .type('application/json')
    .accept('application/json');
  return requestAsProperty(req).map((res) => res.body);
}

export function setConfig(group: string, name: string, values: ReadonlyArray<string>, targetAppId: string) {
  const req = request
    .put(REST_CONFIG_GROUP_URL + `/${group}/${name}`)
    .type('application/json')
    .query({ targetAppId })
    .send(values);
  return requestAsProperty(req).map((res) => res.ok);
}

export function deleteConfig(group: string, name: string, targetAppId: string) {
  const req = request.delete(REST_CONFIG_GROUP_URL + `/${group}/${name}`).query({ targetAppId });
  return requestAsProperty(req).map((res) => res.ok);
}

export function getStorageStatus(): Kefir.Property<ConfigStorageStatus[]> {
  const req = request
    .get(REST_CONFIG_GROUP_URL + `/storageStatus`)
    .type('application/json')
    .accept('application/json');
  return requestAsProperty(req).map((res) => res.body);
}

export function configValueToArray(value: ConfigGroup['value']) {
  return Array.isArray(value) ? value : value === null || value === undefined ? [] : [value.toString()];
}
