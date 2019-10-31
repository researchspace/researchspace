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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import * as React from 'react';
import * as maybe from 'data.maybe';
import * as classNames from 'classnames';
import ReactSelect from 'react-select';
import { FormControl, FormGroup } from 'react-bootstrap';
import * as _ from 'lodash';

import {
  TemporalDisjunct, DateDisjunctValue, TemporalDisjunctT, DateRange, DateDeviation,
  YearValue, YearRange, YearDeviation, matchTemporalDisjunct, TemporalDisjunctKinds,
} from 'platform/components/semantic/search/data/search/Model';
import { SimpleDateInput } from './SimpleDateInput';
import { YearInput } from './YearInput';
import * as styles from './DateFormatSelector.scss';

interface State {
  showSelectorDropdown?: boolean
  dateFormat?: Data.Maybe<TemporalDisjunctT>
  value?: Data.Maybe<DateDisjunctValue>
}

export interface DateSelectorValue {
  dateFormat?: TemporalDisjunctT
  value?: DateDisjunctValue
}

export interface DateFormatSelectorProps {
  onSelect: (value: DateSelectorValue) => void
  onOpen?: () => void;
  onChange?: (value: TemporalDisjunctT) => void;
}

export class DateFormatSelectorComponent extends React.Component<DateFormatSelectorProps, State> {
  private initialState = {
    showSelectorDropdown: false,
    dateFormat: maybe.Nothing<TemporalDisjunctT>(),
    value: maybe.Nothing<DateDisjunctValue>(),
  };

  constructor(props) {
    super(props);
    this.state = this.initialState;
  }

  render() {
    return <div className={styles.holder}>
      {this.dateSelectorDropdown()}
      {this.state.dateFormat.map(dateFormat => this.showDateInput(dateFormat)).getOrElse(<span />)}
    </div>;
  }

  private showDateInput = (dateFormat: TemporalDisjunctT) =>
    <div className={styles.inputHolder}>
      {this.dateInput({kind: dateFormat} as any)}
      <button className={classNames('btn', 'btn-primary')} onClick={this.onSelect}>Select</button>
    </div>;

  private onSelect = () => {
    this.props.onSelect({
      dateFormat: this.state.dateFormat.get(),
      value: this.state.value.get(),
    });
  }

  private dateInput(disjunct: TemporalDisjunct): Array<React.ReactElement<any>> {
    return matchTemporalDisjunct({
      Date: this.simpleDate,
      DateRange: this.dateRange,
      DateDeviation: this.dateDeviation,
      Year: this.year,
      YearRange: this.yearRange,
      YearDeviation: this.yearDeviation,
    })(disjunct);
  }

  private simpleDate = () => [<SimpleDateInput autoFocus={true} onSelected={this.setSimpleDate}/>];
  private setSimpleDate = (date: moment.Moment) => this.setState({value: maybe.Just(date)});

  private dateRange = () => [
    <SimpleDateInput key='date-range-begin' autoFocus={true}
                     onSelected={this.setDateRangeBegin}/>,
    <span className={styles.dateSeparator}>to</span>,
    <SimpleDateInput key='date-range-end' onSelected={this.setDateRangeEnd}/>,
  ];

  private setDateRangeBegin = (date: moment.Moment) =>
    this.setState(
      state => ({
        value: maybe.Just({
          begin: date,
          end: state.value.map((v: DateRange)  => v.end).getOrElse(null),
        }),
      })
    );

  private setDateRangeEnd = (date: moment.Moment) =>
    this.setState(
      state => ({
        value: maybe.Just({
          begin: state.value.map((v: DateRange)  => v.begin).getOrElse(null),
          end: date,
        }),
      })
    );

  private dateDeviation = () => [
    <SimpleDateInput key='date-deviation-date'
                     autoFocus={true} onSelected={this.setDateDeviationDate} />,
    <span className={styles.dateSeparator}>±</span>,
    <FormGroup>
      <FormControl key='date-deviation' type='number' className={styles.deviationInput}
                   placeholder='Days' required onChange={this.setDateDeviation}
                   value={
                     this.state.value.map((v: DateDeviation) => v.deviation).getOrElse(undefined)
                   }
      />
    </FormGroup>,
  ];
  private setDateDeviationDate = (date: moment.Moment) =>
    this.setState(
      state => ({
        value: maybe.Just({
          date: date,
          deviation: state.value.map((v: DateDeviation)  => v.deviation).getOrElse(null),
        }),
      })
    );
  private setDateDeviation = (event: any) => {
    const value = event.target.value;
    this.setState(
      state => ({
        value: maybe.Just({
          date: state.value.map((v: DateDeviation)  => v.date).getOrElse(null),
          deviation: value,
        }),
      })
    );
  }

