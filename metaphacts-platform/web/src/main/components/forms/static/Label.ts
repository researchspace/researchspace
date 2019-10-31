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

import * as D from 'react-dom-factories';
import { StaticComponent, StaticFieldProps } from './StaticComponent';
import * as classnames from 'classnames';

import { getPreferredLabel } from '../FieldDefinition';

const CLASSNAME = 'field-label';

export class Label extends StaticComponent<StaticFieldProps, {}> {
  render() {
    if (!this.props.definition) { return undefined; }

    const label  = getPreferredLabel(this.props.definition.label);
    if (!label) { return null; }

    return D.span(
      { className: classnames(CLASSNAME, this.props.className), style: this.props.style },
      label
    );
  }
}

export default Label;
