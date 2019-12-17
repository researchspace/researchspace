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
  createElement, ReactElement, ComponentClass, ClassAttributes,
} from 'react';
import * as Griddle from 'griddle-react';
import { GriddleConfig, ColumnMetadata } from 'griddle-react';
import * as _ from 'lodash';
import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { SparqlClient } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import xsd from 'platform/api/rdf/vocabularies/xsd';
import { getLabels } from 'platform/api/services/resource-label';

import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';
import { ErrorNotification } from 'platform/components/ui/notification';

import { Pagination, CustomPaginationProps } from './Pagination';
import { RdfValueDisplay } from './RdfValueDisplay';

import './Table.scss';

export interface TableLayout {
  options?: Griddle.GriddleConfig;
  tupleTemplate?: Data.Maybe<string>;

  /**
   * Determines if the table should automatically fetch and display labels for resource IRIs.
   *
   * @default true
   */
  showLabels?: boolean;

  /**
   * Prefetches labels for all resource IRIs in the data to support sorting and filtering
   * by resource labels.
   *
   * @default true
   */
  prefetchLabels?: boolean;
}

/**
 * Table column configuration which allows to override column header or cell visualization template.
 * Either `variableName` or `cellTemplate` is required to properly display column content.
 */
export interface ColumnConfiguration {
  /**
   * Cell heading label override.
   */
  displayName: string;
  /**
   * SPARQL projection variable name that this column is bind to.
   */
  variableName?: string;
  /**
   * Custom cell visualization <semantic-link
   *   uri='http://help.metaphacts.com/resource/FrontendTemplating'>template</semantic-link>.
   * Template has access to all projection variables for a single result tuple.
   * **The template MUST have a single HTML root element.**
   */
  cellTemplate?: string;
}

export interface TableColumnConfiguration extends ColumnConfiguration {
  cellComponent?: ComponentClass<CellRendererProps>;
}

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

export type TableProps = TableConfig & ClassAttributes<Table>;

const DEFAULT_ROWS_PER_PAGE = 10;

interface State {
  readonly buffer: KeyedBufferPool<Rdf.Iri, string>;
  readonly griddleConfig?: GriddleConfig;
}

interface ExtendedGriddleConfig extends GriddleConfig {
  columnMetadata: ReadonlyArray<ExtendedColumnMetadata>;
}

interface ExtendedColumnMetadata extends ColumnMetadata {
  readonly variableName: string | undefined;
}

interface RenderingState {
  readonly showLabels: boolean;
  readonly preferchLabels: boolean;
  getLabel(resource: Rdf.Iri): string | undefined;
}

