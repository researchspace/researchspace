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
 * @author Denis Ostapenko
 */

import * as _ from 'lodash';
import * as moment from 'moment';
import { createFactory, Props, Component } from 'react';
import * as React from 'react';
import { FormControl } from 'react-bootstrap';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { DateValue, DateRange, NumericRange, YearValue } from 'platform/components/semantic/search/data/search/Model';

import { YearInput } from '../../date/YearInput';
import { GraphEvent, FacetSliderGraph } from './FacetSliderGraph';
import * as styles from './FacetSlider.scss';

export type SliderRange = { begin: number; end: number };

interface FacetSliderDateProps extends Props<FacetSliderComponent> {
  kind: 'date-range';
  data: Array<DateRange>;
  value: Data.Maybe<DateRange>;
  actions: {
    toggleFacetValue: (term: DateRange) => void;
  };
}
interface FacetSliderNumericProps extends Props<FacetSliderComponent> {
  kind: 'numeric-range';
  data: Array<NumericRange>;
  value: Data.Maybe<NumericRange>;
  actions: {
    toggleFacetValue: (term: NumericRange) => void;
  };
}
type FacetSliderProps = FacetSliderDateProps | FacetSliderNumericProps;
function isDateProps(props: FacetSliderProps): props is FacetSliderDateProps {
  return props.kind === 'date-range';
}
function isNumericProps(props: FacetSliderProps): props is FacetSliderNumericProps {
  return props.kind === 'numeric-range';
}

const ErrorKinds: {
  OutsideOfRange: 'OutsideOfRange';
  BeginLaterThenEnd: 'BeginLaterThenEnd';
  NoResultsInRange: 'NoResultsInRange';
} = {
  OutsideOfRange: 'OutsideOfRange',
  BeginLaterThenEnd: 'BeginLaterThenEnd',
  NoResultsInRange: 'NoResultsInRange',
};
type ErrorKind =
  | typeof ErrorKinds.OutsideOfRange
  | typeof ErrorKinds.BeginLaterThenEnd
  | typeof ErrorKinds.NoResultsInRange;

interface FacetSliderState {
  min?: number; // Overall min in data scale, used for validation messages
  max?: number; // Overall max in data scale, used for validation messages
  dataMin?: number; // Absolute min from data
  dataMax?: number; // Absolute max from data
  coreMin?: number; // Start of the "core" data range
  coreMax?: number; // End of the "core" data range
  isValidRange?: boolean;
  validationError?: ErrorKind;
  value?: SliderRange; // Current selection in data scale
  events?: GraphEvent[];
}

const PREFIX_DISPLAY_RATIO = 0.05;
const SUFFIX_DISPLAY_RATIO = 0.05;
const CORE_DISPLAY_RATIO = 1.0 - PREFIX_DISPLAY_RATIO - SUFFIX_DISPLAY_RATIO;

export class DateConverter {
  fromNumberFn = (x: number): DateValue => moment({ year: x }).startOf('year');
  dateToYears = (m: DateValue): number => (m === null ? null : m.year() + (m.dayOfYear() - 1) / 366);

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

export class FacetSliderComponent extends Component<FacetSliderProps, FacetSliderState> {
  constructor(props) {
    super(props);
    this.state = _.assign({ isValidRange: true }, this.propsToState(props));
    this.onNewRange = _.debounce(this.onNewRange, 300);
  }

