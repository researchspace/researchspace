/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { ReactElement, ReactNode } from 'react';

/**
 * Check if react component is a valid ReactElement element.
 * in latest html-to-react invalid node can be 'false' or 'null'.
 */
export function isValidChild(child: any): child is ReactElement<any> {
  return typeof child === 'object' && child !== null;
}

/**
 * Returns a human-readable name for a React child component.
 */
export function componentDisplayName(child: ReactElement<any> | string | number) {
  if (typeof child === 'string' || typeof child === 'number') {
    return child.toString();
  } else if (typeof child.type === 'string') {
    return child.type;
  } else {
    return child.type.displayName || child.type['name'];
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
  return derivedConstructor === baseConstructor || (
    derivedConstructor.prototype &&
    derivedConstructor.prototype instanceof baseConstructor
  );
}

/**
 * Takes any {@ReactNode} children and retuns either an array or just a
 * single {@ReactElement} if the is only one child in the children array.
 * This is required to make the forms working with, for example, react-bootstrap
 * vertical tabs. See https://metaphacts.atlassian.net/browse/VD-103 and
 * https://github.com/facebook/react/issues/4424 for details.
 */
export function universalChildren(children: ReactNode): ReactNode {
 return (Array.isArray(children) && children.length === 1)
   ? children[0]
   : children;
}
