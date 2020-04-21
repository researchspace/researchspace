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

import { Set } from 'immutable';
import { assign } from 'lodash';
import { Component } from 'react';
import * as D from 'react-dom-factories';
import * as PropTypes from 'prop-types';

/**
 * Component that selects row in the table. Can be placed anywhere as a row child.
 */
class SemanticTableSelectionComponent extends Component<{ rowData: any }, {}> {
  static contextTypes = {
    semanticTableEvents: PropTypes.any.isRequired,
    semanticTableRowData: PropTypes.any.isRequired,
    semanticTableSelected: PropTypes.any.isRequired,
  };

  context: {
    semanticTableEvents: any;
    semanticTableRowData: any;
    semanticTableSelected: Set<any>;
  };

  render() {
    const selected = this.context.semanticTableSelected.has(this.context.semanticTableRowData);

    return D.input(
      assign(
        {
          type: 'checkbox',
          checked: selected,
          onChange: this.toggleSelection,
        },
        this.props
      )
    );
  }

  private toggleSelection = () => {
    this.context.semanticTableEvents.toggleRowSelection(this.context.semanticTableRowData);
  };
}

export default SemanticTableSelectionComponent;
