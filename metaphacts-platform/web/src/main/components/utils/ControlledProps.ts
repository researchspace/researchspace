/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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
    typeof componentClass === 'function' &&
    componentClass.propTypes &&
    componentClass.propTypes.onControlledPropChange
  );
}
