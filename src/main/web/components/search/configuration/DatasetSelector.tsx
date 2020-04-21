/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import * as React from 'react';
import ReactSelect, { Options } from 'react-select';
import * as _ from 'lodash';

import { Dataset } from 'platform/components/semantic/search/data/datasets/Model';

export interface DatasetSelectorProps {
  availableDatasets: Array<Dataset>;
  selectedDatasets: Array<Dataset>;
  onDatasetsSelection: (datasets: Array<Dataset>) => void;
  disabled?: boolean;
}

export class DatasetSelector extends React.Component<DatasetSelectorProps, {}> {
  render() {
    return this.props.availableDatasets.length > 0 ? this.datasetSelector() : null;
  }

  componentDidMount() {
    if (_.isEmpty(this.props.selectedDatasets)) {
      this.props.onDatasetsSelection(_.filter(this.props.availableDatasets, (d) => d.isDefault));
    }
  }

  private datasetSelector = () => {
    return (
      <ReactSelect
        disabled={this.props.disabled}
        options={this.datasetsToOptions(this.props.availableDatasets)}
        multi={true}
        value={this.datasetsToOptions(this.props.selectedDatasets)}
        onChange={this.selectDatasets}
        placeholder="Select Datasets"
      />
    );
  };

  private datasetsToOptions = (datasets: Array<Dataset>): Options =>
    _.map(datasets, (dataset) => {
      const alignmentsLabels = _.map(dataset.alignments, (alignment) => alignment.label).join(', ');
      return {
        value: dataset.iri.value,
        label: `${dataset.label} [${alignmentsLabels}]`,
      };
    });

  private selectDatasets = (options: Options) => {
    const { availableDatasets } = this.props;
    this.props.onDatasetsSelection(
      _.map(options, (option) => _.find(availableDatasets, (dataset) => dataset.iri.value === option.value))
    );
  };
}
