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
import * as moment from 'moment';
import { FormControl, FormGroup } from 'react-bootstrap';
import * as _ from 'lodash';

import * as styles from './SimpleDateInput.scss';

export interface SimpleDateInputProps extends React.Props<SimpleDateInput> {
  className?: string;
  onSelected: (date: moment.Moment) => void;
  autoFocus?: boolean;
}

interface State {
  day?: string;
  dayIsValid?: 'success' | 'warning' | 'error';
  month?: string;
  monthIsValid?: 'success' | 'warning' | 'error';
  year?: string;
  yearIsValid?: 'success' | 'warning' | 'error';
}

export class SimpleDateInput extends React.PureComponent<SimpleDateInputProps, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      day: '',
      dayIsValid: undefined,
      month: '',
      monthIsValid: undefined,
      year: '',
      yearIsValid: undefined,
    };
  }

  render() {
    return (
      <div className={styles.holder}>
        <FormGroup validationState={this.state.dayIsValid}>
          <FormControl
            className={classNames('form-control', styles.day)}
            autoFocus={this.props.autoFocus}
            value={this.state.day}
            onChange={this.onDayChange}
            type="number"
            min="1"
            max="31"
            placeholder="DD"
            required={true}
          />
        </FormGroup>
        <FormGroup validationState={this.state.monthIsValid}>
          <FormControl
            className={classNames('form-control', styles.month)}
            value={this.state.month}
            onChange={this.onMonthChange}
            type="number"
            min="1"
            max="12"
            placeholder="MM"
            required={true}
          />
        </FormGroup>
        <FormGroup validationState={this.state.yearIsValid}>
          <FormControl
            className={classNames('form-control', styles.year)}
            value={this.state.year}
            onChange={this.onYearChange}
            type="number"
            placeholder="YYYY"
            required={true}
          />
        </FormGroup>
      </div>
    );
  }

  componentWillUpdate(nextProps, nextState: State) {
    this.triggerOnSelected(nextState);
  }

  private onDayChange = (event: React.FormEvent<FormControl>) => {
    const value = (event.target as any).value;
    if (this.state.day !== value) {
      const number = parseInt(value);
      this.setState({
        day: value,
        dayIsValid: _.isNaN(number) || number < 1 || number > 31 ? 'error' : 'success',
      });
    }
  };

  private onMonthChange = (event: React.FormEvent<FormControl>) => {
    this.setState({ month: (event.target as any).value });
  };

  private onYearChange = (event: React.FormEvent<FormControl>) => {
    this.setState({ year: (event.target as any).value });
  };

  private triggerOnSelected = (state: State) => {
    const { day, month, year } = state;
    const isFullDate = !_.isEmpty(day) && !_.isEmpty(month) && !_.isEmpty(year);
    if (isFullDate) {
      const zeroIndexedMonth = parseInt(month) - 1; // months in MomentJS are zero indexed
      this.props.onSelected(moment({ day: day, month: zeroIndexedMonth, year: year }));
    }
  };
}

export default SimpleDateInput;
