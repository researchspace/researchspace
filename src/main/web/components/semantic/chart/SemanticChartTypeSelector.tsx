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
import * as React from 'react';
import * as _ from 'lodash';
import { ButtonGroup, Button } from 'react-bootstrap';

import { trigger } from 'platform/api/events';
import { Component, ComponentContext } from 'platform/api/components';
import {
  ComponentToolbarContext,
  ComponentToolbarContextTypes,
} from 'platform/components/persistence/ComponentToolbarApi';
import { ChartType } from './ChartingCommons';
import { ChartTypeSelected } from './ChartEvents';

export interface SemanticChartTypeSelectorConfig {
  /**
   * Adds chart type selector to quickly switch between specified chart types.
   */
  types?: ChartType[];

  /**
   * Default chart type
   */
  default?: ChartType;

  /**
   * CSS style
   */
  style?: any;

  /**
   * CSS class
   */
  className?: string;

  /**
   * ID for issuing component events.
   */
  id?: string;
}

type Props = SemanticChartTypeSelectorConfig;
interface State {
  selectedType: ChartType;
}

const CLASS_NAME = 'semantic-chart';
export class SemanticChartTypeSelector extends Component<Props, State> {
  static contextTypes = { ...Component.contextTypes, ...ComponentToolbarContextTypes };
  context: ComponentContext & ComponentToolbarContext;

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      selectedType: props.default || _.head(props.types),
    };
  }

  static defaultProps: Partial<Props> = {
    types: ['line', 'bar', 'radar', 'pie', 'donut'],
  };

  componentDidMount() {
    this.selectChartType(this.state.selectedType);
  }

  render() {
    return this.renderTypeSelector();
  }

  private renderTypeSelector() {
    return (
      <ButtonGroup style={this.props.style} className={`${CLASS_NAME}__types`}>
        {this.props.types.map((chartType) => (
          <Button
            className={`${CLASS_NAME}__type-button chart-type-${chartType}`}
            key={chartType}
            active={this.state.selectedType === chartType}
            onClick={() => this.selectChartType(chartType)}
          >
            <span className={`${CLASS_NAME}__type-icon`}></span>
            <span className={`${CLASS_NAME}__type-label`}>{chartType}</span>
          </Button>
        ))}
      </ButtonGroup>
    );
  }

  private selectChartType = (selectedType: ChartType) => {
    this.setState({ selectedType });
    this.context.overrideProps({ type: selectedType });
    trigger({ eventType: ChartTypeSelected, source: this.props.id, data: selectedType });
  };
}
export default SemanticChartTypeSelector;