export class Table extends Component<TableProps, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: TableProps, context: any) {
    super(props, context);
    this.state = {
      buffer: new KeyedBufferPool(
        Immutable.Map(),
        this.cancellation,
        keys => getLabels(keys.toArray(), {context: this.context.semanticContext}),
        () => this.forceUpdate()
      )
    };
  }

  componentDidMount() {
    this.setState(state => this.updateStateFromProps(this.props, state));
  }

  componentWillReceiveProps(nextProps: TableProps) {
    this.setState(state => this.updateStateFromProps(nextProps, state));
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private updateStateFromProps(props: TableProps, state: State): State {
    // set default values for `showLabels` and `prefetchLabels`
    let showLabels = true;
    let prefetchLabels = true;

    if (props.layout.isJust) {
      const layout = props.layout.get();
      if (layout.showLabels !== undefined) {
        showLabels = layout.showLabels;
      }
      if (layout.prefetchLabels !== undefined) {
        prefetchLabels = layout.prefetchLabels;
      }
    }

    const renderingState: RenderingState = {
      get showLabels() {
        return showLabels;
      },
      get preferchLabels() {
        return prefetchLabels;
      },
      getLabel: resourceIri => {
        return (showLabels && prefetchLabels) ? state.buffer.result.get(resourceIri) : undefined;
      }
    };

    const griddleConfig = this.buildConfig(props, renderingState);

    if (prefetchLabels) {
      const newTargets = findReferencedResources(griddleConfig, state.buffer.targets);
      state.buffer.load(newTargets);
    }

    return {
      buffer: state.buffer,
      griddleConfig,
    };
  }

  private buildConfig(config: TableProps, renderingState: RenderingState): ExtendedGriddleConfig {
    const paginationProps: CustomPaginationProps = {
      externalCurrentPage: config.currentPage,
      onPageChange: config.onPageChange,
    };

    const baseConfig: Partial<GriddleConfig> = {
      resultsPerPage: config.numberOfDisplayedRows.getOrElse(DEFAULT_ROWS_PER_PAGE),
      showFilter: true,
      useGriddleStyles: false,
      tableClassName: 'table',
      sortAscendingComponent: createElement('span', {className: 'fa fa-sort-alpha-asc'}),
      sortDescendingComponent: createElement('span', {className: 'fa fa-sort-alpha-desc'}),
      useCustomPagerComponent: true,
      customPagerComponent: Pagination,
      customPagerComponentOptions: paginationProps,
      useCustomFilterer: true,
      customFilterer: makeCellFilterer(renderingState),
    };

    let griddleConfig = config.data.fold<ExtendedGriddleConfig>(
      (json: any[]): any =>
        this.getGriddlePropsForFlatDataArray(baseConfig, json, config, renderingState),
      (res: SparqlClient.SparqlSelectResult) =>
        this.getGriddlePropsForSparqlResult(baseConfig, res, config, renderingState)
    );

    // Fix erronous array mutation in Griddle v0.8.2 whn providing customCompareFn with 2 arguments:
    // https://github.com/GriddleGriddle/Griddle/blob/v0.8.2/scripts/griddle.jsx#L578
    makeSortNonMutating(griddleConfig.results as Array<unknown>);

    if (config.layout.isJust) {
      const {options, tupleTemplate} = config.layout.get();
      griddleConfig = {...griddleConfig, ...(options as ExtendedColumnMetadata)};
      if (tupleTemplate.isJust) {
        griddleConfig = this.useCustomLayout(griddleConfig, tupleTemplate.get(), renderingState);
      }
    }

    return griddleConfig;
  }

  public render() {
    return createElement('div',
      {
        className: 'metaphacts-table-widget-holder',
      },
      this.renderTableData()
    );
  }

  private renderTableData() {
    const {buffer, griddleConfig} = this.state;
    if (buffer.error) {
      return createElement(ErrorNotification, {errorMessage: buffer.error});
    } else if (buffer.loading || !griddleConfig) {
      return createElement(Spinner, {});
    } else {
      return createElement(Griddle, griddleConfig);
    }
  }

  private getGriddlePropsForSparqlResult(
    baseConfig: GriddleConfig,
    data: SparqlClient.SparqlSelectResult,
    props: TableProps,
    renderingState: RenderingState
  ): ExtendedGriddleConfig {
    const columnsMetadata = this.buildColumnsMetadata(data.head.vars, props, renderingState);
    return {
      ...baseConfig,
      // push empty literals if binding variable does not exist in binding
      // entry i.e. missing values due to optional
      results: this.prepareSparqlResultData(data, columnsMetadata),
      // workaround for https://github.com/GriddleGriddle/Griddle/issues/114
      columns: _(columnsMetadata).filter('visible').map('columnName').value(),
      columnMetadata: columnsMetadata,
    };
  }

  private getGriddlePropsForFlatDataArray(
    baseConfig: GriddleConfig,
    data: any[],
    props: TableProps,
    renderingState: RenderingState
  ): ExtendedGriddleConfig {
    const heads = _.reduce(data, (union, obj) => _.union(union, Object.keys(obj)), []);
    const columnsMetadata = this.buildColumnsMetadata(heads, props, renderingState);
    return {
      ...baseConfig,
      // push empty literals if binding variable does not exist in binding
      // entry i.e. missing values due to optional
      results: this.prepareFlatData(data, columnsMetadata),
      // workaround for https://github.com/GriddleGriddle/Griddle/issues/114
      columns: _(columnsMetadata).filter('visible').map('columnName').value(),
      columnMetadata: columnsMetadata,
    };
  }

  private useCustomLayout(
    baseConfig: ExtendedGriddleConfig,
    tupleTemplate: string | undefined,
    renderingState: RenderingState
  ): ExtendedGriddleConfig {
    interface CustomRowProps {
      data: SparqlClient.Binding;
      metadataColumns: any[];
    }
    const customRowComponent = class extends Component<CustomRowProps, {}> {
      render() {
        return createElement(TemplateItem, {
          template: {
            source: tupleTemplate !== undefined ? tupleTemplate : 'No Template defined',
            options: this.props.data,
          },
        });
      }
    };
    return {
      ...baseConfig,
      useCustomRowComponent: true,
      customRowComponentClassName: 'griddle-custom-row',
      customRowComponent,
    };
  }

  private prepareFlatData(
    data: any[],
    columns: ReadonlyArray<ExtendedColumnMetadata>
  ): any[] {
    const additionalColumns = this.getAdditionalColumns(columns);
    return data.map(item => {
      for (const column of additionalColumns) {
        this.defineAdditionalColumnProperty(column, item, '');
      }
      return item;
    });
  }

  private prepareSparqlResultData(
    data: SparqlClient.SparqlSelectResult,
    columns: ReadonlyArray<ExtendedColumnMetadata>
  ) {
    const additionalColumns = this.getAdditionalColumns(columns);
    return data.results.bindings.map(binding => {
      for (const column of additionalColumns) {
        this.defineAdditionalColumnProperty(column, binding, undefined);
      }
      return binding;
    });
  }

  private buildColumnsMetadata(
    vars: string[], config: TableProps, renderingState: RenderingState
  ): ExtendedColumnMetadata[] {
    // we show all columns from bindings only when we don't specify any column
    //  configuration in the config
    if (_.isEmpty(config.columnConfiguration)) {
      return this.defaultColumnsMetadata(vars, config, renderingState);
    } else {
      return this.customColumnsMetadata(config, renderingState);
    }
  }

  private defaultColumnsMetadata(
    vars: string[], config: TableProps, renderingState: RenderingState
  ): ExtendedColumnMetadata[] {
    return vars.map((varName: string, index: number): ExtendedColumnMetadata => {
      return {
        displayName: varName,
        columnName: varName,
        variableName: varName,
        visible: true,
        order: index,
        customComponent: this.makeCellTemplateComponent(undefined, renderingState),
        customCompareFn: makeNullableLastComparator(makeCellComparator(renderingState)),
      };
    });
  }

  private customColumnsMetadata(
    config: TableProps, renderingState: RenderingState
  ): ExtendedColumnMetadata[] {
    const ensureUniqueColumnName = makeUniqueColumnNameGenerator();
    return _.map(config.columnConfiguration, (columnConfig, i): ExtendedColumnMetadata => {
      const columnName = columnConfig.variableName === undefined
        ? 'mp-custom-column' : columnConfig.variableName;

      return {
        // generate unique column name if a column with same name already exists,
        // otherwise Griddle won't render this column
        columnName: ensureUniqueColumnName(columnName),
        displayName: columnConfig.displayName,
        variableName: columnConfig.variableName,
        customComponent: this.makeCellComponentClass(columnConfig, renderingState),
        visible: true,
        order: i,
        customCompareFn: makeNullableLastComparator(makeCellComparator(renderingState)),
      };
    });
  }

  private makeCellComponentClass(
    columnConfig: TableColumnConfiguration,
    renderingState: RenderingState
  ) {
    if (columnConfig.cellComponent) {
      return columnConfig.cellComponent;
    } else {
      return this.makeCellTemplateComponent(
        columnConfig.cellTemplate !== undefined ? columnConfig.cellTemplate : undefined,
        renderingState
      );
    }
  }

  private getAdditionalColumns(columns: ReadonlyArray<ExtendedColumnMetadata>) {
    return columns.filter(c => c.columnName !== c.variableName);
  }

  private defineAdditionalColumnProperty(
    column: ExtendedColumnMetadata, item: any, emptyValue: any
  ) {
    if (column.columnName !== column.variableName) {
      if (column.variableName === undefined) {
        item[column.columnName] = emptyValue;
      } else {
        // define a property to return original value for column even
        // if columnName differs from variableName
        Object.defineProperty(item, column.columnName, {
          enumerable: true,
          get: () => item[column.variableName],
        });
      }
    }
  }

  private makeCellTemplateComponent(
    template: string | undefined,
    renderingState: RenderingState
  ): ComponentClass<any> {
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
        } else if (isPrimitiveDatatype(this.props.data)) {
          return createElement('span', {}, this.props.data);
        } else {
          const {showLabels, preferchLabels} = renderingState;
          return createElement(RdfValueDisplay, {
            data: this.props.data,
            label: renderingState.getLabel(this.props.data),
            fetchLabel: showLabels && !preferchLabels,
            fetchContext: this.context.semanticContext,
            showLiteralDatatype,
            linkParams,
            showCopyToClipboardButton,
          });
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

function makeUniqueColumnNameGenerator() {
  const usedNames = new Set<string>();
  return (baseName: string) => {
    let generatedName = baseName;
    let index = 1;
    while (usedNames.has(generatedName)) {
      generatedName = `__${baseName}-${index}`;
      index++;
    }
    usedNames.add(generatedName);
    return generatedName;
  };
}

/**
 * Creates table row filterer based on whether any own object property
 * of a row data item includes query as a substring ignoring case.
 */
function makeCellFilterer(state: { getLabel(resource: Rdf.Iri): string }) {
  return <T = unknown>(items: ReadonlyArray<T>, query: string): T[] => {
    const queryLowercase = query.toLowerCase();
    return items.filter(item => {
      if (typeof item !== 'object') { return false; }
      for (const key in item) {
        if (!Object.hasOwnProperty.call(item, key)) { continue; }
        const value = item[key];
        if (isPrimitiveDatatype(value)) {
          if (String(value).toLowerCase().indexOf(queryLowercase) >= 0) {
            return true;
          }
        } else if (value instanceof Rdf.Node) {
          const label = value.isIri() ? state.getLabel(value) : undefined;
          if (label && label.toLowerCase().indexOf(queryLowercase) >= 0) {
            return true;
          }
          if (value.value.toLowerCase().indexOf(queryLowercase) >= 0) {
            return true;
          }
        }
      }
      return false;
    });
  };
}

/**
 * **This function is exported for tests only**
 */
export const _makeCellFilterer = makeCellFilterer;

/**
 * Creates table cell comparator which allows to sort table data based
 * on target column values. This comparator considers prefetched resource labels (if available)
 * and uses XSD datatype to automatically sort numerical columns.
 */
function makeCellComparator(state: { getLabel(resource: Rdf.Iri): string }) {
  return (a: unknown, b: unknown): number => {
    if (isPrimitiveDatatype(a) && isPrimitiveDatatype(b)) {
      return (
        a < b ? -1 :
        a > b ? 1 :
        0
      );
    } else if (a instanceof Rdf.Node && b instanceof Rdf.Node) {
      return compareRdfNodes(a, b, state);
    } else {
      const aKind = getCellDataKind(a);
      const bKind = getCellDataKind(b);
      return (
        aKind < bKind ? -1 :
        aKind > bKind ? 1 :
        0
      );
    }
  };
}

function makeNullableLastComparator(base: <T>(a: T, b: T) => number) {
  return (a: unknown, b: unknown) => {
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    return (
      aNull && bNull ? 0 :
      aNull ? -1 :
      bNull ? 1 :
      base(a, b)
    );
  };
}

/**
 * **This function is exported for tests only**
 */
export const _makeCellComparator = makeCellComparator;

function compareRdfNodes(
  a: Rdf.Node, b: Rdf.Node, state: { getLabel(resource: Rdf.Iri): string }
): number {
  if (a.isLiteral() && b.isLiteral()) {
    if (xsd.NUMERIC_TYPES.has(a.datatype) && xsd.NUMERIC_TYPES.has(b.datatype)) {
      const aNumeric = Number(a.value);
      const bNumeric = Number(b.value);
      if (!Number.isNaN(aNumeric) && !Number.isNaN(bNumeric)) {
        return (
          aNumeric < bNumeric ? -1 :
          aNumeric > bNumeric ? 1 :
          0
        );
      }
    }
  }

  const aValue = a.isIri() && state.getLabel(a) || a.value;
  const bValue = b.isIri() && state.getLabel(b) || b.value;
  return aValue.localeCompare(bValue);
}

function getCellDataKind(data: unknown): number {
  return (
    isPrimitiveDatatype(data) ? 0 :
    data instanceof Rdf.Node ? 1 :
    /* other kind */ 2
  );
}

const NON_MUTATING_ARRAY_SORT = function <T>(
  this: Array<T>,
  comparator: (a: T, b: T) => number
): Array<T> {
  const clone = [...this];
  clone.sort(comparator);
  makeSortNonMutating(clone);
  return clone;
};

function makeSortNonMutating<T>(arr: Array<T>): void {
  const sort: Array<T>['sort'] = NON_MUTATING_ARRAY_SORT;
  Object.defineProperty(arr, 'sort', {
    enumerable: false,
    value: sort,
  });
}

function findReferencedResources(
  builtConfig: ExtendedGriddleConfig,
  alreadyFetching: Immutable.Set<Rdf.Iri>
) {
  return Immutable.Set<Rdf.Iri>().withMutations(set => {
    for (const item of builtConfig.results) {
      for (const column of builtConfig.columnMetadata) {
        if (!column.variableName) { continue; }
        const columnValue = item[column.variableName];
        if (columnValue instanceof Rdf.Iri && !alreadyFetching.has(columnValue)) {
          set.add(columnValue);
        }
      }
    }
  });
}

class KeyedBufferPool<K, V> {
  private activeCount = 0;
  private _targets: Immutable.Set<K>;
  private _result: Immutable.Map<K, V>;
  private _error: unknown;

  constructor(
    initialValue: Immutable.Map<K, V>,
    private cancellation: Cancellation,
    private onLoad: (keys: Immutable.Set<K>) => Kefir.Property<Immutable.Map<K, V>>,
    private onCompleted: () => void
  ) {
    this._targets = initialValue.keySeq().toSet();
    this._result = initialValue;
  }

  get targets() { return this._targets; }
  get result() { return this._result; }
  get error() { return this._error; }

  get loading() {
    return this.activeCount > 0;
  }

  load(keys: Immutable.Set<K>): void {
    if (keys.size === 0) {
      return;
    }
    this.activeCount++;
    this._targets = this._targets.merge(keys);
    this.cancellation.map(this.onLoad(keys)).observe({
      value: value => {
        this._result = this._result.merge(value);
      },
      error: error => {
        this._error = error;
      },
      end: () => {
        this.activeCount--;
        if (this.activeCount === 0 && !this.cancellation.aborted) {
          this.onCompleted();
        }
      }
    });
  }
}

export default Table;
