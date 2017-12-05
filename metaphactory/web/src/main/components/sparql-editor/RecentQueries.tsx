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

import * as React from 'react';
import { Component } from 'react';
import * as moment from 'moment';

import { Cancellation } from 'platform/api/async';
import { BrowserPersistence } from 'platform/components/utils';

import { ContextTypes, ComponentContext } from './SparqlQueryEditorContext';

export interface RecentQueriesProps { }

const LS_RECENT_QUERIES = 'recentQueries';
const MAX_LS_RECENT_QUERIES = 10;

export class RecentQueries extends Component<RecentQueriesProps, void> {
  static readonly contextTypes = ContextTypes;
  context: ComponentContext;

  private readonly cancellation = new Cancellation();

  private lastQuery: string;

  render() {
    const recentQueries = BrowserPersistence.getItem(LS_RECENT_QUERIES);
    if (!recentQueries) {
      return <span>no queries</span>;
    }

    return <div className='list-group' style={{marginBottom: 0}}>
      {recentQueries.map((item, index) =>
        <a key={index} href='' className='list-group-item'
          title={item.get('query')}
          onClick={e => {
            e.preventDefault();
            const {queryEditorContext} = this.context;
            const query: string = item.get('query');
            this.lastQuery = query;
            queryEditorContext.setQuery(query);
          }}>
          <span style={{
              background: 'lightgrey',
              color: '#fff',
              display: 'inline-block',
              fontSize: '0.8em',
              padding: '1px 5px',
              marginBottom: 3,
            }}>
            {item.get('date')}
          </span>
          <div style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
            {item.get('query')}
          </div>
        </a>,
      )}
    </div>;
  }

  componentDidMount() {
    const {queryEditorContext} = this.context;
    this.cancellation.map(queryEditorContext.queryChanges).onValue(query => {
      if (query.isJust && query.get() !== this.lastQuery) {
        this.addRecentQueries(query.get());
      }
    });
  }

  private addRecentQueries = (query: string) => {
    const recentQueries = BrowserPersistence.getItem(LS_RECENT_QUERIES);

    const recentQuery = {
      query: query,
      date: moment().format('MM/DD/YY, HH:mm'),
    };

    if (recentQueries) {
      const queries = recentQueries.toArray();

      if (queries[0].get('query') !== query) {
        queries.unshift(recentQuery);
      } else {
        queries.splice(0, 1, recentQuery);
      }

      if (queries.length > MAX_LS_RECENT_QUERIES) { queries.pop(); }

      BrowserPersistence.setItem(LS_RECENT_QUERIES, queries);
    } else {
      BrowserPersistence.setItem(LS_RECENT_QUERIES, [recentQuery]);
    }

    this.forceUpdate();
  }
}

export default RecentQueries;
