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

import {
  createElement, Component, ReactElement, ComponentClass, Props,
} from 'react';
import * as D from 'react-dom-factories';
import * as Griddle from 'griddle-react';
import { GriddleConfig, ColumnMetadata } from 'griddle-react';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import * as assign from 'object-assign';

import {
  RdfValueDisplay as RdfValue,
} from 'platform/components/utils/RdfValueDisplay';

import { SparqlClient } from 'platform/api/sparql';

import { TemplateItem } from 'platform/components/ui/template';

import { Pagination, CustomPaginationProps } from './Pagination';
import './Table.scss';

export interface TableLayout {
  options?: Griddle.GriddleConfig;
  tupleTemplate?: Data.Maybe<string>;
  showLabels?: boolean;
}

interface BaseColumnConfiguration {
  /**
   * Cell heading label
   */
  displayName: string;
}

/**
 * Simple column configuration that can be used to override column header but still use default cell visualization.
 */
interface SimpleColumnConfig extends BaseColumnConfiguration {
  /**
   * SPARQL projection variable name that this column is bind to.
   */
  variableName: string;
}
function isSimpleColumnConfig(config: ColumnConfiguration): config is SimpleColumnConfig {
  return _.has(config, 'variableName');
}

/**
 * Custom column configuration that can be used when one needs to override default cell visualization template.
 */
interface CustomColumnConfig extends BaseColumnConfiguration {
  /**
   * Custom cell visualization <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>template</semantic-link>. Template has access to all projection variables for a single result tuple.
   * **The template MUST have a single HTML root element.**
   */
  cellTemplate?: string;
}
function isCustomColumnConfig(config: ColumnConfiguration): config is CustomColumnConfig {
  return _.has(config, 'cellTemplate');
}

export type ColumnConfiguration = SimpleColumnConfig | CustomColumnConfig;
export type TableColumnConfiguration = ColumnConfiguration & {
  cellComponent?: ComponentClass<CellRendererProps>;
};

export interface CellRendererProps {
  data: any;
  rowData: any;
}

export interface TableConfig {
  columnConfiguration?: Array<TableColumnConfiguration>;
  numberOfDisplayedRows: Data.Maybe<number>;
  layout?: Data.Maybe<TableLayout>;
  data: Data.Either<ReadonlyArray<any>, SparqlClient.SparqlSelectResult>;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  showLiteralDatatype?: boolean;
  linkParams?: {};
  showCopyToClipboardButton?: boolean;
}

export type TableProps = TableConfig & Props<Table>;

interface CustomRowProps {
  data: SparqlClient.Binding;
  metadataColumns: any[];
}

export class CustomRow extends Component<CustomRowProps, {}> {
  constructor(props: CustomRowProps, context) {
    super(props, context);
  }

  public render() {
    return createElement(TemplateItem, {
      template: { // TODO should not abuse the metadataColumns
        source: !_.isUndefined(this.props.metadataColumns[1]) ?
            this.props.metadataColumns[1].template : 'No Template defined',
        options: this.props.data,
      },
    });
  }
}

const DEFAULT_ROWS_PER_PAGE = 10;
export class Table extends Component<TableProps, {}> {

  constructor(props: TableProps, context: any) {
    super(props, context);
  }

  public render() {
    return D.div(
      {
        className: 'metaphacts-table-widget-holder',
      },
      this.renderTableData(this.props, this.props.data)
    );
  }

  private renderTableData = (
    config: TableProps, data: Data.Either<ReadonlyArray<any>, SparqlClient.SparqlSelectResult>
  ) => {
    const paginationProps: CustomPaginationProps = {
      externalCurrentPage: config.currentPage,
      onPageChange: config.onPageChange,
    };

    const griddleProps: Partial<Griddle.GriddleConfig> = {
      resultsPerPage: config.numberOfDisplayedRows.getOrElse(DEFAULT_ROWS_PER_PAGE),
      showFilter: true,
      useGriddleStyles: false,
      tableClassName: 'table',
      sortAscendingComponent: D.span({className: 'fa fa-sort-alpha-asc'}),
      sortDescendingComponent: D.span({className: 'fa fa-sort-alpha-desc'}),
      useCustomPagerComponent: true,
      customPagerComponent: Pagination,
      customPagerComponentOptions: paginationProps,
    };

    const griddleConfig = data.fold<GriddleConfig>(
      (json: any[]): any => this.getGriddlePropsForFlatDataArray(json, config, griddleProps),
      (res: SparqlClient.SparqlSelectResult) =>
        this.getGriddlePropsForSparqlResult(res, config, griddleProps)
    );

    const griddleWithOptions = config.layout.map(
      (l): GriddleConfig => ({...griddleConfig, ...l.options})
    ).getOrElse(griddleConfig);

    const griddleWithLayout =
        config.layout.chain(
          l => l.tupleTemplate
        ).map(
          tupleTemplate => this.useCustomLayout(griddleWithOptions, tupleTemplate)
        ).getOrElse(griddleWithOptions);

    return createElement(Griddle, griddleWithLayout);
  }

