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
 * @author Denis Ostapenko
 */

import * as _ from 'lodash';
import * as moment from 'moment';
import { createFactory, Props, Component } from 'react';
import * as React from 'react';
import {FormControl} from 'react-bootstrap';
import { Range as Slider } from 'rc-slider';
import 'rc-slider/assets/index.css';

import {
  DateValue, DateRange, NumericRange, YearValue,
} from 'platform/components/semantic/search/data/search/Model';

import { YearInput } from '../../date/YearInput';
import { GraphEvent, FacetSliderGraph } from './FacetSliderGraph';
import * as styles from './FacetSlider.scss';


export type SliderRange = {begin: number, end: number};

interface FacetSliderDateProps extends Props<FacetSliderComponent> {
  kind: 'date-range'
  data: Array<DateRange>
  value: Data.Maybe<DateRange>
  actions: {
    toggleFacetValue: (term: DateRange) => void
  }
}
interface FacetSliderNumericProps extends Props<FacetSliderComponent> {
  kind: 'numeric-range'
  data: Array<NumericRange>
  value: Data.Maybe<NumericRange>
  actions: {
    toggleFacetValue: (term: NumericRange) => void
  }
}
type FacetSliderProps = FacetSliderDateProps | FacetSliderNumericProps;
function isDateProps(props: FacetSliderProps): props is FacetSliderDateProps {
  return props.kind === 'date-range';
}
function isNumericProps(props: FacetSliderProps): props is FacetSliderNumericProps {
  return props.kind === 'numeric-range';
}

const ErrorKinds: {
  OutsideOfRange: 'OutsideOfRange'
  BeginLaterThenEnd: 'BeginLaterThenEnd'
  NoResultsInRange: 'NoResultsInRange'
} = {
  OutsideOfRange: 'OutsideOfRange',
  BeginLaterThenEnd: 'BeginLaterThenEnd',
  NoResultsInRange: 'NoResultsInRange',
};
type ErrorKind =
  typeof ErrorKinds.OutsideOfRange |
  typeof ErrorKinds.BeginLaterThenEnd |
  typeof ErrorKinds.NoResultsInRange;

interface FacetSliderState {
  min?: number
  max?: number
  isValidRange?: boolean
  validationError?: ErrorKind
  value?: SliderRange
  events?: GraphEvent[]
}


export class DateConverter {
  fromNumberFn = (x: number): DateValue => moment({year: x}).startOf('year');
  dateToYears = (m: DateValue): number => m === null ? null : m.year() + (m.dayOfYear() - 1) / 366;

  toStringFn = (year: number) => `${Math.abs(year)} ${year >= 0 ? 'AD' : 'BC'}`;
  toSliderRange = (dateRange: DateRange): SliderRange => {
    return {
      begin: this.dateToYears(dateRange.begin),
      end: this.dateToYears(dateRange.end),
    };
  };
  fromSliderRange = (range: SliderRange): DateRange => {
    return {
      begin: this.fromNumberFn(range.begin),
      end: this.fromNumberFn(range.end),
    };
  };
  toInputValue = (num: number): YearValue => {
    return {
      epoch: num >= 0 ? 'AD' : 'BC',
      year: Math.abs(num),
    };
  };
  fromInputValue = (yearValue: YearValue): number => {
    const { epoch, year } = yearValue;
    return year * (epoch === 'AD' ? 1 : -1);
  };
}

export class NumericConverter {
  toStringFn = (num: number): string => '' + num;
  toSliderRange = (numericRange: NumericRange): SliderRange => numericRange;
  fromSliderRange = (range: SliderRange): NumericRange => range;
  toInputValue = (num: number): string => '' + num;
  fromInputValue = (value: string): number => parseFloat(value);
}

// Trick to avoid union types in kind-related code blocks
function getConverter(props, fn): any {
  if (isDateProps(props)) {
    return fn(props, new DateConverter());
  } else if (isNumericProps(props)) {
    return fn(props, new NumericConverter());
  }
}


interface CustomHandleProps {
  offset?: number
  value?: number
  toStringFn: (number) => string
}
class CustomHandle extends Component<CustomHandleProps, {}> {
  render() {
    return <div className={styles.handle} style={{left: this.props.offset + '%'}}>
      {this.props.toStringFn(this.props.value)}
    </div>;
  }
}

export class FacetSliderComponent extends Component<FacetSliderProps, FacetSliderState> {
  constructor(props) {
    super(props);
    this.state = _.assign({isValidRange: true}, this.propsToState(props));
    this.onNewRange = _.debounce(this.onNewRange, 500);
  }

