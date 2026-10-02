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

import * as React from 'react';
import { Tab } from 'react-bootstrap';

export interface RsTabProps {
  title: React.ReactNode;
  eventKey: string | number;
  className?: string;

  /**
   * Optional Material icon name, e.g. "info", "search", "settings".
   * This is consumed by RsTabs before react-bootstrap Tabs builds the nav item.
   */
  icon?: string;

  /**
   * Material icon style suffix used by the ResearchSpace Icon component.
   * Examples depend on the loaded Material icon CSS, e.g. "outlined", "round", "sharp".
   */
  iconType?: string;

  /**
   * Use Material Symbols instead of Material Icons.
   */
  symbol?: boolean;

  /**
   * Optional class applied to the rendered Icon component.
   */
  iconClassName?: string;

  /**
   * Optional class applied to the wrapper around icon and title.
   */
  titleClassName?: string;
}

export class RsTab extends React.Component<RsTabProps, {}> {
  render() {
    const { title, eventKey, className, children } = this.props;

    return (
      <Tab
        title={title as any}
        eventKey={eventKey}
        className={className}
      >
        {children}
      </Tab>
    );
  }
}

export default RsTab;