  private propsToState(gotProps: FacetSliderProps) {
    let result: Partial<FacetSliderState> = {};
    getConverter(gotProps, (props, converter) => {
      let events: GraphEvent[] = [];
      for (let entity of props.data) {
        const { begin, end } = converter.toSliderRange(entity);
        const weight = Math.max(0, typeof entity.count === 'number' ? entity.count : 1.5);
        if (begin !== null && end !== null && begin <= end) { // Ensure begin/end are valid
          events.push(new GraphEvent(begin, end, weight));
        }
      }

      if (events.length === 0) {
        // Handle case with no events or invalid event data
        const now = new DateConverter().dateToYears(moment());
        result = {
          min: now -1, max: now + 1, // for validation messages
          dataMin: now - 1, dataMax: now + 1,
          coreMin: now -1, coreMax: now + 1,
          value: { begin: now -1, end: now + 1 },
          events: [],
          isValidRange: true,
        };
        return;
      }
      
      // Assuming events are pre-sorted by begin time as per user confirmation.
      // If not, they should be sorted here: events.sort((a, b) => a.begin - b.begin);
      const dataMin = Math.floor(events[0].begin);
      // For dataMax, we need the max end time from all events.
      const dataMax = Math.ceil(_.max(events.map((event) => event.end)));

      let coreMin = dataMin;
      let coreMax = dataMax;
      const totalWeight = _.sumBy(events, 'weight');
      const outlierThresholdWeight = totalWeight * 0.05; // 5% threshold

      if (totalWeight > 0 && events.length > 1) { // Only attempt to find core if there's weight and multiple events
        // Determine coreMin
        let cumulativeWeightForward = 0;
        for (const event of events) {
          if (cumulativeWeightForward >= outlierThresholdWeight) {
            coreMin = Math.floor(event.begin);
            break;
          }
          cumulativeWeightForward += event.weight;
          if (cumulativeWeightForward >= outlierThresholdWeight && coreMin === dataMin) { // Capture if threshold met by first few items
             coreMin = Math.floor(event.begin);
          }
        }
         if (cumulativeWeightForward < outlierThresholdWeight) { // if all events are within threshold
          coreMin = dataMin;
        }


        // Determine coreMax (iterate backwards conceptually)
        // Create a copy and sort by end time descending for coreMax calculation
        const eventsSortedByEndDesc = [...events].sort((a, b) => b.end - a.end);
        let cumulativeWeightBackward = 0;
        for (const event of eventsSortedByEndDesc) {
           if (cumulativeWeightBackward >= outlierThresholdWeight) {
            coreMax = Math.ceil(event.end);
            break;
          }
          cumulativeWeightBackward += event.weight;
           if (cumulativeWeightBackward >= outlierThresholdWeight && coreMax === dataMax) {
            coreMax = Math.ceil(event.end);
          }
        }
        if (cumulativeWeightBackward < outlierThresholdWeight) {
          coreMax = dataMax;
        }
        
        // Ensure coreMin is not after coreMax
        if (coreMin > coreMax) {
          // This can happen if data is very sparse or concentrated. Fallback to full range.
          coreMin = dataMin;
          coreMax = dataMax;
        }
      }


      const currentSliderValue = props.value
        .map(converter.toSliderRange)
        .getOrElse({ begin: dataMin, end: dataMax });
      
      // Ensure currentSliderValue is within dataMin/dataMax
      const validatedValue = {
        begin: Math.max(dataMin, Math.min(dataMax, currentSliderValue.begin)),
        end: Math.max(dataMin, Math.min(dataMax, currentSliderValue.end)),
      };


      result = {
        min: dataMin, // For validation messages, use overall data range
        max: dataMax, // For validation messages
        dataMin,
        dataMax,
        coreMin,
        coreMax,
        value: validatedValue,
        events,
      };
    });
    return result;
  }

  componentWillReceiveProps(nextProps: FacetSliderProps) {
    this.setState(this.propsToState(nextProps));
  }

  private dataValueToDisplayPosition = (value: number): number => {
    const { dataMin, dataMax, coreMin, coreMax } = this.state;

    if (dataMin === undefined || dataMax === undefined || coreMin === undefined || coreMax === undefined) {
      return 0.5; // Should not happen if state is initialized
    }
    
    if (dataMin >= dataMax) return 0.5; 
    const actualCoreMin = Math.max(dataMin, coreMin);
    const actualCoreMax = Math.min(dataMax, coreMax);
    
    const effectiveCoreMin = (actualCoreMin >= actualCoreMax) ? dataMin : actualCoreMin;
    const effectiveCoreMax = (actualCoreMin >= actualCoreMax) ? dataMax : actualCoreMax;

    const hasPrefixRegion = effectiveCoreMin > dataMin;
    const hasSuffixRegion = effectiveCoreMax < dataMax;

    let currentPrefixRatio = hasPrefixRegion ? PREFIX_DISPLAY_RATIO : 0;
    let currentSuffixRatio = hasSuffixRegion ? SUFFIX_DISPLAY_RATIO : 0;
    let currentCoreRatio = 1.0 - currentPrefixRatio - currentSuffixRatio;

    if (value <= effectiveCoreMin) { 
      if (!hasPrefixRegion) return 0; 
      const prefixRange = effectiveCoreMin - dataMin;
      if (prefixRange <= 0) return 0; 
      return ((value - dataMin) / prefixRange) * currentPrefixRatio;
    } else if (value >= effectiveCoreMax) { 
      if (!hasSuffixRegion) return 1.0; 
      const suffixRange = dataMax - effectiveCoreMax;
      if (suffixRange <= 0) return 1.0;
      return (
        currentPrefixRatio +
        currentCoreRatio +
        ((value - effectiveCoreMax) / suffixRange) * currentSuffixRatio
      );
    } else { 
      const coreRange = effectiveCoreMax - effectiveCoreMin;
      if (coreRange <= 0) { 
        return currentPrefixRatio;
      }
      return (
        currentPrefixRatio +
        ((value - effectiveCoreMin) / coreRange) * currentCoreRatio
      );
    }
  };