  private getGriddlePropsForSparqlResult = (
    data: SparqlClient.SparqlSelectResult, config: TableProps, griddleProps: GriddleConfig
  ): GriddleConfig => {
    const columnsMetadata = this.buildColumnsMetadata(data.head.vars, config);
    return {
      ...griddleProps,
      // push empty literals if binding variable does not exist in binding
      // entry i.e. missing values due to optional
      results: this.prepareSparqlResultData(data, config),
      // workaround for https://github.com/GriddleGriddle/Griddle/issues/114
      columns: _(columnsMetadata).filter('visible').map('columnName').value(),
      columnMetadata: columnsMetadata,
    };
  }

  private getGriddlePropsForFlatDataArray = (
    data: any[], config: TableProps, griddleProps: GriddleConfig
  ): GriddleConfig => {
    const heads = _.reduce(data, (union, obj) => _.union(union, Object.keys(obj)), []);
    const columnsMetadata = this.buildColumnsMetadata(heads, config);
    return {
      ...griddleProps,
      // push empty literals if binding variable does not exist in binding
      // entry i.e. missing values due to optional
      results: this.prepareFlatData(data, config),
      // workaround for https://github.com/GriddleGriddle/Griddle/issues/114
      columns: _(columnsMetadata).filter('visible').map('columnName').value(),
      columnMetadata: columnsMetadata,
    };
  }

  private useCustomLayout = (griddleProps: GriddleConfig, tupleTemplate): GriddleConfig => {
    return {
      ...griddleProps,
      useCustomRowComponent: true,
      customRowComponentClassName: 'griddle-custom-row',
      customRowComponent: CustomRow,
      metadataColumns: [
        {
          template: tupleTemplate,
        },
      ],
    };
  }

  private prepareFlatData = (data: any[], config: TableProps) => {
    const additionalColumns = this.getAdditionalColumns(config);
    _.forEach(data, x => {
      _.forEach(additionalColumns, column => {
          x[column.displayName] = '';
      });
    });
    return data;
  }

  private prepareSparqlResultData = (data: SparqlClient.SparqlSelectResult, config: TableProps) => {
    // return data.results.bindings;
    const additionalColumns = this.getAdditionalColumns(config);
    return _.each(
      data.results.bindings,
      binding => {
        _.forEach(
          data.head.vars, bindingVar =>
            binding[bindingVar] = binding[bindingVar]
        );
        _.forEach(
          additionalColumns,
          c => {
            binding[c.displayName] = undefined;
          }
        );
        return binding;
      }
    );
  }

  private buildColumnsMetadata = (vars: string [], config: TableProps): ColumnMetadata[] => {
    // we show all columns from bindings only when we don't specify any column
    //  configuration in the config
    if (_.isEmpty(config.columnConfiguration)) {
      return this.defaultColumnsMetadata(vars);
    } else {
      return this.customColumnsMetadata(config);
    }
  }

  private defaultColumnsMetadata = ( vars: string []): ColumnMetadata[] => {
    return _.map<string, ColumnMetadata>(vars, (k: string, num: number) => {
      return {
        displayName: k,
        columnName: k,
        visible: true,
        order: num,
        customComponent: this.cellTemplateClass(
                            undefined, this.props.layout.map(l => l.showLabels).getOrElse(true)
                          ),
      };
    });
  }

  private customColumnsMetadata  = (config: TableProps): ColumnMetadata[] => {
    return _.map(config.columnConfiguration, (columnConfig, i) => {
      const columnName = isSimpleColumnConfig(columnConfig)
          ? columnConfig.variableName
          : columnConfig.displayName;

      return {
        columnName: columnName,
        displayName: columnConfig.displayName,
        customComponent: this.cellComponentClass(columnConfig),
        visible: true,
        order: i,
      };
    });
  }

  private cellComponentClass = (columnConfig: TableColumnConfiguration) => {
    if (columnConfig.cellComponent) {
      return columnConfig.cellComponent;
    } else {
      return this.cellTemplateClass(
        isCustomColumnConfig(columnConfig) ? columnConfig.cellTemplate : undefined
      );
    }
  }

  private getAdditionalColumns = (config: TableProps) => {
    return _.filter(config.columnConfiguration, c => isSimpleColumnConfig(c) === false);
  }

  private cellTemplateClass = (
    template?: string, showLabel?: boolean
  ): ComponentClass<any> => {
    const {showLiteralDatatype, linkParams, showCopyToClipboardButton} = this.props;
    const templateSource = _.isString(template) ? String(template) : undefined;
    return class extends Component<CellRendererProps, {}> {
      render(): ReactElement<any> {
        if (_.isUndefined(templateSource) === false) {
          return createElement(TemplateItem, {
            template: {
              source: templateSource,
              options: this.props.rowData,
            },
          });
        } else {
          return isPrimitiveDatatype(this.props.data) ? D.span({}, this.props.data) :
          createElement(
            RdfValue,
            {
              data: this.props.data,
              showLabel: showLabel,
              showLiteralDatatype,
              linkParams,
              showCopyToClipboardButton,
            }
          );
        }
      }
    };
  }
}

function isPrimitiveDatatype(data: any): boolean {
  return _.isString(data)
    || _.isBoolean(data)
    || _.isNumber(data)
    || _.isNull(data)
    || _.isUndefined(data);
}

export default Table;
