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

import * as D from 'react-dom-factories';
import { StaticComponent, StaticFieldProps } from './StaticComponent';
import * as classnames from 'classnames';

const CLASSNAME = 'field-description';

export class Description extends StaticComponent<StaticFieldProps, {}> {
  constructor(props: StaticFieldProps, context: any) {
    super(props, context);
  }

  render() {
    if (!this.props.definition) {
      return undefined;
    }

    const description = this.props.definition.description;
    if (!description) {
      return undefined;
    }

    return D.span({ className: classnames(CLASSNAME, this.props.className), style: this.props.style }, description);
  }
}

export default Description;
