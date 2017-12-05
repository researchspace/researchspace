/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import * as Kefir from 'kefir';
import * as request from 'superagent';

module ConfigService {
  const GET_CONFIG_GROUP = '/rest/config';
  const PUT_CONFIG = '/rest/config';


  export function getConfigsInGroup(
    group: string
  ): Kefir.Property<{[key: string]: {value: string | string[] | boolean; shadowed: boolean; } }> {
    const req = request
        .get(GET_CONFIG_GROUP + '/' + group)
        .type('application/json')
        .accept('application/json');
    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res) => cb(err, res.body))
    ).toProperty();
  }

  export function setConfig(configGroup: string, config: string, configValue: string) {
    const req = request
        .put(PUT_CONFIG + '/' + configGroup + '/' + config)
        .type('text/plain')
        .send(configValue);

    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res: request.Response) => {
        cb(err != null ? err.message : null, res.ok ? true : null);
      })
    );
  }

}

export = ConfigService;
