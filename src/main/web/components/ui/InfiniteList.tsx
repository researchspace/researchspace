/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import { AutoSizer, Grid, GridCellProps } from 'react-virtualized';

export interface InfiniteListConfig {
  rowHeight: number;
  columnWidth: number;
}
type InfiniteListProps = InfiniteListConfig & React.Props<InfiniteList>;

export class InfiniteList extends React.Component<InfiniteListProps> {
  render() {
    const { rowHeight, columnWidth } = this.props;
    const children = React.Children.toArray(this.props.children) as React.ReactElement[];

    return (
      <AutoSizer>
        {({ width, height }) => {
          console.log(width)
          console.log(height)
          const columnCount = Math.floor(width / columnWidth);
          const rowCount = Math.ceil(children.length / columnCount);
          return (
            <Grid
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              cellRenderer={this.renderRow(children, columnCount)}
            ></Grid>
          );
        }}
      </AutoSizer>
    );
  }

  private renderRow = (children: React.ReactElement[], columnCount: number) => (cellProps: GridCellProps) => {
    const { rowIndex, columnIndex, key, style } = cellProps;
    const element = children[rowIndex*columnCount + columnIndex];
    if (element) {
      return React.cloneElement(children[rowIndex*columnCount + columnIndex], {key, style});
    } else {
      return <div key={key} style={style}></div>
    }
  }
}

export default InfiniteList;