  private displayPositionToDataValue = (position: number): number => {
    const { dataMin, dataMax, coreMin, coreMax } = this.state;

    if (dataMin === undefined || dataMax === undefined || coreMin === undefined || coreMax === undefined) {
      return 0; 
    }

    const actualCoreMin = Math.max(dataMin, coreMin);
    const actualCoreMax = Math.min(dataMax, coreMax);
    const effectiveCoreMin = (actualCoreMin >= actualCoreMax) ? dataMin : actualCoreMin;
    const effectiveCoreMax = (actualCoreMin >= actualCoreMax) ? dataMax : actualCoreMax;
    
    const hasPrefixRegion = effectiveCoreMin > dataMin;
    const hasSuffixRegion = effectiveCoreMax < dataMax;

    let currentPrefixRatio = hasPrefixRegion ? PREFIX_DISPLAY_RATIO : 0;
    let currentSuffixRatio = hasSuffixRegion ? SUFFIX_DISPLAY_RATIO : 0;
    let currentCoreRatio = 1.0 - currentPrefixRatio - currentSuffixRatio;

    const coreDisplayStart = currentPrefixRatio;
    const coreDisplayEnd = currentPrefixRatio + currentCoreRatio;

    if (position <= coreDisplayStart) { 
      if (!hasPrefixRegion) return dataMin;
      const prefixRange = effectiveCoreMin - dataMin;
      if (currentPrefixRatio === 0) return dataMin; // Avoid division by zero if ratio is 0
      if (prefixRange <= 0) return dataMin;
      return dataMin + (position / currentPrefixRatio) * prefixRange;
    } else if (position >= coreDisplayEnd) { 
      if (!hasSuffixRegion) return dataMax;
      const suffixRange = dataMax - effectiveCoreMax;
      if (currentSuffixRatio === 0) return dataMax; // Avoid division by zero
      if (suffixRange <= 0) return dataMax;
      return effectiveCoreMax + ((position - coreDisplayEnd) / currentSuffixRatio) * suffixRange;
    } else { 
      const coreRange = effectiveCoreMax - effectiveCoreMin;
      if (currentCoreRatio === 0) return effectiveCoreMin; // Avoid division by zero
      if (coreRange <= 0) return effectiveCoreMin; 
      return effectiveCoreMin + ((position - coreDisplayStart) / currentCoreRatio) * coreRange;
    }
  };

  onNewRange(newRange: SliderRange) {
    const { dataMin, dataMax } = this.state;
    if (dataMin === undefined || dataMax === undefined) return;

    const clampedBegin = Math.max(dataMin, Math.min(dataMax, newRange.begin));
    const clampedEnd = Math.max(dataMin, Math.min(dataMax, newRange.end));
    
    const clampedRange = {
        begin: Math.min(clampedBegin, clampedEnd),
        end: Math.max(clampedBegin, clampedEnd),
    };

    if (this.isRangeValid(clampedRange)) {
      getConverter(this.props, (props, converter) =>
        props.actions.toggleFacetValue(converter.fromSliderRange(clampedRange))
      );
      this.setState({
        isValidRange: true,
      });
    } else {
      let validationError: ErrorKind;
      if (!this.isValidInterval(clampedRange)) {
        validationError = ErrorKinds.BeginLaterThenEnd;
      } else if (!this.isInRange(clampedRange)) {
        validationError = ErrorKinds.OutsideOfRange;
      } else if (!this.hasResultsInRange(clampedRange)) {
        validationError = ErrorKinds.NoResultsInRange;
      }
      this.setState({
        isValidRange: false,
        validationError: validationError,
      });
    }
  }

