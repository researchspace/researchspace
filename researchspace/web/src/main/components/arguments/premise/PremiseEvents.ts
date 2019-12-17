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
