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
import ReactSelect, { Option, Options } from 'react-select';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';

import { Alignment, Dataset } from 'platform/components/semantic/search/data/datasets/Model';

export interface AlignmentSelectorProps {
  selectedDatasets: Array<Dataset>;
  selectedAlignment: Data.Maybe<Alignment>;
  onAlignmentSelection: (alignment: Data.Maybe<Alignment>) => void;
  disabled?: boolean;
}

interface State {
  alignments: Array<Alignment>;
}

export class AlignmentSelector extends React.Component<AlignmentSelectorProps, State> {
  constructor(props: AlignmentSelectorProps, context) {
    super(props, context);
    this.state = {
      alignments: this.alignmentsForDatasets(props.selectedDatasets),
    };
  }

  componentWillReceiveProps(props: AlignmentSelectorProps) {
    this.setState({
      alignments: this.alignmentsForDatasets(props.selectedDatasets),
    });
  }

  render() {
    return this.props.selectedDatasets.length > 0 ? this.alignmentSelector() : null;
  }

  private alignmentsForDatasets = (datasets: Array<Dataset>): Array<Alignment> => {
    const xs = _.map(datasets, (dataset) => dataset.alignments || []);
    // TODO typings for intersectionWith are not correct
    const intersectionWith = _.intersectionWith as any;
    return intersectionWith(...xs, (a1: Alignment, a2: Alignment) => a1.iri.equals(a2.iri));
  };

  private alignmentSelector = () => {
    return (
      <ReactSelect
        disabled={this.props.disabled}
        options={this.alignmentsToOptions(this.state.alignments)}
        multi={true}
        value={this.props.selectedAlignment.map(this.alignmentToOption).getOrElse(null)}
        onChange={this.selectAlignment}
        placeholder="Select Alignment"
      />
    );
  };

  private alignmentsToOptions = (alignments: Array<Alignment>): Options => _.map(alignments, this.alignmentToOption);

  private alignmentToOption = (alignment: Alignment): Option<string> => ({
    value: alignment.iri.value,
    label: alignment.label,
  });

  private selectAlignment = (option: ReadonlyArray<Option<string>>) => {
    if (option.length !== 0) {
      this.props.onAlignmentSelection(
        Maybe.Just(_.find(this.state.alignments, (selection) => selection.iri.value === option[0].value))
      );
    } else {
      this.props.onAlignmentSelection(Maybe.Nothing<Alignment>());
    }
  };
}
