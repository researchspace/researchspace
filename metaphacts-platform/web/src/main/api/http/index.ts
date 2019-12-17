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

import * as request from 'superagent';

export { SuperAgentRequest, Response } from 'superagent';

let baseUrl = null;
export function init(base?: string) {
  baseUrl = base;
}

export function getBaseUrl() {
  return baseUrl;
}

function getAbsoluteUrl(url: string) {
  return baseUrl ? baseUrl + url : url;
}

export function options(url: string) {
  return request.options(getAbsoluteUrl(url));
}

export function get(url: string) {
  return request.get(getAbsoluteUrl(url));
}

export function post(url: string) {
  return request.post(getAbsoluteUrl(url));
}

export function put(url: string) {
  return request.put(getAbsoluteUrl(url));
}

export function patch(url: string) {
  return request.patch(getAbsoluteUrl(url));
}

export function head(url: string) {
  return request.head(getAbsoluteUrl(url));
}

export function del(url: string) {
  return request.delete(getAbsoluteUrl(url));
}
export {del as delete};
