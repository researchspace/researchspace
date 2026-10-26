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

import { Component } from 'react';
import * as D from 'react-dom-factories';

interface GriddlePaginationProps {
  maxPage: number;
  currentPage: number;
  setPage: (pageN: number) => void;
  previous: () => void;
  next: () => void;
}

export interface CustomPaginationProps {
  externalCurrentPage?: number;
  onPageChange?: (newPage: number) => void;
}

export type PaginationProps = GriddlePaginationProps & CustomPaginationProps;

export class Pagination extends Component<PaginationProps, {}> {
  constructor(props) {
    super(props);
  }

  static defaultProps = {
    maxPage: 0,
    currentPage: 0,
  };

  componentDidMount() {
    this.updateCurrentPageIfRequested(this.props);
  }

  componentWillUpdate(nextProps: PaginationProps) {
    if (this.props.onPageChange && nextProps.externalCurrentPage !== this.props.externalCurrentPage) {
      // update page only in controlled mode
      this.updateCurrentPageIfRequested(nextProps);
    }
  }

  private updateCurrentPageIfRequested(props: PaginationProps) {
    const shouldUpdatePage =
      typeof props.externalCurrentPage === 'number' && props.externalCurrentPage !== props.currentPage;

    if (shouldUpdatePage) {
      this.setPage(props.externalCurrentPage);
    }
  }

  pageChange = (event) => {
    this.setPage(parseInt(event.target.getAttribute('data-value')));
  };

  private setPage(newPage: number) {
    this.props.setPage(newPage);
    if (this.props.onPageChange) {
      this.props.onPageChange(newPage);
    }
  }

  render() {
    if (this.props.maxPage > 1) {
      var previous = D.li(
        {
          className: this.props.currentPage == 0 ? 'disabled' : '',
        },
        D.a(
          {
            onClick: this.props.previous,
          },
          D.span({}, '\xAB')
        )
      );

      var next = D.li(
        {
          className: this.props.currentPage == this.props.maxPage - 1 ? 'disabled' : '',
        },
        D.a(
          {
            onClick: this.props.next,
          },
          D.span({}, '\xBB')
        )
      );

      var startIndex = Math.max(this.props.currentPage - 5, 0);
      var endIndex = Math.min(startIndex + 11, this.props.maxPage);

      if (this.props.maxPage >= 11 && endIndex - startIndex <= 10) {
        startIndex = endIndex - 11;
      }

      var options = [];
      for (var i = startIndex; i < endIndex; i++) {
        var selected = this.props.currentPage == i ? 'active' : '';
        options.push(
          D.li(
            {
              key: i,
              className: selected,
            },
            D.a({ 'data-value': i, onClick: this.pageChange } as any, i + 1)
          )
        );
      }

      return D.nav({}, D.ul({ className: 'pagination' }, previous, options, next));
    } else {
      return D.nav({});
    }
  }
}