  render() {
    const { value, isValidRange, dataMin, dataMax, coreMin, coreMax } = this.state;
    const events = this.state.events;
    const { toInputValue } = getConverter(this.props, (props, converter) => converter);

    if (value === undefined || dataMin === undefined || dataMax === undefined || coreMin === undefined || coreMax === undefined) {
      return <div>Loading...</div>;
    }
    
    const displayValueBegin = this.dataValueToDisplayPosition(value.begin);
    const displayValueEnd = this.dataValueToDisplayPosition(value.end);

    return (
      <div>
        <div className={styles.slidergraph}>
          <FacetSliderGraph
            events={events}
            range={value} 
            min={dataMin} 
            max={dataMax} 
            dataMin={dataMin}
            dataMax={dataMax}
            coreMin={coreMin}
            coreMax={coreMax}
          />
          {isValidRange ? null : (
            <div className="has-error">
              <label className="control-label">{this.validationMessage()}</label>
            </div>
          )}
          <Slider
            range
            allowCross={false}
            min={0.0} 
            max={1.0}
            step={0.001} 
            className={styles.slider}
            value={[displayValueBegin, displayValueEnd]}
            onChange={this.onSliderValueChange}
          />
          {this.props.kind === 'numeric-range' ? (
            <div className={styles.range}>
              <FormControl
                value={toInputValue(value.begin)}
                onChange={(e) => {
                  const newValue = (e.target as any).value;
                  this.onBeginChange(newValue);
                }}
              />
              <span>to</span>
              <FormControl
                value={toInputValue(value.end)}
                onChange={(e) => {
                  const newValue = (e.target as any).value;
                  this.onEndChange(newValue);
                }}
              />
            </div>
          ) : (
            <div className={styles.range}>
              <YearInput
                value={toInputValue(value.begin)}
                onChange={this.onBeginChange}
                isYearValid={this.state.isValidRange}
              />
              <span>to</span>
              <YearInput
                value={toInputValue(value.end)}
                onChange={this.onEndChange}
                isYearValid={this.state.isValidRange}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  private onSliderValueChange = (newDisplayValue: number[]) => {
    const { dataMin, dataMax } = this.state;
    if (dataMin === undefined || dataMax === undefined) return;

    const newRangeInDateScale = {
      begin: this.displayPositionToDataValue(newDisplayValue[0]),
      end: this.displayPositionToDataValue(newDisplayValue[1]),
    };
    
    const clampedBegin = Math.max(dataMin, Math.min(dataMax, newRangeInDateScale.begin));
    const clampedEnd = Math.max(dataMin, Math.min(dataMax, newRangeInDateScale.end));
    
    const finalRange = {
        begin: Math.min(clampedBegin, clampedEnd),
        end: Math.max(clampedBegin, clampedEnd),
    };

    this.setState({ value: finalRange });
    this.onNewRange(finalRange);
  };

  private onBeginChange = (newValueFromInput) => {
    getConverter(this.props, (props, converter) => {
      const { dataMin, dataMax, value } = this.state;
      if (dataMin === undefined || dataMax === undefined || value === undefined) return;

      const newBeginValue = converter.fromInputValue(newValueFromInput);
      const clampedNewBegin = Math.max(dataMin, Math.min(dataMax, newBeginValue));
      
      const newRange = {
        begin: clampedNewBegin,
        end: value.end, 
      };
      this.setState({ value: newRange });
      this.onNewRange(newRange);
    });
  };

  private onEndChange = (newValueFromInput) => {
    getConverter(this.props, (props, converter) => {
      const { dataMin, dataMax, value } = this.state;
      if (dataMin === undefined || dataMax === undefined || value === undefined) return;

      const newEndValue = converter.fromInputValue(newValueFromInput);
      const clampedNewEnd = Math.max(dataMin, Math.min(dataMax, newEndValue));

      const newRange = {
        begin: value.begin,
        end: clampedNewEnd,
      };
      this.setState({ value: newRange });
      this.onNewRange(newRange);
    });
  };

  private isRangeValid = (range: SliderRange): boolean =>
    this.isValidInterval(range) && this.isInRange(range) && this.hasResultsInRange(range);

  private isValidInterval = (range: SliderRange): boolean => range.begin <= range.end;

  private isInRange = (range: SliderRange): boolean => {
    const { dataMin, dataMax } = this.state;
    if (dataMin === undefined || dataMax === undefined) return false;
    return range.begin >= dataMin && range.end <= dataMax;
  }

  private hasResultsInRange = (range: SliderRange): boolean =>
    _.some(this.state.events, (event) => event.begin <= range.end && event.end >= range.begin);

  private validationMessage = (): string => {
    const { toStringFn } = getConverter(this.props, (props, converter) => converter);
    const { dataMin, dataMax } = this.state; // Use dataMin/dataMax for the message
    if (dataMin === undefined || dataMax === undefined) return "";

    switch (this.state.validationError) {
      case ErrorKinds.OutsideOfRange:
        return `Available range is ${toStringFn(dataMin)} - ${toStringFn(dataMax)}`;
      case ErrorKinds.BeginLaterThenEnd:
        return 'Begin should not be later than end';
      case ErrorKinds.NoResultsInRange:
        return 'No results in chosen range';
      default:
        return '';
    }
  };
}

export const FacetSlider = createFactory(FacetSliderComponent);
export default FacetSlider;
