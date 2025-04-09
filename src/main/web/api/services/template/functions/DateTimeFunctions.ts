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

import * as moment from 'moment';

export const DateTimeFunctions = {
  /**
   * Date-time formating function. Default format is
   * "Month name, day of month, year  - e.g September 4 1986"
   * It is possible to use any format supported by moment.js,
   * see http://momentjs.com/docs/#/displaying/ for more details.
   */
  dateTimeFormat: function (dateTime: any, format: any, sourceFormat: any) {
    if (dateTime === undefined || dateTime === null) {
      return '';
    }
    if (typeof format !== 'string') {
      format = 'LL';
    }
    if (typeof sourceFormat !== 'string') {
      sourceFormat = undefined;
    }
    return moment(dateTime, sourceFormat).format(format);
  },
  /**
   * Returns the current system time. Default format is "DD.MM.YYYY HH:mm:ss.SSS"
   * @example
   * {{currentDateTime 'MM-DD-YYYY'}}
   */
  currentDateTime: function (format: any) {
    if (typeof format !== 'string') {
      format = 'DD.MM.YYYY HH:mm:ss.SSS';
    }
    return moment().format(format);
  },

  /**
   * Formats a date or date range string to show years only.
   * If input is a single date, returns just that year.
   * If input is a date range "startDate#endDate", checks if both dates are in the same year.
   * If they are, returns only that year, otherwise returns "startYear-endYear".
   * If the input can't be parsed as a date, returns the original string.
   * @example
   * {{dateRangeFormat "1472-01-01T00:00:00#1519-12-31T23:59:59"}} // returns "1472-1519"
   * {{dateRangeFormat "1472-01-01T00:00:00#1472-12-31T23:59:59"}} // returns "1472"
   * {{dateRangeFormat "1472-01-01T00:00:00"}} // returns "1472"
   * {{dateRangeFormat "1979/ ca."}} // returns "1979/ ca."
   */
  dateRangeFormat: function(dateString: string): string {
    if (!dateString || typeof dateString !== 'string') {
      return '';
    }
    
    if (dateString.includes('#')) {
      const [startDateStr, endDateStr] = dateString.split('#');
      if (!startDateStr || !endDateStr) {
        return dateString;
      }
      
      const startMoment = moment(startDateStr);
      const endMoment = moment(endDateStr);
      
      if (!startMoment.isValid() || !endMoment.isValid()) {
        return dateString;
      }
      
      const startYear = startMoment.year();
      const endYear = endMoment.year();
      
      if (startYear === endYear) {
        return startYear.toString();
      } else {
        return `${startYear}-${endYear}`;
      }
    } else {
      // Single date case
      const dateMoment = moment(dateString);
      if (dateMoment.isValid()) {
        return dateMoment.year().toString();
      } else {
        return dateString;
      }
    }
  }
};
