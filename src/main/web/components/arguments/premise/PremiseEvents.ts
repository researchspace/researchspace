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

import { EventMaker } from 'platform/api/events';

export interface PremiseEventData {
  /**
   * Event which should be triggered to save arguments.
   */
  'Premise.SaveArguments': void;
  /**
   * Event which should be triggered when the component starts saving the arguments.
   */
  'Premise.ArgumentsSaving': void;
  /**
   * Event which should be triggered when the arguments have been saved.
   */
  'Premise.ArgumentsSaved': { assertionIri: string };
  /**
   * Event which should be trigger to add an argument.
   */
  'Premise.AddArgument': void;
}
const event: EventMaker<PremiseEventData> = EventMaker;

export const SaveArguments = event('Premise.SaveArguments');
export const ArgumentsSaving = event('Premise.ArgumentsSaving');
export const ArgumentsSaved = event('Premise.ArgumentsSaved');
export const AddArgument = event('Premise.AddArgument');
