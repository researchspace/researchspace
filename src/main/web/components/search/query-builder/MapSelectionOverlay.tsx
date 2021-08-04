/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Alexey Morozov
 */

import * as React from 'react';
import { Component } from 'react';
import * as assign from 'object-assign';

import { AutoCompletionInput } from 'platform/components/ui/inputs';

import { SelectedArea, OLMapSelection, ZoomToOptions } from './OLMapSelection';
import { ResourceSelectorConfig } from 'platform/components/semantic/search/config/SearchConfig';
import * as styles from './MapSelectionOverlay.scss';

export interface MapSelectionProps {
  suggestionConfig: ResourceSelectorConfig;
  onCancel: () => void;
  onSelect: (area: SelectedArea) => void;
}

interface MapSelectionState {
  selection?: SelectedArea;
  zoomToOptions?: ZoomToOptions;
}

/**
 * Displays map selection overlay with geo places search, select and cancel buttons
 */
export class MapSelectionOverlay extends Component<MapSelectionProps, MapSelectionState> {
  constructor(props: MapSelectionProps, context: any) {
    super(props, context);
    this.state = {
      selection: undefined,
      zoomToOptions: undefined,
    };
  }

  showPlaceSelector() {
    return React.createElement(AutoCompletionInput, {
      query: this.props.suggestionConfig.query,
      templates: {},
      actions: {
        onSelected: (binding) => {
          this.setState(
            assign({}, this.state, {
              zoomToOptions: {
                lat: Number(binding['lat'].value),
                long: Number(binding['long'].value),
                zoomLevel: 10,
              },
            })
          );
        },
      },
      placeholder: 'Search for place',
    });
  }

  render() {
    return (
      <div className={styles.mapSelection}>
        <div className={styles.search}>{this.showPlaceSelector()}</div>
        <OLMapSelection onSelect={this.onAreaSelected} zoomTo={this.state.zoomToOptions} />
        <div className={styles.actions}>
          <div className="form-group">
            <div className="btn-group" role="group">
              <button type="button" className="btn btn-default" onClick={this.props.onCancel}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!this.state.selection}
                onClick={this.confirmSelection}
              >
                Select
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private confirmSelection = () => {
    this.props.onSelect(this.state.selection);
  };

  private onAreaSelected = (selectedArea: SelectedArea) => {
    this.setState(assign({}, this.state, { selection: selectedArea }));
  };
}
export default MapSelectionOverlay;
