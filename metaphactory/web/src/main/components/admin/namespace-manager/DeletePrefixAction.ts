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

import {DOM as D, createFactory, Component, MouseEvent} from 'react';

import { refresh } from 'platform/api/navigation';
import * as NamespaceService from 'platform/api/services/namespace';

class DeletePrefixActionLink extends Component<{ prefix: string}, {}> {
    public render() {
        // offer delete only for non-system namespaces (i.e. starting with a capital)
        const prefix = this.props.prefix;
        if (!prefix || prefix[0] === prefix[0].toUpperCase()) {
          return null;
        }
        return D.a({
            onClick: this.onClick,
        }, this.props['children']);
    }

    onClick = (e: MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
      e.preventDefault();
      NamespaceService.deletePrefix(this.props.prefix)
        .onValue(_ => refresh())
        .onError( (error: string) => {
          // TODO error handling
          alert(error);
       });
    }
}

export type component = DeletePrefixActionLink;
export const component = DeletePrefixActionLink;
export const factory = createFactory(component);
export default component;
