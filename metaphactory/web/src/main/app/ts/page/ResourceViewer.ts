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

import { Component, createElement, cloneElement, Children} from 'react';

import { getOverlaySystem } from 'platform/components/ui/overlay';
import {ResourceViewerDialog} from './ResourceViewerDialog';

export class ResourceViewer extends Component<{pageIri: string, title: string}, {}> {

    public render() {
        const props = {
        onClick: this.onClick,
        };
        return cloneElement(<any>Children.only(this.props.children), props);
    }

    private onClick = () => {
        const dialogRef = `show-source-statements-${this.props.title}`;
        getOverlaySystem().show(
          dialogRef,
            createElement(ResourceViewerDialog, this.props)
        );
    }


}

