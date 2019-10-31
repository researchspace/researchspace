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

import { Children, ReactElement, cloneElement, createFactory } from 'react';
import * as fileSaver from 'file-saver';

import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component } from 'platform/api/components';

/**
 * Component to trigger the download of a SPARQL result set.
 * Downloading starts when the child element has been clicked,
 * therefore component should contain only one child element.
 * Child element could be any HTML-element (not text node).
 *
 * @example
 * <mp-sparql-download query="SELECT * WHERE {?a ?b ?c} LIMIT 10"
 *                     header="application/sparql-results+json">
 *     <button>Download SPARQL JSON</button>
 * </mp-sparql-download>
 *
 * @example
 * <mp-sparql-download query="SELECT * WHERE {?a ?b ?c} LIMIT 10"
 *                     header="text/csv"
 *                     filename="myresult.csv">
 *     <a href="#">Download CSV</a>
 * </mp-sparql-download>
 */
export interface Props {
  /**
   * SPARQL SELECT OR CONSTRUCT query
   */
  query: string;
  /**
   * result mime type header (according to the standards)
   */
  header: SparqlUtil.ResultFormat;
  /**
   * (optional) file name
   */
  filename?: string;
}

class SparqlDownloadComponent extends Component<Props, {}> {
  private onSave = (event: React.SyntheticEvent<any>) => {
    event.preventDefault();

    const results = [];
    SparqlClient.sendSparqlQuery(
      this.props.query, this.props.header,  {context: this.context.semanticContext}
    ).onValue(
      response => {
        results.push(response);
      }
    ).onEnd(() => {
      let blob = new Blob(results, {type: this.props.header});
      fileSaver.saveAs(blob, this.props.filename || 'file.txt');
    });
  }

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {
      onClick: this.onSave,
    };

    return cloneElement(child, props);
  }
}

export type component = SparqlDownloadComponent;
export const component = SparqlDownloadComponent;
export const factory = createFactory(component);
export default component;
