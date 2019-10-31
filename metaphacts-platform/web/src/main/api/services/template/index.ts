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

import * as request from 'platform/api/http';

import { purgeRemoteTemplateCache, parseTemplate } from './RemoteTemplateFetcher';
import { TemplateScope } from './TemplateScope';

const TEMPLATE_SERVICE_URL = '/rest/template/';

export function getHeader(cb: (html: string) => void): void {
  request
    .get(TEMPLATE_SERVICE_URL + 'header')
    .accept('text/html')
    .end((err, res) => {
      cb(res.text);
    });
}

export function getFooter(cb: (html: string) => void): void {
  request
    .get(TEMPLATE_SERVICE_URL + 'footer')
    .accept('text/html')
    .end((err, res) => {
      cb(res.text);
    });
}


export function getNoPermissionsPage(cb: (html: string) => void): void {
  request
    .get(TEMPLATE_SERVICE_URL + 'noPermissionsPage')
    .accept('text/html')
    .end((err, res) => {
      cb(res.text);
    });
}



export function purgeTemplateCache() {
  TemplateScope.default.clearCache();
  purgeRemoteTemplateCache();
}

export { ContextCapturer, CapturedContext } from './functions';
import * as TemplateParser from './TemplateParser';
export { TemplateParser, parseTemplate };
export * from './TemplateScope';
