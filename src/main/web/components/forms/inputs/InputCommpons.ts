/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
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

import { ReactNode, ComponentClass } from 'react';

import { isValidChild } from 'platform/components/utils';

/**
 * Semantic Form input kind. In the past we used constructor check to find the
 * kind of the component but that lead to ugly circular dependencies, so no we just assign input kind to component class as a static value.
 */
export enum InputKind {
  StaticInput,
  FormSwitch,
  SingleValueInput,
  MultiValuesInput,
  CompositeInput,
  SemanticForm,
}

export type InputReactElement = React.ReactElement<any> & { type: { inputKind: InputKind } };

export function elementHasInputType(child: ReactNode, kind: InputKind): boolean {
  return (
    isValidChild(child) &&
      typeof child.type === 'function' &&
      (child.type as any)?.inputKind === kind
  );
}


export function elementIsSingleValueInput(child: ReactNode) {
  return elementHasInputType(child, InputKind.SingleValueInput) ||
    elementHasInputType(child, InputKind.CompositeInput) ||
    elementHasInputType(child, InputKind.FormSwitch);
}

export function componentHasInputType(component: ComponentClass<any>, kind: InputKind): boolean {
  return (component as any)?.inputKind === kind;
}
