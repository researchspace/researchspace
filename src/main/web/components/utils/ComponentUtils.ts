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

import { ReactElement, ReactNode, ComponentClass } from 'react';

/**
 * Check if react component is a valid ReactElement element.
 * in latest html-to-react invalid node can be 'false' or 'null'.
 */
export function isValidChild(child: ReactNode): child is ReactElement<any> {
  return typeof child === 'object' && child !== null && !Array.isArray(child) && Boolean((child as any).type);
}

export function componentHasType<P = any>(child: ReactNode, type: ComponentClass<P, any>): child is ReactElement<P> {
  return (
    isValidChild(child) &&
    type &&
    typeof child.type === 'function' &&
    typeof type === 'function' &&
    hasBaseDerivedRelationship(type, child.type)
  );
}

/**
 * Returns a human-readable name for a React child component.
 */
export function componentDisplayName(child: ReactNode) {
  if (typeof child === 'string' || typeof child === 'number') {
    return child.toString();
  } else if (isValidChild(child)) {
    if (typeof child.type === 'string') {
      return child.type;
    } else {
      type HasDisplayName = { displayName?: string; name?: string };
      return (child.type as HasDisplayName).displayName || (child.type as HasDisplayName).name;
    }
  } else {
    return undefined;
  }
}

/**
 * @returns true if class with baseConstructor is a base class of class
 *  with derivedConstructor or if classes are the same; overwise false.
 *
 * @example
 *  hasBaseDerivedRelationship(Mammal, Cat)    === true
 *  hasBaseDerivedRelationship(Dog, Dog)       === true
 *  hasBaseDerivedRelationship(Animal, Tomato) === false
 *  hasBaseDerivedRelationship(Dog, Animal)    === false
 */
export function hasBaseDerivedRelationship(baseConstructor: any, derivedConstructor: any) {
  return (
    derivedConstructor === baseConstructor ||
    (derivedConstructor.prototype && derivedConstructor.prototype instanceof baseConstructor)
  );
}

/**
 * Takes any {@ReactNode} children and retuns either an array or just a
 * single {@ReactElement} if the is only one child in the children array.
 * This is required to make the forms working with, for example, react-bootstrap
 * vertical tabs. See https://github.com/facebook/react/issues/4424 for details.
 */
export function universalChildren(children: ReactNode): ReactNode {
  return Array.isArray(children) && children.length === 1 ? children[0] : children;
}
