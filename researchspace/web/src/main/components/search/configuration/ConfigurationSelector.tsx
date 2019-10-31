/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
  SemanticSearchContext, ConfigurationContext
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import { DatasetSelector } from './DatasetSelector';
import { AlignmentSelector } from './AlignmentSelector';

import * as styles from './ConfigurationSelector.scss';

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */
export class ConfigurationSelector extends React.Component {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {context => <ConfigurationSelectorInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps {
  context: ConfigurationContext;
}

interface State {
  isCollapsed: boolean;
}

class ConfigurationSelectorInner extends React.Component<InnerProps, State> {
  constructor(props: InnerProps) {
    super(props);
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

  private onCollapseExpand = () => this.setState(state => ({isCollapsed: !state.isCollapsed}));

  private viewConfiguration() {
    const {context} = this.props;
    if (_.isEmpty(context.selectedDatasets)) {
      return null;
    } else {
      return <div>
        <div className={styles.viewHolder}>
          <b>Datasets: </b>
          {_.map(context.selectedDatasets, dataset => dataset.label).join(', ')}.
          <b> Alignment: </b>
          {context.selectedAlignment.map(a => a.label).getOrElse('NONE')}
        </div>
        <div className='clearfix'></div>
      </div>;
    }
  }

  private editConfiguration = () => {
    const {context} = this.props;
    return (
      <div>
        {this.props.children}
        <div className={styles.configurationSelector}>
          <span>Datasets for search:</span>
            <div className={styles.datasetSelector}>
            <DatasetSelector
              disabled={!context.isConfigurationEditable}
              availableDatasets={context.availableDatasets}
              selectedDatasets={context.selectedDatasets}
              onDatasetsSelection={this.selectDatasets}
            />
          </div>
          <div className={styles.alignmentSelector}>
            <AlignmentSelector
              disabled={!context.isConfigurationEditable}
              selectedDatasets={context.selectedDatasets}
              selectedAlignment={context.selectedAlignment}
              onAlignmentSelection={context.setSelectedAlignment}
            />
          </div>
        </div>
      </div>
    );
  }

  private selectDatasets = (datasets: Array<Dataset>) => {
    const {context} = this.props;
    if (datasets.length < 1) {
      // reset alignment if less then one dataset is selected
      context.setSelectedAlignment(Maybe.Nothing<Alignment>());
    }
    context.setSelectedDatasets(datasets);
  }
}

export default ConfigurationSelector;
