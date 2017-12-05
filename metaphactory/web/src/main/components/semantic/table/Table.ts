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

import {
  createFactory, createClass, createElement, DOM as D, Component, ReactElement,
  ClassicComponentClass, Props,
} from 'react';
import * as GriddleReact from 'griddle-react';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import * as assign from 'object-assign';

import {
  RdfValueDisplay as RdfValue,
} from 'platform/components/utils/RdfValueDisplay';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import { TemplateItem } from 'platform/components/ui/template';

import { Pagination, CustomPaginationProps } from './Pagination';
import './Table.scss';


const Griddle = createFactory(GriddleReact);

interface TableState {
  isLoading?: boolean;
  layout?: {};
}

interface ColumnMetadata {
  displayName: string;
  columnName: string;
  visible: boolean;
  order: number;
  customComponent: ClassicComponentClass<{}>;
}

export interface TableLayout {
  options?: {};
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
  cellComponent?: ClassicComponentClass<{}>;
};

export interface TableConfig {
  columnConfiguration?: Array<TableColumnConfiguration>;
  numberOfDisplayedRows: Data.Maybe<number>;
  layout?: Data.Maybe<TableLayout>;
  data: Data.Either<any[], SparqlClient.SparqlSelectResult>;
  currentPage?: number;
  onPageChange?: (page: number) => void;
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
export class Table extends Component<TableProps, TableState> {

  constructor(props: TableProps, context) {
    super(props, context);
    this.state = {
      isLoading: true,
      layout: {
        tupleTemplate: maybe.Nothing<string>(),
        showLabels: true,
      },
    };
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
    config: TableProps, data: Data.Either<any[], SparqlClient.SparqlSelectResult>
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

    const griddleConfig = data.fold<{}>(
      (json: any[]): any => this.getGriddlePropsForFlatDataArray(json, config, griddleProps),
      (res: SparqlClient.SparqlSelectResult) =>
        this.getGriddlePropsForSparqlResult(res, config, griddleProps)
    );


    const griddleWithOptions =
        config.layout.map(
          l => assign({}, griddleConfig, l.options)
        ).getOrElse(griddleConfig);

    const griddleWithLayout =
        config.layout.chain(
          l => l.tupleTemplate
        ).map(
          tupleTemplate => this.useCustomLayout(griddleWithOptions, tupleTemplate)
        ).getOrElse(griddleWithOptions);

    return Griddle(griddleWithLayout);
  }

  private getGriddlePropsForSparqlResult = (
    data: SparqlClient.SparqlSelectResult, config: TableProps, griddleProps: {}
  ) => {
    const columnsMetadata = this.buildColumnsMetadata(data.head.vars, config);
    return assign(
      {},
      griddleProps, {
        // push empty literals if binding variable does not exist in binding
        // entry i.e. missing values due to optional
        results: this.prepareSparqlResultData(data, config),
        // workaround for https://github.com/GriddleGriddle/Griddle/issues/114
        columns: _(columnsMetadata).filter('visible').map('columnName').value(),
        columnMetadata: columnsMetadata,
      }
    );
  }

  private getGriddlePropsForFlatDataArray = (
    data: any[], config: TableProps, griddleProps: {}
  ) => {
    const heads = _.reduce(data, (union, obj) => _.union(union, Object.keys(obj)), []);
    const columnsMetadata = this.buildColumnsMetadata(heads, config);
    return assign(
      {},
      griddleProps, {
        // push empty literals if binding variable does not exist in binding
        // entry i.e. missing values due to optional
        results: this.prepareFlatData(data, config),
        // workaround for https://github.com/GriddleGriddle/Griddle/issues/114
        columns: _(columnsMetadata).filter('visible').map('columnName').value(),
        columnMetadata: columnsMetadata,
      }
    );
  }

  private useCustomLayout = (griddleProps, tupleTemplate) => {
    return assign(
      {}, griddleProps,
      {
        useCustomRowComponent: true,
        customRowComponentClassName: 'griddle-custom-row',
        customRowComponent: CustomRow,
        metadataColumns: [
          {
            template: tupleTemplate,
          },
        ],
      }
    );
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
            binding[bindingVar] = binding[bindingVar] ? binding[bindingVar] : Rdf.literal('')
        );
        _.forEach(
          additionalColumns,
          c => {
            binding[c.displayName] = Rdf.literal('');
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
  ): ClassicComponentClass<any> => {
    return createClass({
      template: _.isString(template) ? String(template) : undefined,
      showLabel: showLabel,
      render: function(): ReactElement<any> {
        if (_.isUndefined(this.template) === false) {
          return createElement(TemplateItem, {
            template: {
              source: this.template,
              options: this.props.rowData,
            },
          });
        } else {
          return this.isPrimitiveDatatype(this.props.data) ? D.span({}, this.props.data) :
          createElement(
            RdfValue,
            {
              data: this.props.data,
              showLabel: this.showLabel,
            }
          );
        }
      },
      isPrimitiveDatatype: function(data: any): boolean{
        return _.isString(this.props.data)
          || _.isBoolean(this.props.data)
          || _.isNumber(this.props.data)
          || _.isNull(this.props.data)
          || _.isUndefined(this.props.data);
      },
    });
  }
}

export default Table;
