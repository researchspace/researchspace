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
import * as classNames from 'classnames';
import * as _ from 'lodash';
import { FormControl, FormGroup } from 'react-bootstrap';

import { YearValue } from 'platform/components/semantic/search/data/search/Model';
import * as styles from './YearInput.scss';

export interface YearInputProps extends React.Props<YearInput> {
  className?: string;
  value?: YearValue;
  isYearValid?: boolean;
  autoFocus?: boolean;
  onChange: (newValue: YearValue) => void;
}

interface State {
  year?: string;
  isYearValid?: 'success' | 'warning' | 'error';
  epoch?: Epoch;
}

export type Epoch = 'AD' | 'BC';
const AD = 'AD';
const BC = 'BC';

export class YearInput extends React.PureComponent<YearInputProps, State> {
  constructor(props, context) {
    super(props, context);
    const isYearValid = this.props.isYearValid;
    this.state = {
      year: props.value ? '' + props.value.year : '',
      isYearValid: isYearValid ? this.booleanToValidState(isYearValid) : undefined,
      epoch: props.value ? props.value.epoch : AD,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.value &&
      this.state.year &&
      !(_.isEqual(this.state.year, nextProps.value.year) && _.isEqual(this.state.epoch, nextProps.value.epoch))
    ) {
      this.setState({
        year: '' + nextProps.value.year,
        epoch: nextProps.value.epoch,
        isYearValid: this.booleanToValidState(nextProps.isYearValid),
      });
    }
  }

  private booleanToValidState = (isValid: boolean) => (isValid ? 'success' : 'error');

  private isValidYear = (year: string): boolean => !_.isNaN(parseInt(year));

  private onYearChange = (event) => {
    const yearText = (event.target as any).value;
    this.setState({
      year: yearText,
      isYearValid: this.booleanToValidState(this.isValidYear(yearText)),
    });
  };

  private onEpochChange = (event) => {
    const eventValue = (event.target as any).value;
    this.setState((state) => ({
      epoch: eventValue,
      isYearValid: this.booleanToValidState(this.isValidYear(state.year)),
    }));
  };

  componentWillUpdate(nextProps, nextState: State) {
    if (nextState.isYearValid === 'success') {
      const { year, epoch } = nextState;
      const newValue = { year: parseInt(year), epoch: epoch };
      if (!_.isEqual(nextProps.value, newValue)) {
        this.props.onChange(newValue);
      }
    }
  }

  render() {
    return (
      <div className={classNames(styles.holder, this.props.className)}>
        <FormGroup validationState={this.state.isYearValid}>
          <FormControl
            className={styles.year}
            value={this.state.year}
            autoFocus={this.props.autoFocus}
            onChange={this.onYearChange}
            type="number"
            min="0"
            placeholder="YYYY"
            required={true}
          />
        </FormGroup>
        <FormGroup validationState={this.state.isYearValid}>
          <FormControl
            className={styles.epoch}
            value={this.state.epoch}
            onChange={this.onEpochChange}
            componentClass="select"
            placeholder="AD/BC"
            required={true}
          >
            <option value={AD}>{AD}</option>
            <option value={BC}>{BC}</option>
          </FormControl>
        </FormGroup>
      </div>
    );
  }
}

export default YearInput;
