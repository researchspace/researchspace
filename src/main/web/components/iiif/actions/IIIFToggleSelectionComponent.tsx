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
import { Component } from 'react';
import { trigger } from 'platform/api/events';
import { ToggleRegionEvent, ToggleRegionsEvent } from '../ImageRegionEditorEvents';
import { MenuProps } from 'platform/components/ui/selection/SelectionActionProps';
import { AllTitleProps } from '../../sets/TypedSelectionActionProps';
import TypedSelectionActionComponent from '../../sets/TypedSelectionActionComponent';

type Props = MenuProps & AllTitleProps & { viewerId: string };

class ImmediateToggle extends Component<{ onToggle: () => void, onHide?: () => void }, {}> {
    componentDidMount() {
        this.props.onToggle();
        if (this.props.onHide) {
            this.props.onHide();
        }
    }
    render() {
        return null;
    }
}

export default class IIIFToggleSelectionComponent extends Component<Props, void> {
  static defaultProps = {
    menuTitle: 'Toggle Annotations',
    title: 'Toggle Annotations',
  };

  render() {
    const { selection, closeMenu, menuTitle, title, icon } = this.props;
    return (
      <TypedSelectionActionComponent
        menuTitle={menuTitle}
        title={title}
        icon={icon}
        isDisabled={(s) => s.length === 0}
        renderRawDialog={(s) => (
          <ImmediateToggle 
             onToggle={() => this.onToggle(s)} 
          />
        )}
        selection={selection}
        closeMenu={closeMenu}
      />
    );
  }

  onToggle = (selection: string[]) => {
      trigger({
          eventType: ToggleRegionsEvent,
          source: 'IIIFToggleSelectionComponent',
          data: { regionIris: selection },
          targets: [this.props.viewerId]
      });
  }
}
