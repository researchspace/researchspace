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

import { Props, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as PropTypes from 'prop-types';
import * as _ from 'lodash';
import * as Either from 'data.either';
import * as maybe from 'data.maybe';

import { Cancellation } from 'platform/api/async';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component, ComponentProps, ComponentContext } from 'platform/api/components';
import { BuiltInEvents, trigger } from 'platform/api/events';

import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';
import { ControlledPropsHandler } from 'platform/components/utils';
import { ErrorNotification } from 'platform/components/ui/notification';

import { ColumnConfiguration, Table, TableConfig, TableLayout } from './Table';

interface ControlledProps {
  /**
   * In controlled mode sets current page in the table;
   * in uncontrolled mode only sets initial page.
   */
  readonly currentPage?: number;
}

interface TableState {
  data?: SparqlClient.SparqlSelectResult;
  isLoading?: boolean;
  currentPage?: number;
  error?: any;
}

interface Options {
  /**
   * Whether or not to display table filter
   *
   * @default true
   */
  showFilter?: boolean;

  /**
   * Determines if the table heading should be displayed
   *
   * @default true
   */
  showTableHeading?: boolean;

  /**
   * Determines if sorting is enabled
   *
   * @default true
   */
  enableSort?: boolean;
}

/**
 * The simplest table configuration can be used to show all SPARQL result set projection variables.
 * The SPARQL projection variable name is used as column header. IRIs will be rendered as resolvable links using the `<semantic-link>` component or as a simple string otherwise.
 */
interface BaseConfig extends ControlledProps {
  /**
   * SPARQL Select query.
   */
  query: string;

  /**
   * Number of rows to show on the one page
   *
   * @default 10
   */
  numberOfDisplayedRows?: number;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> which is applied when the query returns no results
   */
  noResultTemplate?: string;

  /**
   * various ui options.
   */
  options?: Options;

  /**
   * ID for issuing component events.
   */
  id?: string;

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
   * @default false
   */
  prefetchLabels?: boolean;

  /**
   * Enable displaying datatypes of literals. This option is applicable only to default cell templates.
   * @default false
   */
  showLiteralDatatype?: boolean;

  /**
   * Add parameters to URLs. This option is applicable only to default cell templates.
   */
  linkParams?: {};
}

/**
 * More advanced configuration that can be used to restrict the set of columns to be visualized, to modify the column headings or to provide custom cell visualization templates
 */
interface ColumnConfig extends BaseConfig {
  /**
   * List of columns to display. If specified table shows only columns explicitly specified in the configuration
   */
  columnConfiguration: Array<ColumnConfiguration>;
}

/**
 * The most advanced table configuration that provides the ability to customize the rendering of an entire table row via tuple templates.
 */
interface RowConfig extends BaseConfig {
  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> for the whole table row. Can be used to have visualizations different from the standard, e.g grid of thumbnails.
   * The template has access to all projection variables for a single result tuple.
   *
   * In addition to data from the sparql results cell template has access to current row index with "__semanticTableIndex" property and total table size with "__semanticTableSize" property.
   *
   */
  tupleTemplate: string;
}
function isRowConfig(config: SemanticTableConfig): config is RowConfig {
  return _.has(config, 'tupleTemplate');
}

export type SemanticTableConfig = BaseConfig | ColumnConfig | RowConfig;
export type SemanticTableProps = SemanticTableConfig &
  ControlledPropsHandler<ControlledProps> &
  ComponentProps &
  Props<SemanticTable>;

export class SemanticTable extends Component<SemanticTableProps, TableState> {
  static propTypes: Partial<Record<keyof SemanticTableProps, any>> = {
    ...Component.propTypes,
    onControlledPropChange: PropTypes.func,
  };

  private readonly cancellation = new Cancellation();
  private querying = this.cancellation.derive();

  constructor(props: SemanticTableProps, context: ComponentContext) {
    super(props, context);
    this.state = {
      isLoading: true,
      currentPage: props.currentPage ? props.currentPage : 0,
    };
  }

  private TABLE_REF = 'table';
  refs: { table: Table };

  getSelected() {
    return this.refs[this.TABLE_REF].getSelected();
  }

  public shouldComponentUpdate(nextProps: SemanticTableProps, nextState: TableState) {
    return nextState.isLoading !== this.state.isLoading || !_.isEqual(nextProps, this.props);
  }

  public componentWillReceiveProps(nextProps: SemanticTableProps, context: ComponentContext) {
    if (nextProps.query !== this.props.query) {

      // we need to reset currentPage when we receive new query when component is used in semantic-search.
      this.prepareConfigAndExecuteQuery({...nextProps, currentPage: 0}, context);
    }
  }

  public componentDidMount() {
    this.prepareConfigAndExecuteQuery(this.props, this.context);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  public render() {
    if (this.state.error) {
      return createElement(ErrorNotification, { errorMessage: this.state.error });
    } else {
      return D.div(
        { className: 'semantic-table-holder' },
        this.state.isLoading
          ? createElement(Spinner)
          : this.state.data && !SparqlUtil.isSelectResultEmpty(this.state.data)
          ? this.renderTable()
          : createElement(TemplateItem, { template: { source: this.props.noResultTemplate } })
      );
    }
  }

  private renderTable() {
    let layout: TableLayout = {
      tupleTemplate: maybe.fromNullable(isRowConfig(this.props) ? this.props.tupleTemplate : null),
      options: this.props.options,
      showLabels: this.props.showLabels,
      prefetchLabels: this.props.prefetchLabels,
    };
    layout = this.handleDeprecatedLayout(layout);
    const { onControlledPropChange, ...otherProps } = this.props;
    const controlledProps: Partial<TableConfig> = {
      currentPage: this.state.currentPage,
      onPageChange: onControlledPropChange ? (page) => {
        this.setState({currentPage: page});
        onControlledPropChange({ currentPage: page });
      } : undefined,
    };
    return createElement(Table, {
      ...otherProps,
      ...controlledProps,
      layout: maybe.fromNullable(layout),
      numberOfDisplayedRows: maybe.fromNullable(this.props.numberOfDisplayedRows),
      data: Either.Right<any[], SparqlClient.SparqlSelectResult>(this.state.data),
      ref: this.TABLE_REF,
    });
  }

  private prepareConfigAndExecuteQuery = (props: SemanticTableProps, context: ComponentContext) => {
    this.setState({
      isLoading: true,
      error: undefined,
      currentPage: props.currentPage,
    });
    this.querying = this.cancellation.deriveAndCancel(this.querying);
    const loading = this.querying
      .map(SparqlClient.select(props.query, { context: context.semanticContext }))
      .onValue((res) => this.setState({ data: res, isLoading: false }))
      .onError((error) => this.setState({ isLoading: false, error }))
      .onEnd(() => {
        if (this.props.id) {
          trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
        }
      });
    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: loading,
      });
    }
  };

  private handleDeprecatedLayout(layout: TableLayout): TableLayout {
    if (_.has(this.props, 'layout')) {
      console.warn('layout property in semantic-table is deprecated, please use flat properties instead');
      layout.tupleTemplate = maybe.fromNullable(this.props['layout']['tupleTemplate']);
      layout.options = this.props['layout']['options'];
    }
    return layout;
  }
}

export default SemanticTable;
