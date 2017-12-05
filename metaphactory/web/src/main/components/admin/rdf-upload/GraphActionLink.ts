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

import { DOM as D, Component, Props as ReactProps } from 'react';
import {startsWith, endsWith} from 'lodash';
import * as moment from 'moment';
import * as classnames from 'classnames';

import { Rdf } from 'platform/api/rdf';
import { refresh } from 'platform/api/navigation';
import { SparqlUtil } from 'platform/api/sparql';
import { RDFGraphStoreService } from 'platform/api/services/rdf-graph-store';
import './GraphActionLink.scss';

export interface Props extends ReactProps<GraphActionLink> {
  graphuri: string;
  action: string;
  fileEnding?: string;
  className?: string;
}

export class GraphActionLink extends Component<Props, {}> {
  render() {
    return D.span(
      {
        className: classnames(this.props.className, 'mp-rdf-graph-action'),
        onClick: this.onClick,
      },
      this.props.children
    );
  }

  onClick = () => {
    if (this.props.action === 'DELETE') {
      RDFGraphStoreService.deleteGraph(Rdf.iri(this.props.graphuri))
        .onValue(_ => refresh())
        .onError((error: string) => {
          // TODO error handling
          alert(error);
        });
    } else if (this.props.action === 'GET') {
      const acceptHeader = SparqlUtil.getMimeType(this.props.fileEnding);
      const ending = this.props.fileEnding && endsWith(this.props.graphuri, this.props.fileEnding )
        ? ''
        : '.' + this.props.fileEnding;
      const fileName = startsWith(this.props.graphuri, 'file:///' )
        ? this.props.graphuri.replace('file:///', '') + ending
        : 'graph-export-' + moment().format('YYYY-MM-DDTHH-m-s') + '.' + ending;
      RDFGraphStoreService.downloadGraph(
        Rdf.iri(this.props.graphuri),
        acceptHeader,
        fileName
      ).onValue( v => {});
    }
  }
}

export default GraphActionLink;
