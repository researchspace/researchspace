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

import { HTMLAttributes } from 'react';

import { Component } from 'platform/api/components';

import { FieldDefinition } from '../FieldDefinition';
import { FieldValue } from '../FieldValues';
import { InputKind } from '../inputs/InputCommpons';

export interface StaticFieldProps extends HTMLAttributes<HTMLElement> {
  for?: string;
  definition?: FieldDefinition;
  model?: FieldValue;
}

export abstract class StaticComponent<P extends StaticFieldProps, S> extends Component<P, S> {
  public static readonly inputKind = InputKind.StaticInput;

  constructor(props: P, context: any) {
    super(props, context);
  }
}

export default StaticComponent;