  private year = () => [<YearInput key='year' autoFocus={true} onChange={this.setYear} />];
  private setYear = (year: YearValue) =>
    this.setState({
      value: maybe.Just(year),
    });

  private yearRange = () => [
    <YearInput key='year-range-begin' autoFocus={true} onChange={this.setYearRangeBegin} />,
    <span className={styles.dateSeparator}>to</span>,
    <YearInput key='year-range-end' onChange={this.setYearRangeEnd} />,
  ];
  private setYearRangeBegin = (year: YearValue) =>
    this.setState(
      state => ({
        value: maybe.Just({
          begin: year,
          end: state.value.map((v: YearRange)  => v.end).getOrElse(null),
        }),
      })
    );
  private setYearRangeEnd = (year: YearValue) =>
    this.setState(
      state => ({
        value: maybe.Just({
          begin: state.value.map((v: YearRange)  => v.begin).getOrElse(null),
          end: year,
        }),
      })
    );

  private yearDeviation = () => [
    <YearInput key='year-deviation-year' autoFocus={true} onChange={this.setYearDeviationYear} />,
    <span className={styles.dateSeparator}>±</span>,
    <FormGroup>
      <FormControl key='year-deviation' type='number' className={styles.deviationInput}
                   placeholder='Years' required
                   value={
                     this.state.value.map((v: YearDeviation) => v.deviation).getOrElse(undefined)
                   }
                   onChange={this.setYearDeviation} />
    </FormGroup>,
  ];
  private setYearDeviationYear = (year: YearValue) =>
    this.setState(
      state => ({
        value: maybe.Just({
          year: year,
          deviation: state.value.map((v: YearDeviation)  => v.deviation).getOrElse(null),
        }),
      })
    );
  private setYearDeviation = (event: any) => {
    const value = event.target.value;
    this.setState(
      state => ({
        value: maybe.Just({
          year: state.value.map((v: YearDeviation)  => v.year).getOrElse(null),
          deviation: value,
        }),
      })
    );
  }

  private dateSelectorDropdown = () => {
    const options = _.keys(TemporalDisjunctKinds).map(v => ({value: v, label: v}));
    return <ReactSelect className={classNames(styles.dateFormatSelect)}
                        options={options}
                        value={this.state.dateFormat.getOrElse(undefined)}
                        clearable={false}
                        onOpen={() => {
                          if (this.props.onOpen) {
                            this.props.onOpen();
                          }
                        }}
                        onChange={this.selectDateFormat.bind(this)}
                        optionRenderer={this.dateSelectorOptions}
                        valueRenderer={this.dateSelectorOptions}
                        placeholder='Select Date or Range Type'
    />;
  }

  private selectDateFormat(value: {value: TemporalDisjunctT}) {
    this.setState(_.assign({}, this.initialState, {dateFormat: maybe.Just(value.value)}));
    if (this.props.onChange) {
      this.props.onChange(value.value);
    }
  }

  private dateSelectorOptions(option: {value: TemporalDisjunctT}) {
    const simpleDate =
      <div>
        <span className={styles.dateFormatSelect__ddMmYyyy}>DD</span>
        <span className={styles.dateFormatSelect__ddMmYyyy}>MM</span>
        <span className={styles.dateFormatSelect__ddMmYyyy}>YYYY</span>
      </div>;

    const yearInput = <span className={styles.dateFormatSelect__yyyyAcBc}>year</span>;

    const disjunct = {kind: option.value} as any;
    return matchTemporalDisjunct({
      Date: () =>
        <div className={styles.dateFormatSelect__option}>
          {simpleDate}
        </div>,
      DateRange: () =>
        <div className={styles.dateFormatSelect__option}>
          {simpleDate}
          <span className={styles.dateSeparator}>to</span>
          {simpleDate}
        </div>,
      DateDeviation: () =>
        <div className={styles.dateFormatSelect__option}>
          {simpleDate}
          <span className={styles.dateSeparator}>±</span>
          <span className={styles.dateFormatSelectDdMmYyyyDateDeviation}>days</span>
        </div>,
      Year: () => <div className={styles.dateFormatSelect__option}>{yearInput}</div>,
      YearRange : () =>
        <div className={styles.dateFormatSelect__option}>
          {yearInput}
          <span className={styles.dateSeparator}>to</span>
          {yearInput}
        </div>,
      YearDeviation: () =>
        <div className={styles.dateFormatSelect__option}>
          {yearInput}
          <span className={styles.dateSeparator}>±</span>
          <span className={styles.dateFormatSelectDdMmYyyyYearDeviation}>years</span>
        </div>,
    })(disjunct);
  }
}

export default DateFormatSelectorComponent;