  private propsToState(gotProps: FacetSliderProps) {
    let result = {};
    getConverter(gotProps, (props, converter) => {
      let events = [];
      for (let entity of props.data) {
        const {begin, end} = converter.toSliderRange(entity);
        const weight = 1.0;
        if (begin && end) {
          events.push(new GraphEvent(begin, end, weight));
        }
      }
      const minValue = Math.floor(_.min(events.map(event => event.begin)));
      const maxValue = Math.ceil(_.max(events.map(event => event.end)));
      const value = props.value.map(converter.toSliderRange).getOrElse({begin: minValue, end: maxValue});
      result = {min: minValue, max: maxValue, value: value, events: events};
    });
    return result;
  }

  componentWillReceiveProps(nextProps: FacetSliderProps) {
    this.setState(this.propsToState(nextProps));
  }

  onNewRange(newRange: SliderRange) {
    if (this.isRangeValid(newRange)) {
      getConverter(this.props, (props, converter) =>
        props.actions.toggleFacetValue(converter.fromSliderRange(newRange))
      );
      this.setState({
        isValidRange: true,
      });
    } else {
      let validationError: ErrorKind;
      if (!this.isValidInterval(newRange)) {
        validationError = ErrorKinds.BeginLaterThenEnd;
      } else if (!this.isInRange(newRange)) {
        validationError = ErrorKinds.OutsideOfRange;
      } else if (!this.hasResultsInRange(newRange)) {
        validationError = ErrorKinds.NoResultsInRange;
      }
      this.setState({
        isValidRange: false,
        validationError: validationError,
      });
    }
  }

  render() {
    const { min, max, value, isValidRange } = this.state;
    const events = this.state.events;
    const {toStringFn, toInputValue} = getConverter(this.props, (props, converter) => converter);
    return <div>
      <div className={styles.slidergraph}>
        <FacetSliderGraph events={events} range={value} min={this.state.min} max={this.state.max} />
        {isValidRange ? null :
          <div className='has-error'>
            <label className='control-label'>{this.validationMessage()}</label>
          </div>
        }
        <Slider
          allowCross={false} min={min} max={max} className={styles.slider}
          value={[value.begin, value.end]}
          handle={props => <CustomHandle {...props} toStringFn={toStringFn} />}
          onChange={this.onSliderValueChange}
        />
        {this.props.kind === 'numeric-range' ?
          <div className={styles.range}>
            <FormControl value={toInputValue(value.begin)} onChange={(e) => {
              const newValue = (e.target as any).value;
              this.onBeginChange(newValue);
            }}/>
            <span>to</span>
            <FormControl value={toInputValue(value.end)} onChange={(e) => {
              const newValue = (e.target as any).value;
              this.onEndChange(newValue);
            }}/>
          </div>
          :
          <div className={styles.range}>
            <YearInput value={toInputValue(value.begin)} onChange={this.onBeginChange}
                       isYearValid={this.state.isValidRange}
            />
            <span>to</span>
            <YearInput value={toInputValue(value.end)} onChange={this.onEndChange}
                       isYearValid={this.state.isValidRange}
            />
          </div>
        }
      </div>
    </div>;
  }

  private onSliderValueChange = (value: number[]) => {
    const newRange = {begin: value[0], end: value[1]};
    this.setState({value: newRange});
    this.onNewRange(newRange);
  }

  private onBeginChange = (newValue) => {
    getConverter(this.props, (props, converter) => {
      const newRange = {
        begin: converter.fromInputValue(newValue),
        end: this.state.value ? this.state.value.end : null,
      };
      this.setState({value: newRange});
      this.onNewRange(newRange);
    });
  }
  private onEndChange = (newValue) => {
    getConverter(this.props, (props, converter) => {
      const newRange = {
        begin: this.state.value ? this.state.value.begin : null,
        end: converter.fromInputValue(newValue),
      };
      this.setState({value: newRange});
      this.onNewRange(newRange);
    });
  }

  private isRangeValid = (range: SliderRange): boolean =>
    this.isValidInterval(range) && this.isInRange(range) && this.hasResultsInRange(range);

  private isValidInterval = (range: SliderRange): boolean =>
    range.begin <= range.end;

  private isInRange = (range: SliderRange): boolean =>
    range.begin >= this.state.min && range.end <= this.state.max;

  private hasResultsInRange = (range: SliderRange): boolean =>
    _.some(this.state.events, event => event.begin <= range.end && event.end >= range.begin);

  private validationMessage = (): string => {
    const {toStringFn} = getConverter(this.props, (props, converter) => converter);
    const { min, max } = this.state;
    switch (this.state.validationError) {
      case ErrorKinds.OutsideOfRange:
        return `Available range is ${toStringFn(min)} - ${toStringFn(max)}`;
      case ErrorKinds.BeginLaterThenEnd:
        return 'Begin should not be later than end';
      case ErrorKinds.NoResultsInRange:
        return 'No results in chosen range';
    }
  }
}

export const FacetSlider = createFactory(FacetSliderComponent);
export default FacetSlider;
