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

import { createFactory, Children } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';

import { Component } from 'platform/api/components';
import { SparqlUtil } from 'platform/api/sparql';
import { factory as SparqlDownload } from 'platform/components/semantic/results/SparqlDownloadComponent';

const Button = createFactory(ReactBootstrap.Button);

interface Props {
  /**
   * Component to get query prop from
   */
  component?: any;
  /**
   * (optional) result mime type header
   */
  header?: SparqlUtil.ResultFormat;
  /**
   * (optional) file name
   */
  filename?: string;
}

interface State {
  header?: SparqlUtil.ResultFormat;
  filename?: string;
}

export class ActionDownloadComponent extends Component<Props, State> {
  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.parseQuery(this.props);
  }
  componentWillReceiveProps(props: Props) {
    this.parseQuery(props);
  }

  parseQuery(props: Props) {
    let header = props.header;
    let filename = props.filename;
    if (!header) {
      const parsedQuery = SparqlUtil.parseQuerySync(props.component.props.query);
      if (parsedQuery.type !== 'query') {
        throw 'query type is not supported, expected SELECT or CONSTRUCT';
      }
      if (parsedQuery.queryType === 'SELECT') {
        header = 'text/csv';
        filename = props.filename || 'file.csv';
      } else if (parsedQuery.queryType === 'CONSTRUCT') {
        header = 'text/turtle';
        filename = props.filename || 'file.ttl';
      }
    }
    this.setState({ header, filename });
  }

  render() {
    const query = this.props.component.props.query;
    const { header, filename } = this.state;
    const child =
      Children.count(this.props.children) === 1
        ? Children.only(this.props.children)
        : Button({ title: 'Download data' }, D.i({ className: 'fa fa-download' }));
    return SparqlDownload({ query, header, filename }, child);
  }
}

export default ActionDownloadComponent;
