/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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
import * as Maybe from 'data.maybe';
import * as classnames from 'classnames';
import * as _ from 'lodash';

import { Alignment, Dataset } from 'platform/components/semantic/search/data/datasets/Model';
import {
  ConfigurationContextTypes, ConfigurationContext,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import { DatasetSelector } from './DatasetSelector';
import { AlignmentSelector } from './AlignmentSelector';

import * as styles from './ConfigurationSelector.scss';

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

interface State {
  isCollapsed: boolean;
}

export class ConfigurationSelector extends React.Component<void, State> {
  static contextTypes = ConfigurationContextTypes;
  static childContextTypes = ConfigurationContextTypes;
  context: ConfigurationContext;

  constructor(props, context) {
    super(props, context);
    this.state = {
      isCollapsed: true,
    };
  }

  render() {
    return this.configHolder();
  }

  private configHolder = () => {
    const {isCollapsed} = this.state;
    return <div className={styles.holder}>
      <span onClick={this.onCollapseExpand}>
        <i className={
          classnames({
            [styles.configExpand]: isCollapsed,
            [styles.configCollapse]: !isCollapsed,
          })
        }/>
        Configure search options
      </span>
      <div className='clearfix'></div>
      {this.state.isCollapsed ? this.viewConfiguration() : this.editConfiguration()}
    </div>;
  }

  private onCollapseExpand = () => this.setState(state => ({isCollapsed: !state.isCollapsed}))

  private viewConfiguration() {
    if (_.isEmpty(this.context.selectedDatasets)) {
      return null;
    } else {
      return <div>
        <div className={styles.viewHolder}>
          <b>Datasets: </b>
          {_.map(this.context.selectedDatasets, dataset => dataset.label).join(', ')}.
          <b> Alignment: </b>
          {this.context.selectedAlignment.map(a => a.label).getOrElse('NONE')}
        </div>
        <div className='clearfix'></div>
      </div>;
    }
  }

  private editConfiguration = () =>
    <div>
      {this.props.children}
      <div className={styles.configurationSelector}>
        <span>Datasets for search:</span>
          <div className={styles.datasetSelector}>
          <DatasetSelector
            disabled={!this.context.isConfigurationEditable}
            availableDatasets={this.context.availableDatasets}
            selectedDatasets={this.context.selectedDatasets}
            onDatasetsSelection={this.selectDatasets}
          />
        </div>
        <div className={styles.alignmentSelector}>
          <AlignmentSelector
            disabled={!this.context.isConfigurationEditable}
            selectedDatasets={this.context.selectedDatasets}
            selectedAlignment={this.context.selectedAlignment}
            onAlignmentSelection={this.context.setSelectedAlignment}
          />
        </div>
      </div>
    </div>;

  private selectDatasets = (datasets: Array<Dataset>) => {
    if (datasets.length < 1) {
      // reset alignment if less then one dataset is selected
      this.context.setSelectedAlignment(Maybe.Nothing<Alignment>());
    }
    this.context.setSelectedDatasets(datasets);
  }
}

export default ConfigurationSelector;
