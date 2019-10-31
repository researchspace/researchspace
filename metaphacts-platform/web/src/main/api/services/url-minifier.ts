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

import * as Kefir from 'kefir';
import { get } from 'platform/api/http';

import { Rdf } from 'platform/api/rdf';
import { constructUrlForResource } from 'platform/api/navigation';


module URLMinifierService {
  const URL_MINIFIER_SERVICE_URL = '/rest/url-minify/getShort';

  export function getShortKey(url: string): Kefir.Property<string> {
    const request = get(URL_MINIFIER_SERVICE_URL)
      .query({url})
      .accept('text/plain');
    return Kefir.fromNodeCallback<string>(
      cb => request.end((err, res) => cb(err, res.text))
    ).toProperty();
  }

  export function getShortURLForResource(
    iri: Rdf.Iri, repository?: string
  ): Kefir.Property<string> {
    return constructUrlForResource(iri, {}, repository)
      .map(url => url.absoluteTo(location.origin).valueOf())
      .flatMap(makeShortURL)
      .toProperty();
  }

  export function makeShortURL(fullUrl: string): Kefir.Property<string> {
    return URLMinifierService.getShortKey(fullUrl)
      .map(key => location.origin + '/l/' + key);
  }
}

export = URLMinifierService;
