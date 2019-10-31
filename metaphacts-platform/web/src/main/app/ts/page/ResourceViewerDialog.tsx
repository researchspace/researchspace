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

import * as React from 'react';
import { Component} from 'react';
import { getOverlaySystem , OverlayDialog} from 'platform/components/ui/overlay';
import * as PageLoader from 'platform/components/ui/page-loader';

export interface Props {
  pageIri: string;
  title: string;
  params?: { [index: string]: string };
}

 export class ResourceViewerDialog extends Component<Props, {}> {
  render() {
    return <OverlayDialog
      type='modal'
      onHide={() => {getOverlaySystem().hideAll();}}
      title={this.props.title}
      show={true}
      className='resource-viewer-modal'
      bsSize='lg'
    >
        <PageLoader.component iri={this.props.pageIri} {...this.props.params} />
    </OverlayDialog>;
  }
}