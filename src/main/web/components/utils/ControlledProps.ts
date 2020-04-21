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

export interface ControlledPropsHandler<P> {
  onControlledPropChange?: (change: Partial<P>) => void;
}

/**
 * Returns true if the specified component class supports controlled props mode
 * by having `onControlledPropChange` prop in its `propTypes`; otherwise returns false.
 *
 * In controlled mode component notifies about its state change using provided callback
 * instead of storing the change locally inside itself.
 */
export function hasControlledProps(componentClass: any): boolean {
  return Boolean(
    typeof componentClass === 'function' && componentClass.propTypes && componentClass.propTypes.onControlledPropChange
  );
}
