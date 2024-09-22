/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

import React = require("react");
import { Tab } from 'react-bootstrap';
interface Props {
  title: string;
  eventKey: number;
  className?: string;
}

export class RsTab extends React.Component<Props, {}> {
  render() {
    const { title, eventKey, className, children } = this.props;
    const tab = (
      <Tab title={title} eventKey={eventKey} className={className}>
        {children}
      </Tab>
    );
    return tab;
  }
}

export default RsTab