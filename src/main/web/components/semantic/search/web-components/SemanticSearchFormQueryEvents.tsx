/**
 * ResearchSpace
 *  Copyright (C) 2023, Kartography CIC
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

import { EventMaker } from 'platform/api/events';

export interface SemanticSearchFormQueryEventData {
  /**
   * Trigger when semantic search forum query has been executed
   */
  'SemanticSearchFormQuery.Executed': { }
}
const event: EventMaker<SemanticSearchFormQueryEventData> = EventMaker;

export const SemanticSearchFormQueryExecuted = event('SemanticSearchFormQuery.Executed')
