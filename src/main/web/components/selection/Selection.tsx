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

import * as React from 'react';
import { DropdownButton, MenuItem, Button } from 'react-bootstrap';

import { Component } from 'platform/api/components';
import { trigger, listen } from 'platform/api/events';

import * as SelectionEvents from './SelectionEvents';

export interface SelectionConfig {
    id: string;
    actions: SelectionAction[];

    // TODO
    allItems?: string[];
}

export interface SelectionAction {
  id: string;
    label: string;
    acceptQuery?: string;
}

type SelectionProps = SelectionConfig & React.Props<Selection>;

interface SelectionState {
    isActionSelected: boolean;
    selectedAction?: SelectionAction;
    selections: Record<string, boolean>;
}

export class Selection extends Component<SelectionProps, SelectionState> {

    constructor(props: SelectionProps, context: React.Context<Selection>) {
        super(props, context);
        this.state = {
            isActionSelected: false,
            selections: {},
        };
    }

  componentDidMount() {
    this.cancel.map(
      listen({
        target: this.props.id,
        eventType: SelectionEvents.SelectionGetState,
      })
    ).onValue(
      (event) => this.sendCurrentState(event.source)
    );

    this.cancel.map(
      listen({
        target: this.props.id,
        eventType: SelectionEvents.SelectionToggle,
      })
    ).onValue(
      event => {
        const { selections } = this.state;
        if (event.data.isSelected) {
          selections[event.data.value] = event.data.isSelected;
        } else {
          delete selections[event.data.value];
        }
        this.setState({selections});
      }
    );
  }

    render() {
        return (
            <div>
                <DropdownButton
                    id={this.props.id}
                    bsStyle='default'
                    title={this.state.isActionSelected ? this.state.selectedAction.label : 'select action'}
                    onSelect={this.onActionSelected}
                    disabled={this.state.isActionSelected}
                >
                    {
                        this.props.actions.map(
                            action => (
                                <MenuItem key={action.label} eventKey={action.label}>
                                    {action.label}
                                </MenuItem>
                            )
                        )
                    }
                </DropdownButton>
                {this.state.isActionSelected ?
                 <div>
                   <Button bsStyle='link' onClick={this.onCancel}>cancel</Button>
                   <Button bsStyle='link' onClick={this.onExecute}>execute</Button>
                 </div> : null
                }
            </div>
        );
    }

    private onActionSelected = (eventKey: any) => {
      this.setState(
        {
          isActionSelected: true,
          selectedAction: this.props.actions.find(action => action.label === eventKey),
          selections: {},
        },
        this.sendIsActive
      );
    }

  private onCancel = () => {
    this.setState(
      {isActionSelected: false, selectedAction: null, selections: {}}, this.sendIsActive
    );
  }

  private onExecute = () => {
    trigger({
      source: this.props.id,
      eventType: SelectionEvents.SelectionTrigger,
      data: {
        action: this.state.selectedAction.id,
        selections: Object.keys(this.state.selections)
      }
    })
    this.onCancel();
  }

  private sendIsActive = () => {
    trigger({
      source: this.props.id,
      eventType: SelectionEvents.SelectionSetActive,
      data: { isActive: this.state.isActionSelected, selections: this.state.selections },
    })
  }

  private sendCurrentState = (target: string) => {
    trigger({
      source: this.props.id,
      eventType: SelectionEvents.SelectionCurrentState,
      data: { isActive: this.state.isActionSelected, selections: this.state.selections },
      targets: [target]
    });
  }
}

export default Selection;
